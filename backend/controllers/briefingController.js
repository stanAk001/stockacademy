// ============================================================
// briefingController.js — "My Market" personalized briefing (spec §13/§25).
//
//   GET /api/ai/my-market   (premium)
//
// The retention centrepiece: answers "what changed since you last checked?" by
// stitching together the user's setups, positions, theses and their event logs
// since last_briefing_at, plus a live read of market conditions and the strongest
// opportunities. Fully deterministic — no AI call, so it's instant and free and
// safe to load on every visit. After building it we stamp last_briefing_at = NOW
// so the next visit shows only what's newly changed.
// ============================================================
import db from '../config/db.js';
import { marketRegime } from '../services/indicators.js';
import { logEvent } from '../services/analytics.js';

const num = (v) => (v === null || v === undefined ? null : parseFloat(v));

async function regimeFor(country) {
  const { rows } = await db.query(
    `SELECT t.trend, t.rsi14, t.setup
       FROM stock_technicals t JOIN stocks s ON s.symbol = t.symbol
      WHERE s.country = $1`,
    [country]
  );
  if (!rows.length) return { label: 'unknown', note: 'Not enough data yet for this market.' };
  return marketRegime(rows.map((r) => ({ trend: r.trend, rsi14: num(r.rsi14), setup: r.setup })));
}

export const myMarket = async (req, res) => {
  try {
    const uid = req.user.id;

    // Read the "since" watermark (default to a 7-day window on first ever load).
    const uRow = await db.query('SELECT last_briefing_at, preferred_market FROM users WHERE id = $1', [uid]);
    const since = uRow.rows[0]?.last_briefing_at || null;
    const preferred = uRow.rows[0]?.preferred_market || null;

    // Free preview (§23/§35): real market status + how many opportunities match,
    // showing 3 of them. Free users can't track setups/positions/theses, so there's
    // no personal feed to show. We don't stamp last_briefing_at here, so their
    // first Premium visit still shows what changed.
    if (!req.isPremium) {
      const params = [];
      let mf = '';
      if (preferred === 'US' || preferred === 'NG') { params.push(preferred); mf = `AND s.country = $${params.length}`; }
      const [us, ng, opps] = await Promise.all([
        regimeFor('US'), regimeFor('NG'),
        db.query(
          `SELECT s.display_symbol, s.name, s.country, s.currency, s.last_price, t.setup, t.trend
             FROM stock_technicals t JOIN stocks s ON s.symbol = t.symbol
            WHERE t.quality_score >= 65 AND t.setup <> 'none' AND s.last_price IS NOT NULL ${mf}
            ORDER BY t.quality_score DESC NULLS LAST LIMIT 20`, params),
      ]);
      logEvent(uid, 'premium_preview_viewed', { surface: 'my_market' });
      return res.json({
        success: true, preview: true,
        market: { US: { label: us.label, note: us.note }, NG: { label: ng.label, note: ng.note } },
        matching_count: opps.rows.length,
        opportunities: opps.rows.slice(0, 3).map((r) => ({
          symbol: r.display_symbol, name: r.name, market: r.country === 'NG' ? 'NGX' : 'US',
          currency_symbol: r.currency === 'NGN' ? '₦' : '$', last_price: num(r.last_price),
          setup: r.setup, trend: r.trend,
        })),
        generated_at: new Date().toISOString(),
      });
    }
    const sinceSql = since ? '$2' : "NOW() - INTERVAL '7 days'";
    const p = since ? [uid, since] : [uid];

    const [
      setupCounts, setupEvents, posCounts, posEvents, thesisCount, thesisEvents,
      unread, usRegime, ngRegime, opps, newsEvents,
    ] = await Promise.all([
      // Live tracked-setup status breakdown (non-terminal).
      db.query(
        `SELECT status, COUNT(*)::int n FROM ai_setups
          WHERE user_id = $1 AND status NOT IN ('target','invalidated','expired')
          GROUP BY status`, [uid]),
      // New setup lifecycle events since last visit.
      db.query(
        `SELECT e.to_status, e.note, e.created_at, st.display_symbol AS symbol
           FROM ai_setup_events e
           JOIN ai_setups s ON s.id = e.setup_id
           JOIN stocks st ON st.symbol = s.symbol
          WHERE s.user_id = $1 AND e.created_at > ${sinceSql}
          ORDER BY e.created_at DESC LIMIT 12`, p),
      // Open positions + how many need attention (weakening/invalidated).
      db.query(
        `SELECT COUNT(*)::int total,
                COUNT(*) FILTER (WHERE thesis_state IN ('weakening','invalidated'))::int attention
           FROM positions WHERE user_id = $1 AND status = 'open'`, [uid]),
      db.query(
        `SELECT e.kind, e.to_state, e.note, e.created_at, st.display_symbol AS symbol
           FROM position_events e
           JOIN positions pz ON pz.id = e.position_id
           JOIN stocks st ON st.symbol = pz.symbol
          WHERE pz.user_id = $1 AND e.created_at > ${sinceSql}
          ORDER BY e.created_at DESC LIMIT 12`, p),
      db.query(`SELECT COUNT(*)::int n FROM investment_theses WHERE user_id = $1`, [uid]),
      db.query(
        `SELECT e.to_state, e.note, e.created_at, st.display_symbol AS symbol
           FROM thesis_events e
           JOIN investment_theses t ON t.id = e.thesis_id
           JOIN stocks st ON st.symbol = t.symbol
          WHERE t.user_id = $1 AND e.created_at > ${sinceSql}
            AND e.from_state IS DISTINCT FROM e.to_state -- real state changes; news notes are counted separately
          ORDER BY e.created_at DESC LIMIT 12`, p),
      db.query(`SELECT COUNT(*)::int n FROM notifications WHERE user_id = $1 AND is_read = FALSE`, [uid]),
      regimeFor('US'),
      regimeFor('NG'),
      // The strongest current opportunities, scoped to the user's preferred market.
      (() => {
        const params = [];
        let mf = '';
        if (preferred === 'US' || preferred === 'NG') { params.push(preferred); mf = `AND s.country = $${params.length}`; }
        return db.query(
          `SELECT s.display_symbol, s.name, s.country, s.currency, s.last_price, s.day_change_pct,
                  t.setup, t.quality_score, t.trend
             FROM stock_technicals t JOIN stocks s ON s.symbol = t.symbol
            WHERE t.quality_score >= 65 AND t.setup <> 'none' AND s.last_price IS NOT NULL ${mf}
            ORDER BY t.quality_score DESC NULLS LAST LIMIT 5`, params);
      })(),
      // Material news on the user's stocks (news_events arrives with migration_38).
      db.query(
        `SELECT st.display_symbol AS symbol, ne.headline, ne.kind, ne.created_at
           FROM news_events ne
           JOIN stocks st ON st.symbol = ne.symbol
          WHERE ne.material AND ne.created_at > ${sinceSql} AND ne.symbol IN (
            SELECT symbol FROM positions WHERE user_id = $1 AND status = 'open'
            UNION SELECT symbol FROM investment_theses WHERE user_id = $1
            UNION SELECT symbol FROM ai_setups WHERE user_id = $1 AND status NOT IN ('target','invalidated','expired')
            UNION SELECT s2.symbol FROM watchlist w
                    JOIN stocks s2 ON UPPER(s2.symbol) = UPPER(w.symbol) OR UPPER(s2.display_symbol) = UPPER(w.symbol)
                   WHERE w.user_id = $1)
          ORDER BY ne.created_at DESC LIMIT 10`, p
      ).catch(() => ({ rows: [] })),
    ]);

    const byStatus = Object.fromEntries(setupCounts.rows.map((r) => [r.status, r.n]));

    // Unified "what changed" feed across the three monitors, newest first.
    const feed = [
      ...setupEvents.rows.map((e) => ({ type: 'setup', symbol: e.symbol, status: e.to_status, note: e.note, at: e.created_at, link: '/setups' })),
      ...posEvents.rows.map((e) => ({ type: 'position', symbol: e.symbol, status: e.to_state || e.kind, note: e.note, at: e.created_at, link: '/positions' })),
      ...thesisEvents.rows.map((e) => ({ type: 'thesis', symbol: e.symbol, status: e.to_state, note: e.note, at: e.created_at, link: '/theses' })),
      ...newsEvents.rows.map((n) => ({ type: 'news', symbol: n.symbol, status: n.kind, note: n.headline, at: n.created_at, link: `/stocks/${n.symbol}` })),
    ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 15);

    const payload = {
      success: true,
      since,
      first_visit: !since,
      market: {
        US: { label: usRegime.label, note: usRegime.note },
        NG: { label: ngRegime.label, note: ngRegime.note },
      },
      changes: {
        setups_approaching: (byStatus.approaching || 0),
        setups_confirmed: (byStatus.confirmed || 0) + (byStatus.triggered || 0),
        setups_active: (byStatus.active || 0),
        position_updates: posEvents.rows.length,
        positions_need_attention: posCounts.rows[0]?.attention || 0,
        thesis_changes: thesisEvents.rows.length,
        news_events: newsEvents.rows.length,
        unread_notifications: unread.rows[0]?.n || 0,
      },
      counts: {
        tracked_setups: setupCounts.rows.reduce((s, r) => s + r.n, 0),
        open_positions: posCounts.rows[0]?.total || 0,
        theses: thesisCount.rows[0]?.n || 0,
      },
      feed,
      opportunities: opps.rows.map((r) => ({
        symbol: r.display_symbol, name: r.name,
        market: r.country === 'NG' ? 'NGX' : 'US',
        currency_symbol: r.currency === 'NGN' ? '₦' : '$',
        last_price: num(r.last_price), day_change_pct: num(r.day_change_pct),
        setup: r.setup, quality_score: r.quality_score, trend: r.trend,
      })),
      generated_at: new Date().toISOString(),
    };

    // Stamp the watermark so the NEXT visit only shows what's newly changed.
    await db.query('UPDATE users SET last_briefing_at = NOW() WHERE id = $1', [uid]);
    logEvent(uid, 'briefing_opened', { changes: feed.length });

    res.json(payload);
  } catch (err) {
    console.error('myMarket error:', err);
    res.status(500).json({ success: false, message: 'Could not build your briefing right now.' });
  }
};

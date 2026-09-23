// ============================================================
// newsMonitor.js — background company-news monitoring (spec §29, §17, §10).
//
// For stocks that Premium users hold, track, watch or have a thesis on:
//   1. fetch recent headlines (US → Finnhub, NGX → Google News RSS),
//   2. store each new one in news_events (dedup on symbol + url hash),
//   3. classify it with keyword rules (newsClassifier.js — no AI cost),
//   4. alert interested users about NEW MATERIAL headlines only.
//
// Guards against noise: the first time a stock is seen, its existing headlines
// are stored silently (no alert flood); only headlines from the last 24h alert;
// each user gets at most `perUserCap` news alerts per run. Material news on a
// stock with an investment thesis is also added to that thesis's history, so it
// shows up under "Why did this change?" without changing the thesis state.
// ============================================================
import crypto from 'crypto';
import db from '../config/db.js';
import { dispatch } from './notificationEngine.js';
import { classifyHeadline } from './newsClassifier.js';
import { fetchFinnhubNews, fetchGoogleNews } from '../controllers/aiController.js';
import { premiumSql } from '../config/entitlements.js';

const PREMIUM = premiumSql('u'); // includes the grace days

const hash = (s) => crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 16);

let running = false; // one run at a time, whether started by node-cron or the external scheduler

export async function monitorNews({ maxSymbols = 30, lookbackHours = 48, freshHours = 24, perUserCap = 3 } = {}) {
  if (running) return { skipped: true };
  running = true;
  const out = { symbols: 0, new_items: 0, seeded: 0, material: 0, notified: 0 };
  try {
    // The stocks Premium users care about, most-followed first.
    const { rows: syms } = await db.query(
      `WITH interest AS (
         SELECT user_id, symbol FROM positions WHERE status = 'open'
         UNION SELECT user_id, symbol FROM investment_theses
         UNION SELECT user_id, symbol FROM ai_setups WHERE status NOT IN ('target','invalidated','expired')
         UNION SELECT w.user_id, s.symbol FROM watchlist w
                 JOIN stocks s ON UPPER(s.symbol) = UPPER(w.symbol) OR UPPER(s.display_symbol) = UPPER(w.symbol)
       )
       SELECT s.symbol, s.display_symbol, s.name, s.country, COUNT(DISTINCT i.user_id)::int AS users
         FROM interest i
         JOIN users u ON u.id = i.user_id AND ${PREMIUM}
         JOIN stocks s ON s.symbol = i.symbol
        GROUP BY s.symbol, s.display_symbol, s.name, s.country
        ORDER BY users DESC
        LIMIT $1`,
      [maxSymbols]
    );

    const fromTs = Date.now() - lookbackHours * 3600 * 1000;
    const sentPerUser = {};

    for (const s of syms) {
      out.symbols++;
      const label = s.display_symbol || s.symbol;
      let items = [];
      try {
        items = s.country === 'US' && process.env.FINNHUB_API_KEY
          ? await fetchFinnhubNews(label, fromTs)
          : await fetchGoogleNews(s.name || label, s.country === 'NG' ? 'NG' : 'US', fromTs);
      } catch (e) {
        console.warn(`[news] fetch failed for ${label}:`, e.message);
        continue;
      }

      const prior = await db.query('SELECT COUNT(*)::int AS n FROM news_events WHERE symbol = $1', [s.symbol]);
      const seeding = (prior.rows[0]?.n || 0) === 0;
      let interested = null; // loaded lazily, once per symbol

      for (const it of (items || []).slice(0, 20)) {
        if (!it?.headline) continue;
        const c = classifyHeadline(it.headline);
        const published = it.date ? new Date(it.date) : null;
        const ins = await db.query(
          `INSERT INTO news_events (symbol, url_hash, headline, url, source, published_at, kind, material)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (symbol, url_hash) DO NOTHING
           RETURNING id`,
          [s.symbol, hash(it.url || it.headline), String(it.headline).slice(0, 500), it.url || null,
           it.source ? String(it.source).slice(0, 120) : null,
           published && !Number.isNaN(published.getTime()) ? published : null, c.kind, c.material]
        );
        if (!ins.rows.length) continue; // seen before
        out.new_items++;
        if (seeding) { out.seeded++; continue; }
        if (!c.material) continue;
        if (published && Date.now() - published.getTime() > freshHours * 3600 * 1000) continue;
        out.material++;

        if (!interested) {
          const r = await db.query(
            `SELECT u.id AS user_id, th.id AS thesis_id, th.state AS thesis_state
               FROM users u
               LEFT JOIN investment_theses th ON th.user_id = u.id AND th.symbol = $1
              WHERE ${PREMIUM} AND (
                    th.id IS NOT NULL
                 OR EXISTS (SELECT 1 FROM positions p WHERE p.user_id = u.id AND p.symbol = $1 AND p.status = 'open')
                 OR EXISTS (SELECT 1 FROM ai_setups a WHERE a.user_id = u.id AND a.symbol = $1
                              AND a.status NOT IN ('target','invalidated','expired'))
                 OR EXISTS (SELECT 1 FROM watchlist w
                              JOIN stocks s2 ON UPPER(s2.symbol) = UPPER(w.symbol) OR UPPER(s2.display_symbol) = UPPER(w.symbol)
                             WHERE w.user_id = u.id AND s2.symbol = $1))`,
            [s.symbol]
          );
          interested = r.rows;
        }

        for (const u of interested) {
          // Thesis history gets the headline even if the alert cap is reached.
          if (u.thesis_id) {
            await db.query(
              `INSERT INTO thesis_events (thesis_id, from_state, to_state, note, changed_fields)
               VALUES ($1, $2, $2, $3, NULL)`,
              [u.thesis_id, u.thesis_state || 'intact', `News (${c.label.toLowerCase()}): ${String(it.headline).slice(0, 300)}`]
            );
          }
          if ((sentPerUser[u.user_id] || 0) >= perUserCap) continue;
          sentPerUser[u.user_id] = (sentPerUser[u.user_id] || 0) + 1;
          await dispatch({
            userId: u.user_id,
            category: 'news',
            type: 'company_news',
            title: `${label} · ${c.label}`,
            message: `${it.headline}${it.source ? ` (${it.source})` : ''}`,
            deepLink: `/stocks/${label}`,
            severity: 'info',
          });
          out.notified++;
        }
      }
    }
  } catch (err) {
    console.error('monitorNews error:', err.message);
    out.error = err.message;
  } finally {
    running = false;
  }
  return out;
}

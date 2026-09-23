// ============================================================
// analyticsController.js — product analytics (spec §41).
//
//   POST /api/analytics/event          — the browser reports a UI event
//   GET  /api/admin/analytics/funnel   — admin: what converts, where users stall
//
// Server-side events (scout_used, setup_created, briefing_opened, limit_reached,
// subscription_started, …) are written directly by the controllers. This file
// adds the few events only the browser can see (an upgrade click, opening a
// card) and one admin read that turns analytics_events into answers:
//   - which free features did users touch BEFORE they paid?
//   - where do free users hit the wall?
//   - which upgrade prompts actually get clicked?
// ============================================================
import db from '../config/db.js';
import { logEvent } from '../services/analytics.js';

// Only these may come from the browser. Anything else is dropped, so the
// endpoint can't be used to write arbitrary rows or fake a conversion.
const CLIENT_EVENTS = new Set([
  'upgrade_clicked',
  'opportunity_opened',
  'notification_opened',
  'pricing_viewed',
]);

// Keep props small and flat: string keys, primitive values, ~1KB max.
function cleanProps(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return null;
  const out = {};
  for (const [k, v] of Object.entries(p).slice(0, 10)) {
    if (typeof k !== 'string' || k.length > 40) continue;
    if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) {
      out[k] = typeof v === 'string' ? v.slice(0, 120) : v;
    }
  }
  return Object.keys(out).length ? out : null;
}

export const trackEvent = (req, res) => {
  const event = String(req.body?.event || '');
  if (!CLIENT_EVENTS.has(event)) return res.status(400).json({ success: false, message: 'Unknown event' });
  logEvent(req.user?.id, event, cleanProps(req.body?.props));
  res.json({ success: true });
};

// GET /api/admin/analytics/funnel?days=30
export const getFunnel = async (req, res) => {
  if (!req.user?.is_admin) return res.status(403).json({ success: false, message: 'Admins only' });
  const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 30));
  const since = `NOW() - ($1 || ' days')::interval`;
  try {
    const [events, upgradeBySurface, limits, featureUse, beforeConversion, conversions] = await Promise.all([
      // Volume per event: total and distinct users.
      db.query(
        `SELECT event, COUNT(*)::int n, COUNT(DISTINCT user_id)::int users
           FROM analytics_events WHERE created_at > ${since}
          GROUP BY event ORDER BY n DESC`, [String(days)]),
      // Which upgrade prompts get clicked.
      db.query(
        `SELECT COALESCE(props->>'surface', 'unknown') surface, COUNT(*)::int n, COUNT(DISTINCT user_id)::int users
           FROM analytics_events WHERE event = 'upgrade_clicked' AND created_at > ${since}
          GROUP BY 1 ORDER BY n DESC`, [String(days)]),
      // Where free users run out of allowance.
      db.query(
        `SELECT COALESCE(props->>'feature', 'unknown') feature, COUNT(*)::int n, COUNT(DISTINCT user_id)::int users
           FROM analytics_events WHERE event = 'limit_reached' AND created_at > ${since}
          GROUP BY 1 ORDER BY n DESC`, [String(days)]),
      // Metered AI feature use, split free vs premium.
      db.query(
        `SELECT COALESCE(props->>'feature', 'unknown') feature,
                COUNT(*) FILTER (WHERE (props->>'premium')::boolean IS NOT TRUE)::int free_uses,
                COUNT(*) FILTER (WHERE (props->>'premium')::boolean IS TRUE)::int premium_uses
           FROM analytics_events WHERE event = 'ai_feature_used' AND created_at > ${since}
          GROUP BY 1 ORDER BY free_uses DESC`, [String(days)]),
      // For users who subscribed in the window: which events they had BEFORE
      // their first subscription_started. This is the "what converts" read.
      db.query(
        `WITH conv AS (
           SELECT user_id, MIN(created_at) AS at FROM analytics_events
            WHERE event = 'subscription_started' AND created_at > ${since} AND user_id IS NOT NULL
            GROUP BY user_id
         )
         SELECT e.event, COALESCE(e.props->>'feature', e.props->>'surface') AS detail,
                COUNT(DISTINCT e.user_id)::int users
           FROM analytics_events e JOIN conv c ON c.user_id = e.user_id AND e.created_at < c.at
          WHERE e.event <> 'subscription_started'
          GROUP BY 1, 2 ORDER BY users DESC LIMIT 25`, [String(days)]),
      db.query(
        `SELECT COUNT(DISTINCT user_id)::int n FROM analytics_events
          WHERE event = 'subscription_started' AND created_at > ${since}`, [String(days)]),
    ]);

    res.json({
      success: true,
      days,
      conversions: conversions.rows[0]?.n || 0,
      events: events.rows,
      upgrade_clicks: upgradeBySurface.rows,
      limits_reached: limits.rows,
      feature_use: featureUse.rows,
      before_conversion: beforeConversion.rows,
    });
  } catch (err) {
    // analytics_events arrives with migration_34 — report empty rather than 500.
    console.error('getFunnel error:', err.message);
    res.json({ success: true, days, conversions: 0, events: [], upgrade_clicks: [], limits_reached: [], feature_use: [], before_conversion: [], unavailable: true });
  }
};

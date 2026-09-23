// ============================================================
// cronController.js — endpoints for an EXTERNAL scheduler (spec §29).
//
// node-cron only runs while the server is awake. On a sleeping host (Render free
// tier) the in-process schedules never fire, so point a free external scheduler
// (cron-job.org, Render Cron Job, GitHub Actions) at these. Each call wakes the
// server and runs the job. Protected by CRON_SECRET, sent as the x-cron-secret
// header or ?token=.
//
//   POST /api/cron/monitor   every 15–30 min: setups, positions, watchlists
//   POST /api/cron/news      every 2–3 hours: company news (runs in background)
//   POST /api/cron/briefing  once a morning: thesis check, then daily briefing
// ============================================================
import { monitorSetups } from '../services/setupMonitor.js';
import { monitorPositions } from '../services/positionMonitor.js';
import { monitorWatchlists } from '../services/watchlistMonitor.js';
import { monitorTheses } from '../services/thesisMonitor.js';
import { monitorNews } from '../services/newsMonitor.js';
import { sendDailyBriefings } from '../services/briefingDigest.js';
import { runMembershipLifecycle } from '../services/membership.js';
import { remindMissingPush } from '../services/pushReminder.js';

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  const provided = req.get?.('x-cron-secret') || req.query?.token;
  return Boolean(secret) && provided === secret;
}
const deny = (res) => res.status(401).json({ success: false, message: 'Unauthorized' });

export const cronMonitor = async (req, res) => {
  if (!authorized(req)) return deny(res);
  try {
    const setups = await monitorSetups();
    const positions = await monitorPositions();
    const watchlists = await monitorWatchlists();
    const membership = await runMembershipLifecycle(); // reminders, grace notices, downgrades
    const push = await remindMissingPush();            // "your alerts can't reach your phone"
    res.json({ success: true, setups, positions, watchlists, membership, push });
  } catch (err) {
    console.error('cronMonitor error:', err);
    res.status(500).json({ success: false, message: 'Monitor run failed' });
  }
};

// News fetches one stock at a time, so it can take a while: respond straight
// away and let it finish in the background (monitorNews prevents overlaps).
export const cronNews = (req, res) => {
  if (!authorized(req)) return deny(res);
  monitorNews()
    .then((r) => console.log('[cron] news:', JSON.stringify(r)))
    .catch((e) => console.warn('[cron] news failed:', e.message));
  res.status(202).json({ success: true, started: true });
};

export const cronBriefing = async (req, res) => {
  if (!authorized(req)) return deny(res);
  try {
    const theses = await monitorTheses();   // so fresh thesis changes are counted
    const briefing = await sendDailyBriefings();
    res.json({ success: true, theses, briefing });
  } catch (err) {
    console.error('cronBriefing error:', err);
    res.status(500).json({ success: false, message: 'Briefing run failed' });
  }
};

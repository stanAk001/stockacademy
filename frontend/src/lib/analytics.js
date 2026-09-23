import api from '../services/api';

// Fire-and-forget UI event (spec §41). The server only accepts a short allowlist
// (upgrade_clicked, opportunity_opened, notification_opened, pricing_viewed).
// Never throws and never blocks navigation.
export function track(event, props) {
  try {
    api.post('/analytics/event', { event, props }).catch(() => {});
  } catch {
    /* ignore */
  }
}

export default track;

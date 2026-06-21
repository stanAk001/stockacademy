import db from '../config/db.js';
import { notify } from '../controllers/notificationsController.js';
import { sendToUser } from './telegramService.js';
import { sendEmail, priceAlertEmail } from './emailService.js';

// Checks every active (untriggered) price alert against the latest known price
// and fires the ones whose condition is now met:
//   • marks the alert triggered (so it never double-fires)
//   • drops an in-app notification (the bell)
//   • DMs the user on Telegram if they've linked it (phone delivery, off-site)
//
// Prices come from stocks.last_price, which refreshes via the daily updater and
// on-demand views — so alerts fire shortly after price data updates, not tick
// by tick. Cheap to run; safe to call on a short interval.
export async function checkPriceAlerts() {
  let fired = 0;
  try {
    const { rows } = await db.query(
      `SELECT a.id, a.user_id, a.symbol, a.company_name, a.target_price, a.direction, a.note,
              s.last_price, s.currency, s.display_symbol,
              u.email, u.telegram_chat_id
       FROM price_alerts a
       JOIN stocks s
         ON UPPER(s.symbol) = UPPER(a.symbol) OR UPPER(s.display_symbol) = UPPER(a.symbol)
       JOIN users u ON u.id = a.user_id
       WHERE a.triggered = FALSE
         AND s.last_price IS NOT NULL
         AND (
           (a.direction = 'above' AND s.last_price >= a.target_price)
           OR (a.direction = 'below' AND s.last_price <= a.target_price)
         )`
    );

    for (const a of rows) {
      // Mark first so a crash mid-loop can't spam the same alert next run.
      await db.query(
        'UPDATE price_alerts SET triggered = TRUE, triggered_at = NOW() WHERE id = $1 AND triggered = FALSE',
        [a.id]
      );

      const sym = a.currency === 'NGN' ? '₦' : '$';
      const label = a.display_symbol || a.symbol;
      const price = Number(a.last_price).toFixed(2);
      const target = Number(a.target_price).toFixed(2);
      const verb = a.direction === 'above' ? 'climbed to' : 'dropped to';

      // In-app (the bell)
      await notify({
        recipientId: a.user_id,
        type: 'price_alert',
        message: `🎯 ${label} ${verb} ${sym}${price} — your ${a.direction} ${sym}${target} alert hit.`,
      });

      // Off-site delivery: Telegram if they've linked it, otherwise email.
      if (a.telegram_chat_id) {
        const tg =
          `🎯 <b>Price alert hit</b>\n\n` +
          `<b>${label}</b> ${verb} <b>${sym}${price}</b>\n` +
          `Your target: ${a.direction} ${sym}${target}` +
          (a.note ? `\n\n📝 ${a.note}` : '');
        sendToUser(a.user_id, tg).catch(() => {});
      } else if (a.email) {
        sendEmail({
          to: a.email,
          ...priceAlertEmail({ label, verb, sym, price, target, direction: a.direction, note: a.note }),
        }).catch(() => {});
      }

      fired++;
    }
  } catch (err) {
    console.error('checkPriceAlerts error:', err.message);
  }
  return fired;
}

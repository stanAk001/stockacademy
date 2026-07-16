// ============================================================
// paymentStatus.js — one rule for "is this payment done, dead, or in flight?"
//
// Bank transfers and USSD do NOT settle while the user waits. Paystack and
// Flutterwave both report an in-flight payment with a non-success status for a
// while. Treating that as "failed" is the most expensive bug a payment flow can
// have: we'd tell someone their payment failed after their money left, and (in
// the booking flows) permanently mark the record failed/cancelled — so even when
// the money lands, the record still says failed.
//
// So: check isSettling() FIRST, before any 'failed' write, and answer 202 to
// tell the client to keep waiting.
//
//   Paystack:    success | pending | ongoing | processing | queued | abandoned | failed | reversed
//   Flutterwave: successful | pending | failed
// ============================================================
const PAID = ['success', 'successful'];
const SETTLING = ['pending', 'ongoing', 'processing', 'queued', 'send_otp', 'open'];

const norm = (s) => String(s ?? '').toLowerCase().trim();

/** Money is confirmed in our account. */
export const isPaid = (status) => PAID.includes(norm(status));

/** Still in flight — NOT a failure. Never write 'failed' for these. */
export const isSettling = (status) => SETTLING.includes(norm(status));

/** 202 = "not done yet, ask again". Clients poll on this. */
export const respondPending = (res, status) =>
  res.status(202).json({
    success: false,
    pending: true,
    status: norm(status),
    message: 'Payment is still being confirmed.',
  });

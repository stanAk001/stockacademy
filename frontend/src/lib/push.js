// Web Push registration helpers. All defensive: unsupported browsers, denied
// permission, and an unconfigured server each surface a clear reason instead of
// throwing something opaque.
import api from '../services/api';

export const isPushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const permissionState = () =>
  typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// Turn on push for THIS device. Returns true, or throws Error with a friendly
// message ('unsupported' | 'unconfigured' | 'denied' | other).
export async function enablePush() {
  if (!isPushSupported()) throw new Error('unsupported');

  const { data } = await api.get('/push/vapid-public-key');
  if (!data.configured || !data.key) throw new Error('unconfigured');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('denied');

  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.key),
    });
  }
  await api.post('/push/subscribe', { subscription: sub.toJSON() });
  return true;
}

export async function disablePush() {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && (await reg.pushManager.getSubscription());
    if (sub) {
      await api.post('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
      await sub.unsubscribe();
    }
  } catch { /* best effort */ }
}

// Is this device already subscribed?
export async function isSubscribed() {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && (await reg.pushManager.getSubscription());
    return Boolean(sub);
  } catch { return false; }
}

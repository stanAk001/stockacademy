// Language preference for AI output. Persisted in localStorage so one choice
// applies across the tutor, compare, news, and portfolio AI features.
export const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'pcm', label: 'Pidgin' },
  { code: 'yo', label: 'Yorùbá' },
  { code: 'ha', label: 'Hausa' },
  { code: 'ig', label: 'Igbo' },
];

const KEY = 'sa_lang';

export function getLang() {
  try {
    const v = localStorage.getItem(KEY);
    return LANGS.some((l) => l.code === v) ? v : 'en';
  } catch {
    return 'en';
  }
}

export function setLang(code) {
  try { localStorage.setItem(KEY, code); } catch { /* ignore */ }
}

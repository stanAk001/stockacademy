import { Globe } from 'lucide-react';
import { LANGS, setLang } from '../lib/lang';

// Compact language selector. Persists the choice and bubbles it up via onChange.
export default function LanguagePicker({ value, onChange, className = '' }) {
  const change = (code) => { setLang(code); onChange?.(code); };
  return (
    <label className={`inline-flex items-center gap-1.5 text-xs font-semibold text-ink/55 ${className}`}>
      <Globe size={14} className="shrink-0" />
      <select
        value={value}
        onChange={(e) => change(e.target.value)}
        className="bg-cream-warm rounded-full pl-2.5 pr-6 py-1 text-xs font-bold text-ink cursor-pointer focus:outline-none focus:ring-2 focus:ring-coral-500"
        aria-label="Answer language"
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
    </label>
  );
}

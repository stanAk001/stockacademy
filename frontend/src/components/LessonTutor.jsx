import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Loader2, Send, Lock, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import LanguagePicker from './LanguagePicker';
import { getLang } from '../lib/lang';

const STARTERS = [
  'Explain this lesson in simple terms',
  'Give me a real-world example',
  'Why does this matter for me?',
];

// An AI tutor panel shown under each lesson. Premium-gated; grounded in the
// lesson content server-side. Single-turn Q&A with a visible transcript.
export default function LessonTutor({ lessonId }) {
  const { user } = useAuth();
  const isPremium = user?.plan === 'premium';
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState(getLang());
  const [cooldownUntil, setCooldownUntil] = useState(0); // ms timestamp
  const [now, setNow] = useState(Date.now());

  // Tick once a second while a cooldown is active so the countdown updates.
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return undefined;
    setNow(Date.now());
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= cooldownUntil) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const cooling = cooldownUntil > now;
  const remaining = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const fmtRemaining = remaining >= 60 ? `${Math.floor(remaining / 60)}m ${remaining % 60}s` : `${remaining}s`;

  const ask = async (q) => {
    const question = (q ?? input).trim();
    if (!question || busy || cooling) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setBusy(true);
    try {
      const { data } = await api.post('/ai/tutor', { lesson_id: lessonId, question, language: lang });
      if (data.success) {
        setMessages((m) => [...m, { role: 'tutor', text: data.answer }]);
      }
    } catch (err) {
      const r = err.response?.data;
      if (err.response?.status === 429 || r?.limited) {
        // Hit the tutor rate limit — start a visible cooldown.
        const secs = r?.retry_after_seconds || 60;
        setCooldownUntil(Date.now() + secs * 1000);
        setMessages((m) => [...m, { role: 'tutor', text: r?.message || "You've reached the tutor limit — please take a short break and try again." }]);
      } else {
        toast.error(r?.message || 'The tutor could not answer.');
        setMessages((m) => [...m, { role: 'tutor', text: "Sorry — I couldn't answer that just now. Please try again in a moment." }]);
      }
    } finally {
      setBusy(false);
    }
  };

  /* Free users: a tasteful nudge. */
  if (!isPremium) {
    return (
      <div className="mt-10 card-soft p-5 sm:p-6 ring-1 ring-ink/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-ink grid place-items-center shrink-0">
              <Sparkles size={18} className="text-sun-300" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-lg font-black leading-tight">Stuck? Ask the AI tutor</h3>
              <p className="text-sm text-ink/55 break-words">
                A patient tutor that re-explains this lesson any way you need — examples, analogies, plain English.
              </p>
            </div>
          </div>
          <Link to="/pricing" className="btn-primary bg-ink shrink-0">
            <Lock size={15} /> Unlock with Premium
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-10 card-soft p-5 sm:p-6 min-w-0">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-ink grid place-items-center shrink-0">
          <Sparkles size={18} className="text-sun-300" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-black leading-tight">Ask the AI tutor</h3>
          <p className="text-[11px] text-ink/45">Grounded in this lesson · explains, never advises</p>
        </div>
        <LanguagePicker value={lang} onChange={setLang} className="shrink-0" />
      </div>

      {messages.length > 0 && (
        <div className="space-y-3 mb-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm break-words ${
                m.role === 'user' ? 'bg-ink text-cream rounded-br-sm' : 'bg-cream-warm text-ink/85 rounded-bl-sm'
              }`}>
                <p className="whitespace-pre-line leading-relaxed">{m.text}</p>
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="bg-cream-warm rounded-2xl px-4 py-2.5"><Loader2 size={16} className="animate-spin text-ink/40" /></div>
            </div>
          )}
        </div>
      )}

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {STARTERS.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              disabled={busy || cooling}
              className="text-[12px] font-semibold text-ink/65 bg-cream-warm rounded-full px-3 py-1.5 hover:bg-ink hover:text-cream transition disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {cooling && (
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-coral-600 bg-coral-300/15 border border-coral-300/30 rounded-xl px-3 py-2">
          <Clock size={14} className="shrink-0" />
          Tutor limit reached — try again in <span className="font-mono tabular-nums">{fmtRemaining}</span>.
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }}
          rows={1}
          disabled={cooling}
          placeholder={cooling ? `Take a short break — back in ${fmtRemaining}` : 'Ask anything about this lesson…'}
          className="input-field text-sm flex-1 min-w-0 resize-none py-2.5 disabled:opacity-60"
        />
        <button
          onClick={() => ask()}
          disabled={busy || !input.trim() || cooling}
          className="shrink-0 w-11 h-11 grid place-items-center rounded-2xl bg-ink text-cream hover:bg-ink-soft transition disabled:opacity-50"
          aria-label="Send"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
      <p className="text-[10px] text-ink/40 mt-2">Educational only — not financial advice.</p>
    </div>
  );
}

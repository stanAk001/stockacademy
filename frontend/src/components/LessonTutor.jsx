import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Loader2, Send, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import LanguagePicker from './LanguagePicker';
import ChatMarkdown from './ChatMarkdown';
import { getLang, LANGS } from '../lib/lang';

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
  const [freeLeft, setFreeLeft] = useState(null); // free-tier questions remaining (null = unknown)
  const [locked, setLocked] = useState(false);     // free allowance used up → upsell
  const [lastQuestion, setLastQuestion] = useState(''); // re-asked when the language changes
  const [translating, setTranslating] = useState(false);

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
        setLastQuestion(question); // so a language switch can re-answer it
        if (typeof data.free_remaining === 'number') setFreeLeft(data.free_remaining);
      }
    } catch (err) {
      const r = err.response?.data;
      if (err.response?.status === 402 || r?.upgrade) {
        // Free allowance used up — flip to the upgrade nudge.
        setLocked(true);
        setFreeLeft(0);
        setMessages((m) => [...m, { role: 'tutor', text: r?.message || "That's your free tutor questions used up. Upgrade to Premium to keep going." }]);
      } else if (err.response?.status === 429 || r?.limited) {
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

  // Swap the most recent tutor reply in place, keeping the transcript intact.
  const replaceLastAnswer = (text) =>
    setMessages((m) => {
      const idx = m.map((x) => x.role).lastIndexOf('tutor');
      if (idx === -1) return [...m, { role: 'tutor', text }];
      const copy = [...m];
      copy[idx] = { role: 'tutor', text };
      return copy;
    });

  // Changing the language re-answers the question you're already looking at,
  // rather than making you re-type it. The server caches per (lesson, question,
  // language), so flipping back to a language you've already seen is instant
  // and costs nothing.
  const changeLang = async (code) => {
    if (code === lang) return;
    setLang(code);
    if (!lastQuestion || busy || translating || cooling || blocked) return;

    setTranslating(true);
    try {
      const { data } = await api.post('/ai/tutor', { lesson_id: lessonId, question: lastQuestion, language: code });
      if (data.success) {
        replaceLastAnswer(data.answer);
        if (typeof data.free_remaining === 'number') setFreeLeft(data.free_remaining);
      }
    } catch (err) {
      const r = err.response?.data;
      // Keep the existing answer on screen — a failed switch shouldn't lose it.
      if (err.response?.status === 402 || r?.upgrade) {
        setLocked(true);
        setFreeLeft(0);
        toast(r?.message || 'Upgrade to Premium for unlimited answers in any language.', { icon: '✨' });
      } else if (err.response?.status === 429 || r?.limited) {
        const secs = r?.retry_after_seconds || 60;
        setCooldownUntil(Date.now() + secs * 1000);
        toast(r?.message || 'Tutor limit reached. Try again shortly.', { icon: '⏳' });
      } else {
        toast.error(r?.message || "Couldn't switch language. Please try again.");
      }
    } finally {
      setTranslating(false);
    }
  };

  // Free users get a couple of questions, then this flips true and we upsell.
  const blocked = !isPremium && (locked || freeLeft === 0);

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
        {!isPremium && !blocked && (
          <span className="shrink-0 text-[10px] font-black uppercase tracking-wider bg-sun-100 text-sun-600 px-2 py-1 rounded-full">
            {freeLeft == null ? 'Free preview' : `${freeLeft} free left`}
          </span>
        )}
        <LanguagePicker value={lang} onChange={changeLang} disabled={busy || translating} className="shrink-0" />
      </div>

      {messages.length > 0 && (
        <div className="space-y-3 mb-4">
          {messages.map((m, i) => {
            // The reply being re-answered in the new language fades while it swaps.
            const isLastTutor = m.role === 'tutor' && i === messages.map((x) => x.role).lastIndexOf('tutor');
            return (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm break-words transition-opacity ${
                  m.role === 'user' ? 'bg-ink text-cream rounded-br-sm' : 'bg-cream-warm text-ink/85 rounded-bl-sm'
                } ${translating && isLastTutor ? 'opacity-40' : ''}`}>
                  {m.role === 'user'
                    ? <p className="whitespace-pre-line leading-relaxed">{m.text}</p>
                    : <ChatMarkdown className="text-ink/85">{m.text}</ChatMarkdown>}
                </div>
              </div>
            );
          })}
          {busy && (
            <div className="flex justify-start">
              <div className="bg-cream-warm rounded-2xl px-4 py-2.5"><Loader2 size={16} className="animate-spin text-ink/40" /></div>
            </div>
          )}
          {translating && (
            <div className="flex justify-start">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink/50 bg-cream-warm rounded-full px-2.5 py-1">
                <Loader2 size={12} className="animate-spin" />
                Switching to {LANGS.find((l) => l.code === lang)?.label || 'your language'}…
              </span>
            </div>
          )}
        </div>
      )}

      {messages.length === 0 && !blocked && (
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

      {blocked ? (
        /* Free allowance used — the upsell, warm and specific about what they get. */
        <div className="rounded-2xl bg-ink text-cream p-5 mt-1">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles size={16} className="text-sun-300" />
            <p className="text-xs font-black uppercase tracking-widest text-sun-300">You're clearly getting value</p>
          </div>
          <h4 className="font-display text-lg font-black leading-snug mb-1.5">Keep the tutor going with Premium</h4>
          <p className="text-sm text-cream/75 leading-relaxed mb-4">
            You've used your 2 free questions. Premium unlocks <span className="text-cream font-semibold">unlimited</span> tutoring
            in English, Pidgin, Yorùbá, Hausa and Igbo, plus AI stock comparisons, news scans and portfolio reviews.
          </p>
          <Link to="/pricing" className="btn-primary bg-sun-300 text-ink hover:bg-sun-400">
            <Sparkles size={15} /> Go Premium
          </Link>
        </div>
      ) : (
        <>
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
          {!isPremium && freeLeft === 1 && (
            <p className="text-[11px] text-ink/50 mt-2">1 free question left, then Premium keeps it going.</p>
          )}
          <p className="text-[10px] text-ink/40 mt-2">Educational only — not financial advice.</p>
        </>
      )}
    </div>
  );
}

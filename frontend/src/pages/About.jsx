import { Link } from 'react-router-dom';
import { MessageSquareText, Languages, GraduationCap, TrendingUp, ArrowRight } from 'lucide-react';
import Layout from '../components/Layout';
import { creator } from '../siteConfig';

const PILLARS = [
  { icon: MessageSquareText, title: 'Plain English, always', body: 'P/E, ROE, margins — the jargon, rewritten into words a complete beginner actually understands.' },
  { icon: Languages, title: 'In your language', body: 'Explanations in English, Pidgin, Yorùbá, Hausa or Igbo. Finance shouldn’t only speak one language.' },
  { icon: TrendingUp, title: 'NGX + US, together', body: 'Nigerian and US markets side by side. Most tools ignore the NGX — here it’s front and centre.' },
  { icon: GraduationCap, title: 'Learn, don’t gamble', body: '$100k of paper money, real courses and 1-on-1 mentors — practice until it genuinely clicks.' },
];

export default function About() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <p className="text-xs sm:text-sm font-black uppercase tracking-[0.15em] text-coral-500 mb-3">Our mission</p>
        <h1 className="font-display text-3xl sm:text-5xl font-black leading-[1.05]">
          Make investing make sense — <span className="italic text-coral-500">for everyone.</span>
        </h1>
        <p className="text-ink/65 text-base sm:text-xl mt-4 leading-relaxed max-w-2xl">
          Most people never invest because the market feels like a casino dressed up in jargon. StockAcademia exists
          to change that: clear, honest, beginner-first education that turns confusion into confidence.
        </p>

        {/* Founder’s note */}
        <div className="relative overflow-hidden card-dark grain-overlay p-7 sm:p-10 mt-10">
          {/* oversized decorative quote glyph (solid, not a glow) */}
          <span
            aria-hidden="true"
            className="pointer-events-none select-none absolute -top-8 right-1 sm:right-5 font-display font-black text-sun-300/15 text-[9rem] sm:text-[13rem] leading-none"
          >
            ”
          </span>

          <div className="relative">
            <span className="inline-block text-[0.7rem] sm:text-xs font-black uppercase tracking-[0.15em] text-ink bg-sun-300 rounded-full px-3 py-1">
              Why I built this
            </span>
            <h2 className="font-display text-2xl sm:text-4xl font-black leading-[1.08] mt-5 max-w-xl">
              I built the stock platform I <span className="italic text-sun-300">wish I’d had.</span>
            </h2>
            <p className="text-cream/80 leading-relaxed mt-4 max-w-xl">
              Every “educational” stock site I tried was either a wall of jargon or a quiet pitch for a hot tip.
              So I made the opposite — the real numbers, explained in your own language, with fake money to
              practise on until it actually clicks. No hype. No tips. No pressure.
            </p>

            {/* Signature */}
            <div className="flex items-center gap-3 mt-7 pt-6 border-t border-cream/10">
              <div className="w-11 h-11 rounded-2xl bg-sun-300 text-ink grid place-items-center font-display font-black text-lg shrink-0 ring-4 ring-sun-300/20">
                {creator.name.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-cream leading-tight">{creator.name}</p>
                <p className="text-sm text-cream/55 leading-snug">{creator.tagline}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pillars */}
        <div className="grid sm:grid-cols-2 gap-4 mt-10">
          {PILLARS.map((p) => (
            <div key={p.title} className="card-soft p-6">
              <div className="w-11 h-11 bg-ink text-sun-300 rounded-2xl grid place-items-center mb-3">
                <p.icon size={20} strokeWidth={2.4} />
              </div>
              <h3 className="font-display text-lg font-bold">{p.title}</h3>
              <p className="text-sm text-ink/60 mt-1 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>

        {/* Principle */}
        <div className="mt-10 border-l-4 border-sun-300 pl-5 sm:pl-6">
          <p className="font-display text-2xl sm:text-3xl font-black leading-[1.12]">
            Stop guessing. <span className="italic text-coral-500">Start investing smarter.</span>
          </p>
          <p className="text-ink/50 text-sm mt-3">— the idea every feature here is built on</p>
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <Link to="/signup" className="btn-primary">Start learning free <ArrowRight size={16} /></Link>
          <p className="text-xs text-ink/45 mt-3">Educational analysis — not financial advice.</p>
        </div>
      </div>
    </Layout>
  );
}

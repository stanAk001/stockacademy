import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Telescope, Brain, Newspaper, Sparkles, Radar, Compass, SlidersHorizontal, ArrowRight,
} from 'lucide-react';
import api from '../services/api';
import { track } from '../lib/analytics';

// ============================================================
// FreeAiTools — the free tier made visible (spec §20/§35).
// Free users get a real monthly taste of the AI; this is where they find it.
// Live "N of M left" counts come from GET /ai/usage (the server enforces the
// limits). When an allowance is used up, the card points to Premium instead.
// ============================================================

const TOOLS = [
  { key: 'ai_scout', icon: Telescope, name: 'AI Stock Scout', desc: 'Let the AI find swing or long-term opportunities for you.', to: '/scout' },
  { key: 'ai_analysis', icon: Sparkles, name: 'AI stock snapshot', desc: 'A plain-English read on any stock. Open a stock and tap “Explain”.', to: '/rankings' },
  { key: 'ai_comparison', icon: Brain, name: 'AI stock comparison', desc: 'Two stocks side by side, with a clear verdict.', to: '/compare-stocks' },
  { key: 'ai_news', icon: Newspaper, name: 'AI news scanner', desc: '30 days of company news, cut down to what matters.', to: '/news-scanner' },
  { key: null, icon: Radar, name: 'Opportunity Radar', desc: 'The strongest opportunities on the board right now.', to: '/radar', note: 'Free preview' },
  { key: null, icon: Compass, name: 'My Market', desc: 'Market status and opportunities that match your profile.', to: '/my-market', note: 'Free preview' },
];

export default function FreeAiTools() {
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    api.get('/ai/usage')
      .then(({ data }) => setUsage(data?.success ? (data.features || {}) : {}))
      .catch(() => setUsage({}));
  }, []);

  return (
    <section className="mb-6 sm:mb-8">
      <div className="flex items-end justify-between gap-3 mb-3 sm:mb-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-sun-600">Included free</p>
          <h2 className="font-display text-2xl sm:text-3xl font-black leading-tight">Your free AI tools</h2>
          <p className="text-sm text-ink/60 mt-1">A real taste of StockAcademia’s AI every month. Allowances reset on the 1st.</p>
        </div>
        <Link to="/investment-profile" className="text-sm font-bold text-bull-600 hover:underline inline-flex items-center gap-1.5">
          <SlidersHorizontal size={14} /> Set your investing profile
        </Link>
      </div>

      {/* two across on phones too — the card stacks its icon on top there */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {TOOLS.map((t) => {
          const f = t.key ? usage?.[t.key] : null;
          const out = Boolean(f && f.limit != null && f.remaining === 0);
          const Icon = t.icon;
          const chip = t.note
            ? t.note
            : !usage
              ? '…'
              : f && f.limit != null
                ? `${f.remaining} of ${f.limit} left`
                : 'Free';
          return (
            <Link
              key={t.name}
              to={out ? '/pricing' : t.to}
              onClick={out ? () => track('upgrade_clicked', { surface: 'dashboard_free_tools', feature: t.key }) : undefined}
              className="card-soft p-3 sm:p-4 flex flex-col sm:flex-row gap-2 sm:gap-3 hover:-translate-y-0.5 transition motion-reduce:transform-none"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-ink grid place-items-center shrink-0">
                <Icon className="w-[17px] h-[17px] sm:w-[18px] sm:h-[18px] text-sun-300" />
              </div>
              <div className="min-w-0 flex-1">
                {/* badge on its own line on phones, so every card's description
                    starts at the same height */}
                <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-1 sm:gap-2">
                  <p className="font-bold text-[13px] sm:text-sm leading-tight">{t.name}</p>
                  <span className={`shrink-0 text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full ${
                    out ? 'bg-bear-500/10 text-bear-500' : 'bg-bull-100 text-bull-700'
                  }`}>{out ? 'Used up' : chip}</span>
                </div>
                <p className="text-[11px] sm:text-xs text-ink/60 mt-1 leading-snug">{t.desc}</p>
                {out && (
                  <p className="text-[11px] sm:text-xs font-bold text-coral-500 mt-1.5 inline-flex items-center gap-1">
                    Go unlimited with Premium <ArrowRight size={11} />
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

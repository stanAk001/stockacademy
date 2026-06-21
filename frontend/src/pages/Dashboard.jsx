import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, BookOpen, Trophy, Wallet, Zap,
  ArrowRight, Target, Flame, MessagesSquare, LineChart as LineIcon, Sparkles,
  Search, BarChart3, Brain
} from 'lucide-react';
import Layout from '../components/Layout';
import StockSearch from '../components/StockSearch';
import TickerTape from '../components/TickerTape';
import PremiumTools from '../components/PremiumTools';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const levelLabel = (xp) => {
  if (xp < 50) return { tier: 'Rookie', color: 'bg-ink/10 text-ink' };
  if (xp < 150) return { tier: 'Apprentice', color: 'bg-sage-200 text-bull-700' };
  if (xp < 400) return { tier: 'Analyst', color: 'bg-sun-100 text-sun-600' };
  if (xp < 1000) return { tier: 'Strategist', color: 'bg-coral-300 text-ink' };
  return { tier: 'Master', color: 'bg-ink text-sun-300' };
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsR, coursesR, portfolioR, postsR] = await Promise.all([
          api.get('/users/stats'),
          api.get('/courses'),
          api.get('/trading/portfolio'),
          api.get('/forum/posts').catch(() => ({ data: { posts: [] } })),
        ]);
        if (statsR.data.success) setStats(statsR.data.stats);
        if (coursesR.data.success) setCourses(coursesR.data.courses);
        if (portfolioR.data.success) setPortfolio(portfolioR.data);
        setPosts(postsR.data.posts?.slice(0, 3) || []);
      } catch (err) { /* ignore */ }
    };
    load();
  }, []);

  const level = levelLabel(user?.total_xp || 0);
  const firstName = user?.full_name?.split(' ')[0] || user?.username;

  return (
    <Layout>
      <TickerTape />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-bull-600 flex items-center gap-2">
                <Sparkles size={14} /> {new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <h1 className="font-display text-4xl sm:text-5xl font-black leading-tight mt-1">
                Hey {firstName}, <span className="italic text-ink/50">ready to learn?</span>
              </h1>
            </div>
            <span className={`chip ${level.color} text-sm px-4 py-1.5 self-start sm:self-auto`}>
              <Trophy size={14} /> {level.tier}
            </span>
          </div>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard
            icon={Zap}
            label="Total XP"
            value={stats?.xp ?? 0}
            accent="bg-sun-300"
            note="earned from learning"
          />
          <StatCard
            icon={BookOpen}
            label="Lessons"
            value={`${stats?.lessons_completed ?? 0}/${stats?.total_lessons ?? 0}`}
            accent="bg-bull-400"
            note={`${stats?.progress_pct ?? 0}% complete`}
          />
          <StatCard
            icon={Target}
            label="Quizzes passed"
            value={stats?.quizzes_passed ?? 0}
            accent="bg-coral-300"
            note="knowledge checks"
          />
          <StatCard
            icon={Wallet}
            label="Portfolio"
            value={`$${(portfolio?.summary?.total_value ?? user?.virtual_balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            accent="bg-sage-400"
            note={
              portfolio?.summary?.total_pl >= 0
                ? `+$${Math.abs(portfolio?.summary?.total_pl || 0).toFixed(2)} profit`
                : `-$${Math.abs(portfolio?.summary?.total_pl || 0).toFixed(2)} loss`
            }
          />
        </div>

        {/* Featured: AI Analysis */}
        <SmartAnalysisFeature />
        <CertificateBanner />

        {/* Recently viewed stocks */}
        <RecentlyViewed />

        {/* Premium tools (AI analyzer, compare, Telegram, review) */}
        <PremiumTools />

        {/* Main grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Continue learning */}
          <div className="lg:col-span-2 card-soft p-7">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-bull-600">Continue learning</p>
                <h2 className="font-display text-2xl font-bold">Your next lesson awaits</h2>
              </div>
              <Link to="/courses" className="text-sm font-semibold text-bull-600 hover:underline flex items-center gap-1">
                All courses <ArrowRight size={14} />
              </Link>
            </div>

            <div className="space-y-3">
                {courses.slice(0, 3).map((c) => (
                <Link
                  key={c.id}
                  to={`/courses/${c.slug}`}
                  className="flex items-start gap-3 sm:gap-4 p-4 rounded-2xl hover:bg-cream-warm transition group"
                >
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${c.cover_color} grid place-items-center text-xl sm:text-2xl shrink-0`}>
                    {c.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-base sm:text-lg break-words">{c.title}</p>
                    <p className="text-sm text-ink/60 break-words line-clamp-2">{c.description}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-ink/50">
                      <span>{c.lesson_count} lessons</span>
                      <span>·</span>
                      <span>{c.difficulty}</span>
                      <span>·</span>
                      <span>{c.estimated_minutes} min</span>
                    </div>
                  </div>
                  <ArrowRight className="opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition shrink-0 mt-1" size={20} />
                </Link>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Daily tip */}
            <div className="bg-ink text-cream rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 text-sun-300/10 font-display text-8xl font-black leading-none">💡</div>
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <Flame className="text-sun-300" size={18} />
                  <p className="text-xs font-bold uppercase tracking-widest text-sun-300">Tip of the day</p>
                </div>
                <h3 className="font-display text-xl font-bold leading-snug mb-2">
                  Time in the market beats timing the market.
                </h3>
                <p className="text-sm text-cream/70">
                  Research from Morgan Stanley shows that missing just the 10 best days in the market over 20 years
                  cuts your returns in half. Stay invested.
                </p>
              </div>
            </div>

            {/* Shortcuts */}
            <div className="card-soft p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-coral-500 mb-4">Quick actions</p>
              <div className="grid grid-cols-2 gap-3">
                <QuickLink to="/simulator" icon={LineIcon} label="Trade" color="bg-bull-400" />
                <QuickLink to="/forum" icon={MessagesSquare} label="Community" color="bg-coral-300" />
                <QuickLink to="/leaderboard" icon={Trophy} label="Leaderboard" color="bg-sun-300" />
                <QuickLink to="/profile" icon={Target} label="My progress" color="bg-sage-400" />
              </div>
            </div>

            {/* Community preview */}
            {posts.length > 0 && (
              <div className="card-soft p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-bull-600">From the community</p>
                  <Link to="/forum" className="text-xs font-semibold text-bull-600 hover:underline">See all</Link>
                </div>
                <div className="space-y-3">
                  {posts.map((p) => (
                    <Link key={p.id} to={`/forum/${p.id}`} className="block hover:bg-cream-warm -mx-2 px-2 py-2 rounded-lg transition">
                      <p className="font-semibold text-sm line-clamp-1">{p.title}</p>
                      <p className="text-xs text-ink/50">by @{p.username}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Achievements strip */}
        <div className="mt-10 bg-gradient-to-r from-sun-300 via-coral-300 to-coral-400 rounded-3xl p-7 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-ink/10 rounded-full" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest">Keep going!</p>
              <h3 className="font-display text-2xl sm:text-3xl font-black mt-1">
                You've earned {stats?.achievements ?? 0} achievements
              </h3>
              <p className="text-ink/70 text-sm mt-1">Every lesson, quiz and trade moves you up the leaderboard.</p>
            </div>
            <Link to="/leaderboard" className="btn-primary bg-ink">
              See leaderboard <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );

  function CertificateBanner() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/certificates/eligibility')
      .then(({ data }) => setData(data))
      .catch(() => {});
  }, []);

  if (!data) return null;
  if (data.already_owns) return null;
  if (!data.eligible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 sm:mb-10 bg-gradient-to-r from-sun-300 via-coral-300 to-coral-400 rounded-3xl p-5 sm:p-7 relative overflow-hidden"
    >
      <div className="absolute -top-6 -right-6 w-32 h-32 bg-ink/10 rounded-full" />
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-ink rounded-2xl grid place-items-center shrink-0">
            <Sparkles className="text-sun-300" size={28} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest">Congratulations!</p>
            <h3 className="font-display text-xl sm:text-2xl font-black mt-1">You've completed the entire program 🎓</h3>
            <p className="text-ink/70 text-xs sm:text-sm mt-1">Claim your StockAcademia Graduate certificate.</p>
          </div>
        </div>
        <Link to="/certificate" className="btn-primary bg-ink shrink-0">
          Get certificate <ArrowRight size={16} />
        </Link>
      </div>
    </motion.div>
  );
}
}

function StatCard({ icon: Icon, label, value, accent, note }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-soft p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink/60">{label}</span>
        <div className={`w-9 h-9 ${accent} rounded-xl grid place-items-center`}>
          <Icon size={16} className="text-ink" strokeWidth={2.4} />
        </div>
      </div>
      <p className="font-display text-3xl font-black leading-none">{value}</p>
      <p className="text-xs text-ink/50 mt-2">{note}</p>
    </motion.div>
  );
}

function QuickLink({ to, icon: Icon, label, color }) {
  return (
    <Link to={to} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-cream-warm transition">
      <div className={`w-10 h-10 ${color} rounded-xl grid place-items-center`}>
        <Icon size={16} className="text-ink" strokeWidth={2.4} />
      </div>
      <span className="font-semibold text-sm">{label}</span>
    </Link>
  );
}

/* ============================================
 *  Smart Analysis featured block — surfaces the analysis engine
 *  on the dashboard so users know it's there and can dive in.
 * ============================================ */
function SmartAnalysisFeature() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="relative bg-ink text-cream rounded-[2rem] p-6 sm:p-8 mb-10 overflow-hidden grain-overlay"
    >
      {/* Decorative blobs */}
      <div className="absolute -top-8 -right-8 w-48 h-48 bg-coral-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 left-1/3 w-56 h-56 bg-sun-300/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative grid lg:grid-cols-12 gap-6 items-center">
        {/* Left: copy + search */}
        <div className="lg:col-span-7">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cream/10 text-sun-300 text-xs font-bold uppercase tracking-widest mb-3">
            <Brain size={12} /> AI-Powered Analysis
          </div>
          <h2 className="font-display text-2xl sm:text-4xl font-black leading-[1.05] mb-2">
            Search any stock.<br/>
            <span className="italic text-sun-300">Understand it in plain English.</span>
          </h2>
          <p className="text-cream/70 text-sm sm:text-base mb-5 max-w-md leading-relaxed">
            The real numbers on any US or Nigerian stock, explained in your language. Read it, then practice with it in the simulator.
          </p>

          {/* Embedded search */}
          <div className="bg-cream rounded-2xl p-2 max-w-md mb-3">
            <StockSearch inline />
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-2">
            <Link to="/rankings" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-sun-300 text-ink text-xs font-bold hover:bg-sun-400 transition">
              <BarChart3 size={12}/> Browse stocks by the numbers
            </Link>
            <Link to="/simulator" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-cream/10 text-cream text-xs font-bold hover:bg-cream/20 transition">
              <LineIcon size={12}/> Open simulator
            </Link>
          </div>
        </div>

        {/* Right: sample card */}
        <div className="lg:col-span-5 hidden lg:block">
          <div className="bg-cream/5 border border-cream/10 rounded-2xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-mono text-sm font-bold">EXAMPLE · AAPL</p>
                <p className="text-xs text-cream/50">What a report looks like</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'P/E', value: '31.2' },
                { label: '1Y', value: '+18%' },
                { label: 'Div', value: '0.5%' },
              ].map((f) => (
                <div key={f.label} className="bg-cream/10 rounded-xl px-2 py-2 text-center">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-cream/50">{f.label}</p>
                  <p className="font-mono font-bold text-sm">{f.value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-cream/70 italic pt-3 border-t border-cream/10">
              "Hugely profitable, but priced for high expectations — that premium is the real risk."
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}


/* ============================================
 *  Recently viewed stocks — quick re-entry to research the user did
 * ============================================ */
function RecentlyViewed() {
  const [recent, setRecent] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get('/users/recently-viewed')
      .then(({ data }) => data.success && setRecent(data.recent))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || recent.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold uppercase tracking-widest text-ink/50">Recently analysed</p>
        <Link to="/rankings" className="text-xs font-bold text-bull-600 hover:underline">View all →</Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {recent.map((s) => {
          const sym = s.currency === 'NGN' ? '₦' : '$';
          const up = (s.day_change_pct ?? 0) >= 0;
          return (
            <Link
              key={s.symbol}
              to={`/stocks/${encodeURIComponent(s.symbol)}`}
              className="card-soft p-3 hover:shadow-lg hover:-translate-y-0.5 transition"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono font-bold text-sm">{s.display_symbol}</span>
                <span className="text-[10px]">{s.country === 'NG' ? '🇳🇬' : '🇺🇸'}</span>
              </div>
              <p className="text-[10px] text-ink/55 truncate mb-1.5">{s.name}</p>
              {s.last_price && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold">{sym}{parseFloat(s.last_price).toFixed(2)}</span>
                  {s.day_change_pct != null && (
                    <span className={`text-[10px] font-mono ${up ? 'text-bull-600' : 'text-bear-500'}`}>
                      {up ? '+' : ''}{parseFloat(s.day_change_pct).toFixed(1)}%
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

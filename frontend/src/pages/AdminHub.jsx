import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, MessagesSquare, BarChart3, GraduationCap, ShieldCheck,
  Wallet, BookOpen, Sparkles, ArrowRight, TrendingUp,
} from 'lucide-react';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AdminHub() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState({ signups: [], bookings: [], posts: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.is_admin) { setLoading(false); return; }
    Promise.all([
      api.get('/admin/overview'),
      api.get('/admin/recent-activity'),
    ]).then(([o, a]) => {
      if (o.data.success) setStats(o.data.stats);
      if (a.data.success) setActivity(a.data);
    }).finally(() => setLoading(false));
  }, [user]);

  if (!user?.is_admin) {
    return (
      <Layout>
        <div className="max-w-md mx-auto p-16 text-center">
          <ShieldCheck className="mx-auto mb-3 text-ink/20" size={48}/>
          <h1 className="font-display text-2xl font-bold">Admin access required</h1>
          <p className="text-ink/60 mt-2">
            Set <code>is_admin = true</code> on your user row in pgAdmin to access this page.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-widest text-coral-500">Admin</p>
          <h1 className="font-display text-4xl sm:text-5xl font-black leading-tight mt-1">
            Control <span className="italic">center.</span>
          </h1>
          <p className="text-ink/60 mt-1">Everything happening on your platform, in one place.</p>
        </div>

        {/* Stats grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-ink/5 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : stats && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Users} label="Total users" value={stats.total_users}
              sub={`+${stats.signups_today} today`} color="bg-bull-100 text-bull-700" />
            <StatCard icon={Sparkles} label="Premium subscribers" value={stats.premium_subscribers}
              sub={`${pct(stats.premium_subscribers, stats.total_users)} of users`}
              color="bg-coral-300/40 text-coral-500" />
            <StatCard icon={Wallet} label="Revenue this month"
              value={`₦${(stats.revenue_this_month_kobo / 100).toLocaleString()}`}
              sub="Premium + bookings" color="bg-sun-100 text-sun-600" />
            <StatCard icon={BookOpen} label="Lessons completed" value={stats.lessons_completed}
              sub={`across ${stats.total_users} users`} color="bg-sage-200 text-bull-700" />
          </div>
        )}

        {/* Section cards */}
        <h2 className="font-display text-2xl font-bold mb-4">Sections</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          <SectionCard
            to="/admin/users"
            icon={Users}
            title="User management"
            desc={stats ? `${stats.total_users} users · ${stats.premium_subscribers} premium` : 'Search, ban, grant Premium'}
            color="from-bull-400 to-bull-600"
          />
          <SectionCard
            to="/admin/forum"
            icon={MessagesSquare}
            title="Forum moderation"
            desc={stats ? `${stats.active_posts} active posts · ${stats.active_comments} comments` : 'Remove abusive content'}
            color="from-coral-400 to-coral-500"
          />
          <SectionCard
            to="/admin/revenue"
            icon={BarChart3}
            title="Revenue & analytics"
            desc="Track Premium, bookings, MRR over time"
            color="from-sun-400 to-coral-400"
          />
          <SectionCard
            to="/admin/stocks"
            icon={TrendingUp}
            title="NGX stock data"
            desc="Update prices daily, fundamentals quarterly"
            color="from-sun-300 to-sun-500"
          />
          <SectionCard
            to="/admin/bookings"
            icon={GraduationCap}
            title="Mentorship bookings"
            desc={stats ? `${stats.confirmed_bookings} confirmed sessions` : 'Confirm, reschedule, attach Meet links'}
            color="from-coral-300 to-sun-300"
          />
        </div>

        {/* Activity feed */}
        <div className="grid lg:grid-cols-3 gap-5">
          <ActivityCard title="Recent signups" empty="No signups yet">
            {activity.signups.map((u) => (
              <Link
                key={u.id}
                to={`/admin/users/${u.id}`}
                className="flex items-center justify-between py-2 hover:bg-cream-warm rounded-lg px-2 -mx-2"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{u.username}</p>
                  <p className="text-xs text-ink/55 truncate">{u.email}</p>
                </div>
                <span className="text-xs text-ink/50">{relTime(u.created_at)}</span>
              </Link>
            ))}
          </ActivityCard>

          <ActivityCard title="Recent bookings" empty="No bookings yet">
            {activity.bookings.map((b) => (
              <Link
                key={b.id}
                to="/admin/bookings"
                className="flex items-center justify-between py-2 hover:bg-cream-warm rounded-lg px-2 -mx-2"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{b.name}</p>
                  <p className="text-xs text-ink/55 truncate">{b.session_type}</p>
                </div>
                <span className={`chip ${statusColor(b.status)}`}>{b.status}</span>
              </Link>
            ))}
          </ActivityCard>

          <ActivityCard title="Recent forum posts" empty="No posts yet">
            {activity.posts.map((p) => (
              <Link
                key={p.id}
                to={`/forum/${p.id}`}
                className="flex items-center justify-between py-2 hover:bg-cream-warm rounded-lg px-2 -mx-2"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{p.title}</p>
                  <p className="text-xs text-ink/55">@{p.username}</p>
                </div>
                <span className="text-xs text-ink/50">{relTime(p.created_at)}</span>
              </Link>
            ))}
          </ActivityCard>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card-soft p-5">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-9 h-9 rounded-xl ${color} grid place-items-center`}>
          <Icon size={16} strokeWidth={2.4} />
        </div>
      </div>
      <p className="text-xs font-bold uppercase tracking-wider text-ink/55">{label}</p>
      <p className="font-display text-3xl font-black mt-0.5">{value}</p>
      {sub && <p className="text-xs text-ink/55 mt-1">{sub}</p>}
    </div>
  );
}

function SectionCard({ to, icon: Icon, title, desc, color }) {
  return (
    <Link to={to} className="card-soft p-6 hover:shadow-2xl hover:-translate-y-1 transition group block">
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} grid place-items-center mb-4`}>
        <Icon size={22} className="text-ink" strokeWidth={2.4} />
      </div>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl font-bold">{title}</h3>
        <ArrowRight size={16} className="opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition" />
      </div>
      <p className="text-sm text-ink/60 leading-relaxed mt-1">{desc}</p>
    </Link>
  );
}

function ActivityCard({ title, children, empty }) {
  const items = Array.isArray(children) ? children : [children];
  const hasItems = items.filter(Boolean).length > 0;
  return (
    <div className="card-soft p-5">
      <h3 className="font-display text-lg font-bold mb-3">{title}</h3>
      {hasItems ? (
        <div className="divide-y divide-ink/5">{children}</div>
      ) : (
        <p className="text-sm text-ink/50 italic py-3">{empty}</p>
      )}
    </div>
  );
}

function pct(part, total) {
  if (!total) return '0%';
  return Math.round((part / total) * 100) + '%';
}

function relTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

function statusColor(s) {
  return ({
    confirmed: 'bg-bull-100 text-bull-700',
    pending: 'bg-sun-100 text-sun-600',
    completed: 'bg-ink/5 text-ink/60',
    cancelled: 'bg-coral-300/40 text-bear-500',
  })[s] || 'bg-ink/5 text-ink/60';
}
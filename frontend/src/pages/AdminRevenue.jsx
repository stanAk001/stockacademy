import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Wallet, Users, Calendar, ShieldCheck, TrendingUp, Brain } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AdminRevenue() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.is_admin) { setLoading(false); return; }
    api.get('/admin/revenue')
      .then(({ data }) => data.success && setData(data))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user?.is_admin) {
    return <Layout><div className="p-16 text-center"><ShieldCheck className="mx-auto mb-3 text-ink/20" size={48}/><h1 className="font-display text-2xl font-bold">Admin access required</h1></div></Layout>;
  }
  if (loading) return <Layout><div className="max-w-5xl mx-auto p-10 space-y-3"><div className="h-32 bg-ink/5 rounded-3xl animate-pulse"/><div className="h-64 bg-ink/5 rounded-3xl animate-pulse"/></div></Layout>;
  if (!data) return null;

  const { totals, monthly, recent } = data;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link to="/admin" className="text-sm text-ink/55 hover:text-ink mb-3 inline-block">← Admin home</Link>
        <h1 className="font-display text-4xl font-black mb-1">Revenue & analytics</h1>
        <p className="text-ink/60 mb-6">All revenue from Premium subscriptions and mentorship bookings.</p>

        {/* Top stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Stat icon={Wallet} label="Total revenue" value={`₦${((totals.premium_total_kobo + totals.bookings_total_kobo) / 100).toLocaleString()}`} sub="all time" color="bg-bull-100 text-bull-700"/>
          <Stat icon={Users} label="Active premium" value={totals.active_premium_subscribers} sub={`${totals.premium_count} all-time`} color="bg-coral-300/40 text-coral-500"/>
          <Stat icon={Calendar} label="Bookings paid" value={totals.bookings_count} sub={`₦${(totals.bookings_total_kobo / 100).toLocaleString()}`} color="bg-sun-100 text-sun-600"/>
          <Stat icon={TrendingUp} label="Estimated MRR" value={`₦${((totals.active_premium_subscribers * 4500)).toLocaleString()}`} sub="based on active subs" color="bg-sage-200 text-bull-700"/>
        </div>

        {/* Monthly chart */}
        <div className="card-soft p-6 mb-6">
          <h2 className="font-display text-xl font-bold mb-4">Last 6 months</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0F141910"/>
                <XAxis dataKey="label" tick={{ fontSize: 11 }}/>
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₦${(v/1000).toFixed(0)}k`}/>
                <Tooltip
                  contentStyle={{ background: '#0F1419', border: 'none', borderRadius: 12, color: '#FDF8F0' }}
                  formatter={(v) => `₦${v.toLocaleString()}`}
                />
                <Legend/>
                <Bar dataKey="premium" name="Premium" fill="#FB7185" radius={[6, 6, 0, 0]}/>
                <Bar dataKey="bookings" name="Bookings" fill="#FBBF24" radius={[6, 6, 0, 0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trend line */}
        <div className="card-soft p-6 mb-6">
          <h2 className="font-display text-xl font-bold mb-4">Total revenue trend</h2>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0F141910"/>
                <XAxis dataKey="label" tick={{ fontSize: 11 }}/>
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₦${(v/1000).toFixed(0)}k`}/>
                <Tooltip
                  contentStyle={{ background: '#0F1419', border: 'none', borderRadius: 12, color: '#FDF8F0' }}
                  formatter={(v) => `₦${v.toLocaleString()}`}
                />
                <Line type="monotone" dataKey="total" stroke="#10B981" strokeWidth={3} dot={{ r: 5 }}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent transactions */}
        <div className="card-soft p-6">
          <h2 className="font-display text-xl font-bold mb-4">Recent transactions</h2>
          {recent.length === 0 ? (
            <p className="text-ink/50 italic text-sm">No transactions yet.</p>
          ) : (
            <div className="divide-y divide-ink/5">
              {recent.map((t, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-semibold text-sm">{t.username || t.email}</p>
                    <p className="text-xs text-ink/55">{t.source === 'premium' ? '⭐ Premium upgrade' : '🎓 Mentorship booking'} · {new Date(t.paid_at).toLocaleString()}</p>
                  </div>
                  <p className="font-mono font-bold text-bull-600">₦{(t.amount_kobo / 100).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI spend */}
        <AiSpendPanel />
      </div>
    </Layout>
  );
}

/* ============================================================
 *  AI spend panel — reads ai_usage_log so you can watch Anthropic cost.
 * ============================================================ */
function AiSpendPanel() {
  const [ai, setAi] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/ai-usage')
      .then(({ data }) => data.success && setAi(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const usd = (n) => `$${Number(n || 0).toFixed(2)}`;

  return (
    <div className="card-soft p-6 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-ink grid place-items-center">
          <Brain size={16} className="text-sun-300" />
        </div>
        <h2 className="font-display text-xl font-bold">AI spending</h2>
      </div>

      {loading ? (
        <div className="h-24 bg-ink/5 rounded-2xl animate-pulse" />
      ) : !ai ? (
        <p className="text-ink/50 italic text-sm">No AI usage recorded yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <Stat icon={Brain} label="This month" value={usd(ai.month.cost)} sub={`${ai.month.calls} calls`} color="bg-coral-300/40 text-coral-500" />
            <Stat icon={TrendingUp} label="All time" value={usd(ai.total.cost)} sub={`${ai.total.calls} calls`} color="bg-sun-100 text-sun-600" />
            {ai.by_feature.map((f) => (
              <Stat key={f.feature} icon={Brain}
                label={f.feature === 'compare_stocks' ? 'Compare' : f.feature === 'analyze_portfolio' ? 'Portfolio' : f.feature}
                value={usd(f.cost)} sub={`${f.calls} this month`} color="bg-bull-100 text-bull-700" />
            ))}
          </div>

          {ai.by_day.length > 0 && (
            <div className="h-56 mb-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ai.by_day}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0F141910" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v.toFixed(2)}`} />
                  <Tooltip
                    contentStyle={{ background: '#0F1419', border: 'none', borderRadius: 12, color: '#FDF8F0' }}
                    formatter={(v) => `$${Number(v).toFixed(4)}`}
                  />
                  <Bar dataKey="cost" name="AI cost" fill="#FB7185" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <p className="text-xs text-ink/50">
            Set a hard monthly cap at console.anthropic.com — this panel is for visibility, not a limit.
          </p>
        </>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card-soft p-5">
      <div className={`w-9 h-9 rounded-xl ${color} grid place-items-center mb-2`}>
        <Icon size={16} strokeWidth={2.4}/>
      </div>
      <p className="text-xs font-bold uppercase tracking-wider text-ink/55">{label}</p>
      <p className="font-display text-2xl font-black mt-0.5">{value}</p>
      {sub && <p className="text-xs text-ink/55 mt-1">{sub}</p>}
    </div>
  );
}
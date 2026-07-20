import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown, ChevronUp, Save, Loader2, ExternalLink, ShieldCheck, AlertTriangle, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const FIELD_GROUPS = [
  { title: 'Quote', fields: [
    { key: 'price', label: 'Current price (₦)', step: '0.01' },
    { key: 'change_pct', label: "Today's change (%)", step: '0.01' },
    { key: 'volume', label: 'Volume (in millions, e.g. 3 = 3M shares)', step: '0.01' },
    { key: 'high_52w', label: '52-week high', step: '0.01' },
    { key: 'low_52w', label: '52-week low', step: '0.01' },
  ]},
  // EPS and dividend-per-share are the INPUTS (from published results, entered
  // once or twice a year). P/E and dividend yield are DERIVED from them plus the
  // live price, so they're shown read-only and can never go stale.
  { title: 'Valuation', note: 'Enter EPS and dividend/share from the company\'s results — P/E and yield calculate themselves from the live price.', fields: [
    { key: 'eps', label: 'EPS (₦) — from annual results', step: '0.01' },
    { key: 'dividend_per_share', label: 'Dividend per share (₦) — annual', step: '0.01' },
    { key: 'pe_ratio', label: 'P/E ratio', step: '0.01', derived: 'price ÷ EPS' },
    { key: 'dividend_yield', label: 'Dividend yield', step: '0.001', derived: 'dividend ÷ price' },
    { key: 'pb_ratio', label: 'P/B ratio', step: '0.01' },
    { key: 'ps_ratio', label: 'P/S ratio', step: '0.01' },
    { key: 'ev_ebitda', label: 'EV/EBITDA', step: '0.01' },
    { key: 'peg_ratio', label: 'PEG ratio', step: '0.01' },
    { key: 'market_cap_millions', label: 'Market cap (₦ millions)', step: '1' },
  ]},
  { title: 'Profitability', fields: [
    { key: 'roe', label: 'ROE (decimal, e.g. 0.18 = 18%)', step: '0.001' },
    { key: 'roa', label: 'ROA (decimal)', step: '0.001' },
    { key: 'gross_margin', label: 'Gross margin (decimal)', step: '0.001' },
    { key: 'net_margin', label: 'Net margin (decimal)', step: '0.001' },
  ]},
  { title: 'Growth', fields: [
    { key: 'revenue_growth_yoy', label: 'Revenue growth YoY (decimal)', step: '0.001' },
    { key: 'earnings_growth_yoy', label: 'Earnings growth YoY (decimal)', step: '0.001' },
  ]},
  { title: 'Balance sheet', fields: [
    { key: 'debt_to_equity', label: 'Debt/Equity', step: '0.01' },
    { key: 'current_ratio', label: 'Current ratio', step: '0.01' },
  ]},
  { title: 'Risk', fields: [
    { key: 'beta', label: 'Beta', step: '0.01' },
    { key: 'volatility_1y', label: '1Y volatility (decimal, e.g. 0.25 = 25%)', step: '0.001' },
  ]},
  { title: 'Returns', fields: [
    { key: 'return_1m', label: '1-month return (decimal)', step: '0.001' },
    { key: 'return_3m', label: '3-month return (decimal)', step: '0.001' },
    { key: 'return_6m', label: '6-month return (decimal)', step: '0.001' },
    { key: 'return_1y', label: '1-year return (decimal)', step: '0.001' },
  ]},
];

export default function AdminStocks() {
  const { user } = useAuth();
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bulkPrices, setBulkPrices] = useState({});
  const [savingBulk, setSavingBulk] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/stocks?country=NG');
      if (data.success) {
        setStocks(data.stocks);
        const initial = {};
        data.stocks.forEach((s) => { initial[s.symbol] = s.price ?? ''; });
        setBulkPrices(initial);
      }
    } catch {
      toast.error('Failed to load stocks');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (user?.is_admin) load(); /* eslint-disable-next-line */ }, [user]);

  const saveAllPrices = async () => {
    const updates = Object.entries(bulkPrices)
      .filter(([_, p]) => p !== '' && p !== null)
      .map(([symbol, price]) => ({ symbol, price }));
    if (updates.length === 0) {
      toast.error('No prices to save');
      return;
    }
    setSavingBulk(true);
    try {
      const { data } = await api.post('/admin/stocks/bulk-prices', { updates });
      if (data.success) {
        toast.success(`Updated ${data.updated} stocks`);
        load();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk save failed');
    } finally { setSavingBulk(false); }
  };

  if (!user?.is_admin) {
    return <Layout><div className="p-16 text-center"><ShieldCheck className="mx-auto mb-3 text-ink/20" size={48}/><h1 className="font-display text-2xl font-bold">Admin access required</h1></div></Layout>;
  }

  const stalest = stocks.reduce((acc, s) => {
    if (!s.data_updated_at) return acc;
    const days = (Date.now() - new Date(s.data_updated_at).getTime()) / 86400000;
    return Math.max(acc, days);
  }, 0);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link to="/admin" className="text-sm text-ink/55 hover:text-ink mb-3 inline-block">← Admin home</Link>
        <h1 className="font-display text-4xl font-black mb-1">Stock data management</h1>
        <p className="text-ink/60 mb-6">US stocks auto-update from Yahoo Finance daily. NGX stocks need manual updates.</p>

        {/* US auto-refresh banner */}
        <div className="card-soft p-4 mb-5 bg-bull-100/50 border-l-4 border-bull-500">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-bold text-sm">🇺🇸 US stocks auto-refresh</p>
              <p className="text-xs text-ink/60">Pulls fresh data from Yahoo Finance for all US stocks. Auto-runs daily at 6am Lagos time.</p>
            </div>
            <RefreshUSButton />
          </div>
        </div>

        {stalest > 5 && (
          <div className="card-soft p-4 mb-5 bg-coral-300/20 border-l-4 border-coral-400 flex items-center gap-3">
            <AlertTriangle className="text-coral-500 shrink-0" size={20}/>
            <p className="text-sm">Some NGX prices are <strong>{Math.floor(stalest)} days</strong> old. Users may see stale data.</p>
          </div>
        )}

        {/* Section heading for NGX section */}
        <div className="mb-3">
          <h2 className="font-display text-2xl font-bold">🇳🇬 Nigerian stocks (manual updates)</h2>
          <p className="text-xs text-ink/55">Update prices daily, fundamentals quarterly.</p>
        </div>

        {/* NGX AI reference-data refresh — no free live NGX feed exists */}
        <div className="card-soft p-4 mb-5 bg-sun-100/60 border-l-4 border-sun-400">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="min-w-0">
              <p className="font-bold text-sm">🇳🇬 Refresh NGX live data</p>
              <p className="text-xs text-ink/60 max-w-xl">
                Pulls real prices, market caps and sectors from the NGX feed, then recomputes returns,
                volatility and 52-week range from actual trade history (takes ~3 min in the background).
                P/E and dividend yield aren't available on the free plan — leave them blank or enter
                verified figures in Deep edit below.
              </p>
            </div>
            <RefreshNGXButton onDone={load} />
          </div>
        </div>

        {/* Destructive: clean slate for paper trading */}
        <ResetSimulatorPanel />

        {/* NGX data sources */}
        <div className="card-soft p-4 mb-5">
          <p className="text-xs font-bold uppercase tracking-wider text-ink/55 mb-2">Where to find NGX data</p>
          <div className="flex flex-wrap gap-2">
            <ExtLink href="https://ngxgroup.com/exchange/data/equities-price-list/">NGX official daily prices</ExtLink>
            <ExtLink href="https://www.investorsking.com/category/markets/">Investors King</ExtLink>
            <ExtLink href="https://www.proshareng.com/markets/equity">Proshare equity reports</ExtLink>
            <ExtLink href="https://simplywall.st/">Simply Wall St (fundamentals)</ExtLink>
          </div>
        </div>

        {/* Bulk price update */}
        <div className="card-soft p-5 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="font-display text-xl font-bold">Quick daily price update</h2>
              <p className="text-xs text-ink/55">Type the closing price next to each stock, then save all at once.</p>
            </div>
            <button onClick={saveAllPrices} disabled={savingBulk}
              className="btn-primary text-sm disabled:opacity-60">
              {savingBulk ? <><Loader2 size={14} className="animate-spin"/> Saving…</> : <><Save size={14}/> Save all prices</>}
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="h-10 bg-ink/5 rounded animate-pulse"/>)}</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {stocks.map((s) => (
                <div key={s.symbol} className="flex items-center gap-2 p-2 hover:bg-cream-warm rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono font-bold text-sm">{s.display_symbol || s.symbol}</p>
                    <p className="text-[10px] text-ink/50 truncate">{s.name}</p>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={bulkPrices[s.symbol] ?? ''}
                    onChange={(e) => setBulkPrices({ ...bulkPrices, [s.symbol]: e.target.value })}
                    placeholder="₦"
                    className="w-24 px-2 py-1 rounded border-2 border-ink/10 focus:border-ink/30 text-sm font-mono font-bold text-ink outline-none bg-white"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Per-stock deep edit */}
        <div className="card-soft p-5">
          <h2 className="font-display text-xl font-bold mb-1">Deep edit (fundamentals)</h2>
          <p className="text-xs text-ink/55 mb-4">Update P/E, ROE, margins, growth — typically once per quarter after earnings.</p>

          <div className="space-y-2">
            {stocks.map((s) => (
              <StockExpandable
                key={s.symbol}
                stock={s}
                expanded={expanded === s.symbol}
                onToggle={() => setExpanded(expanded === s.symbol ? null : s.symbol)}
                onSaved={load}
              />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function RefreshUSButton() {
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!confirm('Refresh all US stocks from Yahoo Finance? This takes about 1 minute.')) return;
    setLoading(true);
    try {
      const { data } = await api.post('/admin/stocks/refresh-us');
      if (data.success) {
        toast.success(`Updated ${data.succeeded}/${data.total} stocks in ${data.duration_seconds}s`);
        setTimeout(() => window.location.reload(), 800);
      } else {
        toast.error(data.error || 'Refresh failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Refresh failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={refresh} disabled={loading}
      className="btn-primary text-sm disabled:opacity-60 inline-flex items-center gap-1.5">
      {loading
        ? <><Loader2 size={14} className="animate-spin"/> Refreshing… ~1 min</>
        : <><RefreshCw size={14}/> Refresh all US stocks now</>
      }
    </button>
  );
}

// Wiping every user's paper portfolio is irreversible, so the button stays
// disabled until the admin types RESET. Needed because trades used to fill at
// mock prices, making all existing positions and P&L meaningless.
function ResetSimulatorPanel() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/admin/simulator/reset', { confirm: 'RESET' });
      if (data.success) {
        setResult(data);
        toast.success(`Reset ${data.users_reset} users to $${Number(data.starting_balance).toLocaleString()}`);
        setConfirm('');
        setOpen(false);
      } else {
        toast.error(data.message || 'Reset failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-soft p-4 mb-5 bg-coral-300/15 border-l-4 border-coral-400">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <p className="font-bold text-sm flex items-center gap-1.5">
            <AlertTriangle size={15} className="text-coral-500" /> Reset paper trading
          </p>
          <p className="text-xs text-ink/60 max-w-xl mt-0.5">
            Trades used to fill at mock prices (AAPL at ~$178 while the market was ~$333), so every
            existing position and P&amp;L is wrong. This deletes all portfolios and trade history and
            gives every user a clean $100,000. <strong className="text-ink">It cannot be undone.</strong>
          </p>
          {result && (
            <p className="text-xs text-bull-700 font-semibold mt-2">
              ✅ Cleared {result.positions_cleared} positions and {result.trades_cleared} trades ·
              {' '}{result.users_reset} users reset.
            </p>
          )}
        </div>
        {!open ? (
          <button onClick={() => setOpen(true)} className="btn-ghost text-sm shrink-0 border-coral-400/50">
            Reset simulator…
          </button>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.toUpperCase())}
              placeholder="Type RESET"
              className="w-32 px-2 py-1.5 rounded border-2 border-coral-400/40 focus:border-coral-500 text-sm font-mono font-bold outline-none bg-white"
            />
            <button
              onClick={run}
              disabled={confirm !== 'RESET' || loading}
              className="btn-primary text-sm bg-bear-500 hover:bg-bear-600 disabled:opacity-40"
            >
              {loading ? <><Loader2 size={14} className="animate-spin" /> Resetting…</> : 'Confirm reset'}
            </button>
            <button onClick={() => { setOpen(false); setConfirm(''); }} className="text-xs text-ink/50 hover:text-ink">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function RefreshNGXButton({ onDone }) {
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!confirm('Refresh NGX prices from the live feed? Returns and volatility recompute in the background (~3 min).')) return;
    setLoading(true);
    try {
      const { data } = await api.post('/admin/stocks/refresh-ngx');
      if (data.success) {
        toast.success(`Updated ${data.updated}/${data.total} NGX prices · history recomputing`);
        onDone?.();
      } else {
        toast.error(data.message || 'Refresh failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Refresh failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={refresh} disabled={loading}
      className="btn-primary text-sm disabled:opacity-60 inline-flex items-center gap-1.5">
      {loading
        ? <><Loader2 size={14} className="animate-spin"/> Filling… ~30s</>
        : <><RefreshCw size={14}/> Fill with AI</>
      }
    </button>
  );
}

function StockExpandable({ stock, expanded, onToggle, onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (expanded) {
      const initial = {};
      FIELD_GROUPS.forEach((g) => g.fields.forEach((f) => {
        initial[f.key] = stock[f.key] ?? '';
      }));
      setForm(initial);
    }
  }, [expanded, stock]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {};
      Object.entries(form).forEach(([k, v]) => {
        if (v === '' && stock[k] === null) return;
        if (v === '' || v === null) payload[k] = null;
        else if (parseFloat(v) !== parseFloat(stock[k] ?? NaN)) payload[k] = v;
      });
      if (Object.keys(payload).length === 0) {
        toast('No changes to save', { icon: 'ℹ️' });
        setSaving(false);
        return;
      }
      const { data } = await api.patch(`/admin/stocks/${stock.symbol}`, payload);
      if (data.success) {
        toast.success(`${stock.symbol} updated`);
        onSaved();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="border border-ink/5 rounded-xl overflow-hidden">
      <button onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-cream-warm transition text-left">
        <div className="flex items-center gap-3">
          <div className="font-mono font-bold">{stock.display_symbol || stock.symbol}</div>
          <div className="text-sm text-ink/65 truncate">{stock.name}</div>
          <span className="text-xs text-ink/50 hidden sm:inline">P/E: {stock.pe_ratio ?? '—'} · ROE: {stock.roe ? (stock.roe * 100).toFixed(1) + '%' : '—'}</span>
        </div>
        {expanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
      </button>

      {expanded && (
        <div className="p-4 bg-cream-warm border-t border-ink/5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
            {FIELD_GROUPS.map((group) => (
              <div key={group.title} className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-coral-500">{group.title}</p>
                {group.note && <p className="text-[10px] text-ink/50 leading-snug -mt-1">{group.note}</p>}
                {group.fields.map((f) => (
                  <label key={f.key} className="block">
                    <span className="text-xs font-semibold text-ink/70 block mb-0.5">
                      {f.label}
                      {f.derived && (
                        <span className="ml-1 font-normal text-[10px] text-bull-600">· auto ({f.derived})</span>
                      )}
                    </span>
                    <input
                      type="number" step={f.step}
                      value={form[f.key] ?? ''}
                      readOnly={Boolean(f.derived)}
                      title={f.derived ? `Calculated automatically: ${f.derived}. Enter EPS or dividend/share instead.` : undefined}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      placeholder="—"
                      className={`w-full px-2 py-1.5 rounded border-2 text-sm font-mono font-semibold outline-none ${
                        f.derived
                          ? 'border-ink/5 bg-cream-warm text-ink/55 cursor-not-allowed'
                          : 'border-ink/10 focus:border-ink/30 text-ink bg-white'
                      }`}
                    />
                  </label>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={save} disabled={saving} className="btn-primary text-sm disabled:opacity-60">
              {saving ? <><Loader2 size={14} className="animate-spin"/> Saving…</> : <><Save size={14}/> Save changes</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ExtLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-ink text-cream text-xs font-bold hover:bg-ink-soft transition">
      {children} <ExternalLink size={11}/>
    </a>
  );
}
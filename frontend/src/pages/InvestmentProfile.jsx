import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, ChevronDown, Check, Radar } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import PremiumShell, { BarsMotif } from '../components/ui/PremiumShell';
import api from '../services/api';

// ============================================================
// InvestmentProfile — the user's strategy, market, risk and optional
// preferences (spec §3). Kept short: three quick choices up front, the rest
// folded away. The Scout ranks candidates with these; open to free users too.
// ============================================================

const ACCENT = '#E8B04B';

const STRATEGIES = [
  { id: 'swing', t: 'Swing trader', d: 'Hold for days to weeks, trading setups.' },
  { id: 'longterm', t: 'Long-term investor', d: 'Hold quality businesses for years.' },
];
const MARKETS = [
  { id: 'US', t: 'US stocks' },
  { id: 'NG', t: 'NGX stocks' },
  { id: 'BOTH', t: 'Both' },
];
const RISKS = [
  { id: 'conservative', t: 'Conservative', d: 'Steadier stocks, smaller price swings.' },
  { id: 'moderate', t: 'Moderate', d: 'A balance of growth and stability.' },
  { id: 'aggressive', t: 'Aggressive', d: 'Accepts bigger swings for bigger potential moves.' },
];
const STYLES = [
  { id: 'growth', t: 'Growth' },
  { id: 'value', t: 'Value' },
  { id: 'dividend', t: 'Dividend' },
  { id: 'momentum', t: 'Momentum' },
];
const HOLDING = [
  { id: 'days', t: 'Days' },
  { id: 'weeks', t: 'Weeks' },
  { id: 'months', t: 'Months' },
  { id: 'years', t: 'Years' },
];
const SIZES = [
  { id: 'any', t: 'Any size' },
  { id: 'mid_and_up', t: 'Mid and large' },
  { id: 'large', t: 'Large only' },
];

const writeLS = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

export default function InvestmentProfile() {
  const [loaded, setLoaded] = useState(false);
  const [sectors, setSectors] = useState([]);
  const [more, setMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [p, setP] = useState({
    objective: 'swing', market: 'BOTH', risk: 'moderate',
    styles: [], sectors: [], holding_period: null, company_size: 'any',
  });

  useEffect(() => {
    api.get('/users/objective')
      .then(({ data }) => {
        if (!data?.success) return;
        const ip = data.investor_profile || {};
        setSectors(data.sectors || []);
        setP({
          objective: data.objective === 'longterm' ? 'longterm' : 'swing',
          market: data.preferred_market || 'BOTH',
          risk: data.risk_tolerance || 'moderate',
          styles: ip.styles || [],
          sectors: ip.sectors || [],
          holding_period: ip.holding_period || null,
          company_size: ip.company_size || 'any',
        });
        // Open the optional section if they've already used it.
        if ((ip.styles?.length || ip.sectors?.length || ip.holding_period)) setMore(true);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const set = (k, v) => setP((s) => ({ ...s, [k]: v }));
  const toggleIn = (k, v) => setP((s) => ({ ...s, [k]: s[k].includes(v) ? s[k].filter((x) => x !== v) : [...s[k], v] }));

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch('/users/objective', {
        objective: p.objective,
        preferred_market: p.market === 'BOTH' ? null : p.market,
        risk_tolerance: p.risk,
        investor_profile: {
          styles: p.styles, sectors: p.sectors,
          ...(p.holding_period ? { holding_period: p.holding_period } : {}),
          company_size: p.company_size,
        },
      });
      if (data.success) {
        // Keep the Scout's remembered choices in step with the saved profile.
        writeLS('sa_objective', p.objective);
        writeLS('sa_market', p.market === 'BOTH' ? 'ALL' : p.market);
        toast.success('Profile saved. The Scout will rank with it.');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save your profile.');
    } finally { setSaving(false); }
  };

  return (
    <Layout>
      <PremiumShell
        icon={SlidersHorizontal} accentColor={ACCENT}
        eyebrow="Your investment profile"
        title="How do you" accent="invest?"
        subtitle="Three quick choices. StockAcademia uses them to rank opportunities and to explain who each one suits. You can change them any time."
        motif={<BarsMotif color={ACCENT} />}
      >
        {!loaded ? (
          <div className="psh-card" style={{ textAlign: 'center', padding: 34 }}><span className="psh-spin" style={{ width: 24, height: 24, borderColor: 'var(--line2)', borderTopColor: 'var(--accent)' }} /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <Group label="1 · Your strategy">
              <div className="psh-seg grid-cols-1 sm:grid-cols-2" style={{ display: 'grid' }}>
                {STRATEGIES.map((o) => (
                  <button key={o.id} type="button" onClick={() => set('objective', o.id)} className={`psh-seg-item ${p.objective === o.id ? 'is-active' : ''}`} aria-pressed={p.objective === o.id}>
                    <span className="psh-seg-t">{o.t}</span><span className="psh-seg-d">{o.d}</span>
                  </button>
                ))}
              </div>
            </Group>

            <Group label="2 · Your market">
              <div className="flex gap-2 flex-wrap">
                {MARKETS.map((o) => (
                  <button key={o.id} type="button" onClick={() => set('market', o.id)} className={`psh-toggle ${p.market === o.id ? 'is-on' : ''}`} aria-pressed={p.market === o.id}>{o.t}</button>
                ))}
              </div>
            </Group>

            <Group label="3 · Your risk tolerance">
              <div className="psh-seg grid-cols-1 sm:grid-cols-3" style={{ display: 'grid' }}>
                {RISKS.map((o) => (
                  <button key={o.id} type="button" onClick={() => set('risk', o.id)} className={`psh-seg-item ${p.risk === o.id ? 'is-active' : ''}`} aria-pressed={p.risk === o.id}>
                    <span className="psh-seg-t">{o.t}</span><span className="psh-seg-d">{o.d}</span>
                  </button>
                ))}
              </div>
            </Group>

            <div>
              <button type="button" onClick={() => setMore((m) => !m)} className="psh-link-gold" aria-expanded={more}
                style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                More preferences (optional) <ChevronDown size={14} style={{ transform: more ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
              </button>
              <AnimatePresence>
                {more && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                    <div className="psh-card psh-card-2" style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 18 }}>
                      <Group label="Investing style (pick any)">
                        <Chips items={STYLES} isOn={(id) => p.styles.includes(id)} onToggle={(id) => toggleIn('styles', id)} />
                      </Group>
                      <Group label="Usual holding period">
                        <Chips items={HOLDING} isOn={(id) => p.holding_period === id} onToggle={(id) => set('holding_period', p.holding_period === id ? null : id)} />
                      </Group>
                      <Group label="Company size" hint="Compared within each market, so NGX and US companies are each judged against their own market.">
                        <Chips items={SIZES} isOn={(id) => p.company_size === id} onToggle={(id) => set('company_size', id)} />
                      </Group>
                      {sectors.length > 0 && (
                        <Group label="Preferred sectors (pick any)" hint="These get a small boost in the rankings. Other sectors still appear.">
                          <Chips items={sectors.map((s) => ({ id: s, t: s }))} isOn={(id) => p.sectors.includes(id)} onToggle={(id) => toggleIn('sectors', id)} />
                        </Group>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button type="button" className="psh-btn" onClick={save} disabled={saving}>
                {saving ? <span className="psh-spin" /> : <Check size={16} />}{saving ? 'Saving…' : 'Save profile'}
              </button>
              <Link to="/scout" className="psh-link" style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 5 }}><Radar size={14} /> Open the Scout</Link>
            </div>
            <p className="psh-faint" style={{ fontSize: 11.5, lineHeight: 1.5 }}>
              How it's used: the Scout ranks candidates using your strategy, risk and styles. A conservative profile leaves out the most volatile stocks. Your profile shapes the analysis; it isn't a recommendation to buy anything.
            </p>
          </div>
        )}
      </PremiumShell>
    </Layout>
  );
}

function Group({ label, hint, children }) {
  return (
    <div>
      <p className="psh-label" style={{ marginBottom: 8 }}>{label}</p>
      {children}
      {hint && <p className="psh-faint" style={{ fontSize: 11, marginTop: 6 }}>{hint}</p>}
    </div>
  );
}

function Chips({ items, isOn, onToggle }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {items.map((o) => (
        <button key={o.id} type="button" onClick={() => onToggle(o.id)} className={`psh-toggle ${isOn(o.id) ? 'is-on' : ''}`} aria-pressed={isOn(o.id)}>{o.t}</button>
      ))}
    </div>
  );
}

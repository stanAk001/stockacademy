import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Lock, ArrowRight } from 'lucide-react';
import api from '../../services/api';
import { track } from '../../lib/analytics';

// ============================================================
// UsageMeter + UpgradeNudge — surface the server-side Free→Premium metering.
//
// UsageMeter: shows a Free user how much of a tool's monthly allowance is left
//   (from GET /ai/usage) with a link to upgrade. Renders NOTHING for Premium
//   users and nothing while loading — it's a quiet nudge, not a wall.
// UpgradeNudge: the soft wall shown when a metered call returns 402 (allowance
//   used up). Both live on the dark PremiumShell surface (`.psh-*` classes).
//
// Usage:
//   <UsageMeter feature="ai_comparison" refreshKey={runs} />   // top of a tool
//   {upgrade && <UpgradeNudge message={upgrade} />}            // after a 402
//   // detect the 402 in your catch: isUpgradeError(err) → err.response.data.message
// ============================================================

export function isUpgradeError(err) {
  return err?.response?.status === 402 && err?.response?.data?.upgrade;
}

// Shared fetch — cheap, no AI. `refreshKey` re-pulls after a use is consumed.
function useUsage(feature, refreshKey) {
  const [state, setState] = useState({ loading: true, premium: false, f: null });
  useEffect(() => {
    let alive = true;
    api.get('/ai/usage')
      .then(({ data }) => {
        if (!alive || !data?.success) return;
        setState({ loading: false, premium: !!data.premium, f: data.features?.[feature] || null });
      })
      .catch(() => { if (alive) setState({ loading: false, premium: false, f: null }); });
    return () => { alive = false; };
  }, [feature, refreshKey]);
  return state;
}

export function UsageMeter({ feature, refreshKey }) {
  const { loading, premium, f } = useUsage(feature, refreshKey);
  if (loading || premium || !f || f.limit == null) return null;

  const used = Math.min(f.used, f.limit);
  const remaining = Math.max(0, f.limit - used);
  const pct = f.limit ? Math.min(100, (used / f.limit) * 100) : 0;
  const out = remaining <= 0;
  const per = f.period === 'day' ? 'today' : f.period === 'total' ? 'on the free plan' : 'this month';

  return (
    <div className="psh-card psh-card-2" style={{ padding: '13px 16px', marginBottom: 16, borderColor: out ? 'var(--accent)' : 'var(--line)' }}>
      <div className="flex items-center justify-between gap-3" style={{ flexWrap: 'wrap' }}>
        <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
          <Sparkles size={15} className="psh-gold" style={{ flex: 'none' }} />
          <p className="psh-t" style={{ fontSize: 13, fontWeight: 600 }}>
            {out
              ? <>No free {f.label} left {per}.</>
              : <><span className="psh-gold">{remaining}</span> of {f.limit} free {f.label} left {per}.</>}
          </p>
        </div>
        <Link to="/pricing" onClick={() => track('upgrade_clicked', { surface: 'usage_meter', feature })} className="psh-link-gold" style={{ fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          Unlock unlimited <ArrowRight size={13} />
        </Link>
      </div>
      <div className="psh-meter-track" style={{ marginTop: 10 }}>
        <span className="psh-meter-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function UpgradeNudge({ message }) {
  return (
    <div className="psh-card" style={{ marginTop: 16, textAlign: 'center', padding: '32px 24px', border: '1.5px solid var(--accent)', background: 'var(--raise)' }}>
      <div className="psh-ico" style={{ margin: '0 auto 14px' }}><Lock size={19} /></div>
      <h3 className="psh-serif psh-t" style={{ fontSize: '1.35rem', fontWeight: 600 }}>You’ve used your free preview</h3>
      <p className="psh-muted" style={{ fontSize: 13.5, margin: '8px auto 18px', maxWidth: 380, lineHeight: 1.5 }}>
        {message || 'Upgrade to Premium for unlimited AI analysis, continuous monitoring, and intelligent alerts.'}
      </p>
      <Link to="/pricing" onClick={() => track('upgrade_clicked', { surface: 'limit_wall' })} className="psh-btn" style={{ textDecoration: 'none' }}>Upgrade to Premium <ArrowRight size={15} /></Link>
    </div>
  );
}

export default UsageMeter;

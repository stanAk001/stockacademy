import { useEffect, useState } from 'react';
import api from '../services/api';
import PremiumShowcase from './PremiumShowcase';

// ============================================================
// PremiumValue — the non-subscriber upsell. A thin, geo-aware wrapper around
// PremiumShowcase (upgrade mode): the hero + category tabs + rich feature cards
// + gold CTA banner. Shared by the Dashboard (free-user upsell) and Pricing.
// Geo-aware pricing (₦ for Nigeria, $ elsewhere) feeds the CTA line.
// `showPricing` surfaces the price in the banner (dashboard); the Pricing page
// hides it because its plan cards handle the purchase.
// ============================================================
const DATA = {
  NGN: { mo: '₦3,500', yr: '₦33,000' },
  USD: { mo: '$10', yr: '$96' },
};

export default function PremiumValue({
  currency,
  showPricing = false,
  ctaTo = '/pricing',
  ctaLabel = 'Get Premium',
}) {
  const [detected, setDetected] = useState('NGN');
  useEffect(() => {
    if (currency) return;
    api.get('/geo')
      .then(({ data }) => { if (data?.success) setDetected(data.country === 'NG' ? 'NGN' : 'USD'); })
      .catch(() => {});
  }, [currency]);

  const cur = currency === 'USD' || currency === 'NGN' ? currency : detected;
  const d = DATA[cur];

  return (
    <PremiumShowcase
      mode="upgrade"
      price={showPricing ? d : null}
      ctaTo={ctaTo}
      ctaLabel={ctaLabel}
    />
  );
}

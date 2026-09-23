import { useAuth } from '../context/AuthContext';
import PremiumValue from './PremiumValue';
import TradingDesk from './TradingDesk';
import FreeAiTools from './FreeAiTools';

// The premium block on the dashboard.
//   Non-subscribers → their free AI tools (with live allowances), then the
//                     persuasive showcase (with Upgrade CTAs).
//   Members         → the Trading Desk (their dark premium toolkit).
export default function PremiumTools() {
  const { user } = useAuth();
  const isPremium = user?.plan === 'premium';

  if (!isPremium) {
    return (
      <div className="mb-8 sm:mb-10">
        <FreeAiTools />
        <PremiumValue showPricing />
      </div>
    );
  }

  return (
    <div className="mb-10">
      <TradingDesk />
    </div>
  );
}

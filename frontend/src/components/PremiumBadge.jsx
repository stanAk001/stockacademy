import { BadgeCheck } from 'lucide-react';

// Gold ring class for a premium member's avatar.
export const premiumRing = (plan) =>
  plan === 'premium' ? 'ring-2 ring-sun-300 ring-offset-2 ring-offset-cream' : '';

// Verified-style badge marking Premium members — a gold seal with a check,
// the same visual language people already trust from social platforms.
export default function PremiumBadge({ plan, size = 16, className = '' }) {
  if (plan !== 'premium') return null;
  return (
    <span title="Premium member" aria-label="Premium member" className={`inline-flex shrink-0 ${className}`}>
      <BadgeCheck size={size} strokeWidth={2.25} className="fill-sun-300 text-ink" />
    </span>
  );
}

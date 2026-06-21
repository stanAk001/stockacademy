import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';

// Shared "this is a Premium feature" gate. Clean card, solid ink badge,
// no gradients/glows.
export default function PremiumLock({ icon: Icon = Sparkles, title, message }) {
  return (
    <div className="card-soft p-7 sm:p-10 text-center max-w-lg mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-ink grid place-items-center mx-auto mb-4">
        <Icon className="text-sun-300" size={26} />
      </div>
      <h2 className="font-display text-xl sm:text-2xl font-black mb-2 break-words">{title}</h2>
      <p className="text-ink/60 text-sm mb-6 break-words max-w-sm mx-auto leading-relaxed">{message}</p>
      <Link to="/pricing" className="btn-primary bg-ink">
        <Sparkles size={15} /> Get Premium <ArrowRight size={15} />
      </Link>
    </div>
  );
}

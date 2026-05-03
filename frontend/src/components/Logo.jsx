import { Link } from 'react-router-dom';

export default function Logo({ size = 'md', className = '' }) {
  const sizes = {
    sm: { box: 'w-8 h-8', text: 'text-lg', stroke: 4 },
    md: { box: 'w-10 h-10', text: 'text-xl', stroke: 5 },
    lg: { box: 'w-14 h-14', text: 'text-3xl', stroke: 5 },
  };
  const s = sizes[size];
  return (
    <Link to="/" className={`flex items-center gap-2.5 group ${className}`}>
      <div className={`${s.box} rounded-xl bg-ink grid place-items-center overflow-hidden relative`}>
        <svg viewBox="0 0 64 64" className="w-3/4 h-3/4">
          <path
            d="M10 48 L22 32 L32 38 L44 18 L54 24"
            stroke="#FBBF24"
            strokeWidth={s.stroke}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="group-hover:stroke-sun-300 transition"
          />
          <circle cx="54" cy="24" r="4" fill="#10B981" />
        </svg>
      </div>
      <span className={`font-display font-black ${s.text} tracking-tight`}>
        Stock<span className="italic font-semibold text-bull-600">Academy</span>
      </span>
    </Link>
  );
}

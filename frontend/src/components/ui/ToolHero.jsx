// ToolHero — shared premium-page header. Clean and crisp: a solid ink icon
// badge, an eyebrow, a serif headline with an accent word, and a subtitle.
// No gradients/glows — the strength comes from type + the solid badge.
export default function ToolHero({
  icon: Icon,
  eyebrow,
  title,
  accent,
  accentColor = 'text-coral-500',
  subtitle,
  children,
}) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-11 min-w-0">
      <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-ink mb-4">
        {Icon && <Icon className="text-sun-300" size={26} />}
      </div>
      {eyebrow && (
        <p className="text-[11px] sm:text-xs font-black uppercase tracking-[0.15em] text-coral-500 mb-2">{eyebrow}</p>
      )}
      <h1 className="font-display text-[1.8rem] leading-[1.08] sm:text-4xl lg:text-5xl sm:leading-tight font-black mb-2.5 break-words">
        {title}{accent ? <> <span className={`italic ${accentColor}`}>{accent}</span></> : null}
      </h1>
      {subtitle && (
        <p className="text-ink/65 text-[13px] sm:text-lg break-words leading-relaxed">{subtitle}</p>
      )}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

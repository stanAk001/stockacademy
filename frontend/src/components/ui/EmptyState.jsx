import { Link } from 'react-router-dom';

// Shared empty-state block for consistent "nothing here yet" moments app-wide.
// Pass `action` for a simple Link CTA, or `children` for a custom control
// (e.g. a button that opens a modal).
export default function EmptyState({ icon: Icon, title, message, action, children }) {
  return (
    <div className="card-soft p-8 sm:p-10 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-cream-warm grid place-items-center mx-auto mb-4">
          <Icon className="text-ink/40" size={26} />
        </div>
      )}
      <h3 className="font-display text-lg sm:text-xl font-black break-words">{title}</h3>
      {message && (
        <p className="text-sm text-ink/55 mt-1.5 max-w-sm mx-auto break-words leading-relaxed">{message}</p>
      )}
      {action?.to && (
        <Link to={action.to} className="btn-primary bg-ink mt-5 inline-flex">{action.label}</Link>
      )}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

// Lightweight skeleton primitives for loading states (shared, app-wide).
export function Skeleton({ className = '' }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

// A ready-made "result loading" block for the AI pages.
export function ResultSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <Skeleton className="h-24 w-full" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-5/6" />
    </div>
  );
}

export default Skeleton;

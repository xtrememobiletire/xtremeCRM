interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export function TableSkeleton({ rows = 6, cols = 5 }: TableSkeletonProps) {
  return (
    <div className="w-full card-surface overflow-hidden animate-pulse">
      <div className="bg-slate-50/70 border-b border-slate-100 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3.5 bg-slate-200 rounded flex-1" />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-4 py-3 flex items-center gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className={`h-3.5 bg-slate-100 rounded ${
                  c === 0 ? 'w-1/4' : c === cols - 1 ? 'w-1/6' : 'flex-1'
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface CardSkeletonProps {
  count?: number;
}

export function CardSkeleton({ count = 4 }: CardSkeletonProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-surface p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-3 bg-slate-200 rounded w-24" />
            <div className="w-8 h-8 bg-slate-100 rounded-lg" />
          </div>
          <div className="h-7 bg-slate-200 rounded w-32" />
          <div className="h-3 bg-slate-100 rounded w-20" />
        </div>
      ))}
    </div>
  );
}

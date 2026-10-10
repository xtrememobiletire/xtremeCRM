import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
  className = '',
}: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages || 1);

  return (
    <div className={`flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200/90 rounded-b-xl select-none ${className}`}>
      <div className="text-xs text-slate-500 font-medium">
        {totalCount !== undefined ? (
          <span>
            Showing page <strong className="text-slate-800 font-bold">{currentPage}</strong> of{' '}
            <strong className="text-slate-800 font-bold">{safeTotalPages}</strong> ({totalCount} total records)
          </span>
        ) : (
          <span>
            Page <strong className="text-slate-800 font-bold">{currentPage}</strong> of{' '}
            <strong className="text-slate-800 font-bold">{safeTotalPages}</strong>
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="btn-secondary px-2.5 py-1 text-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1"
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Prev</span>
        </button>
        <span className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-50 rounded-md border border-slate-200 font-mono">
          {currentPage} / {safeTotalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= safeTotalPages}
          className="btn-secondary px-2.5 py-1 text-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1"
          aria-label="Next Page"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

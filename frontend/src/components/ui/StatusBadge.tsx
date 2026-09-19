const STATUS_CONFIGS: Record<string, { label: string; bg: string; text: string; border: string }> = {
  // Job Statuses
  PENDING: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  DISPATCHED: { label: 'Dispatched', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  EN_ROUTE: { label: 'En Route', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  ON_SCENE: { label: 'On Scene', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  COMPLETED: { label: 'Completed', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },

  // Urgency
  CRITICAL: { label: 'Critical', bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300' },
  HIGH: { label: 'High', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  NORMAL: { label: 'Normal', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  LOW: { label: 'Low', bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200' },

  // Driver Statuses
  AVAILABLE: { label: 'Available', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  BUSY: { label: 'Busy', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  OFFLINE: { label: 'Offline', bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200' },

  // Payment Statuses
  PAID: { label: 'Paid', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  UNPAID: { label: 'Unpaid', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  PARTIAL: { label: 'Partial', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },

  // Presence
  ACTIVE: { label: 'Active', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  INACTIVE: { label: 'Inactive', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
  BREAK: { label: 'On Break', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export default function StatusBadge({ status, label, className = '' }: StatusBadgeProps) {
  const normalized = String(status || '').toUpperCase().trim();
  const config = STATUS_CONFIGS[normalized] || {
    label: label || status || 'Unknown',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${config.bg} ${config.text} ${config.border} ${className}`}>
      {label || config.label}
    </span>
  );
}

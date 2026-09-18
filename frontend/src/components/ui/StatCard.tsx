import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  subtitleColor?: string;
  icon?: LucideIcon;
  iconBg?: string;
  iconColor?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  subtitleColor = 'text-slate-500',
  icon: Icon,
  iconBg = 'bg-red-50',
  iconColor = 'text-red-600',
}: StatCardProps) {
  return (
    <div className="card-surface p-4 sm:p-5 flex items-center gap-3.5">
      {Icon && (
        <div className={`p-3 rounded-xl shrink-0 ${iconBg} ${iconColor}`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">{title}</p>
        <h3 className="text-xl sm:text-2xl font-mono font-black text-slate-900 mt-0.5 tracking-tight">{value}</h3>
        {subtitle && <p className={`text-xs font-medium mt-0.5 ${subtitleColor}`}>{subtitle}</p>}
      </div>
    </div>
  );
}

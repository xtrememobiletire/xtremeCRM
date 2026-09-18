import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface CardProps {
  title?: string;
  icon?: LucideIcon;
  iconColor?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export default function Card({
  title,
  icon: Icon,
  iconColor = 'text-red-600',
  children,
  className = '',
  action,
}: CardProps) {
  return (
    <div className={`card-surface p-4 sm:p-5 ${className}`}>
      {(title || Icon || action) && (
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2.5 font-bold text-slate-800 text-sm sm:text-base">
            {Icon && <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor}`} />}
            <span>{title}</span>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

import React from 'react';

const styles: Record<string, string> = {
  brand: 'bg-red-50 text-red-700 border-red-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  sky: 'bg-sky-50 text-sky-700 border-sky-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-rose-50 text-rose-700 border-rose-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: keyof typeof styles;
  className?: string;
}

export default function Badge({ children, variant = 'slate', className = '' }: BadgeProps) {
  const badgeStyle = styles[variant] || styles.slate;
  return (
    <span className={`inline-flex items-center border text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${badgeStyle} ${className}`}>
      {children}
    </span>
  );
}

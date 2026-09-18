interface LoadingProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Loading({ text, size = 'md', className = '' }: LoadingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-7 h-7 border-3',
    lg: 'w-10 h-10 border-4',
  };

  return (
    <div className={`flex flex-col items-center justify-center p-6 gap-3 ${className}`}>
      <div className={`${sizeClasses[size]} border-slate-200 border-t-red-600 rounded-full animate-spin`} />
      {text && <p className="text-xs font-medium text-slate-500">{text}</p>}
    </div>
  );
}

"use client";

interface SplitPillButtonProps {
  label: string;
  href?: string;
  onClick?: () => void;
  theme?: "white-crimson" | "black-crimson";
  arrowDirection?: "up-right" | "down-right";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function SplitPillButton({
  label,
  href,
  onClick,
  theme = "white-crimson",
  arrowDirection = "up-right",
  size = "md",
  className = "",
}: SplitPillButtonProps) {
  const isWhite = theme === "white-crimson";

  const sizeClasses = {
    sm: {
      container: "text-xs",
      label: "pl-3.5 pr-2.5 py-1.5",
      badge: "px-2",
      icon: "w-3 h-3",
    },
    md: {
      container: "text-xs sm:text-sm",
      label: "pl-4 pr-3 py-1.5 sm:py-2",
      badge: "px-2.5 sm:px-3",
      icon: "w-3.5 h-3.5",
    },
    lg: {
      container: "text-sm sm:text-base",
      label: "pl-6 pr-4 py-2.5 sm:py-3",
      badge: "px-3.5 sm:px-4",
      icon: "w-4 h-4",
    },
  }[size];

  const content = (
    <span
      className={`group relative inline-flex items-stretch rounded-none overflow-hidden shadow-md hover:shadow-xl transition-all duration-200 select-none ${
        isWhite
          ? "bg-white text-zinc-950 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
          : "bg-black text-white focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
      } ${sizeClasses.container} ${className}`}
    >
      {/* Left text block */}
      <span className={`flex items-center font-bold tracking-tight whitespace-nowrap ${sizeClasses.label}`}>
        {label}
      </span>

      {/* Right Crimson Red block with diagonal arrow */}
      <span className={`flex items-center justify-center bg-[var(--brand-primary)] text-white group-hover:bg-[var(--brand-secondary)] transition-colors ${sizeClasses.badge}`}>
        <svg
          className={`${sizeClasses.icon} stroke-[2.5] transition-transform duration-200 ${
            arrowDirection === "up-right"
              ? "group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:rotate-45"
              : "group-hover:translate-x-0.5 group-hover:translate-y-0.5"
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {arrowDirection === "up-right" ? (
            <>
              <path d="M7 17 17 7" />
              <path d="M7 7h10v10" />
            </>
          ) : (
            <>
              <path d="M7 7h10v10" />
              <path d="M7 7 17 17" />
            </>
          )}
        </svg>
      </span>
    </span>
  );

  if (href) {
    return (
      <a href={href} className="inline-block focus:outline-none">
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className="inline-block focus:outline-none">
      {content}
    </button>
  );
}

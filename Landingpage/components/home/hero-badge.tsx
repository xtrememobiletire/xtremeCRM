interface HeroBadgeProps {
  text?: string;
  href?: string;
}

export default function HeroBadge({
  text = "Now Available",
  href = "#booking",
}: HeroBadgeProps) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-white/90 border border-zinc-200/80 shadow-sm backdrop-blur-md mb-8 hover:border-[var(--brand-primary)] transition-all cursor-pointer group"
    >
      <span className="text-xs sm:text-[13px] font-medium text-zinc-700">
        {text}
      </span>
      <span className="text-xs sm:text-[13px] font-bold text-[var(--brand-primary)] group-hover:rotate-45 transition-transform duration-200">
        +
      </span>
    </a>
  );
}

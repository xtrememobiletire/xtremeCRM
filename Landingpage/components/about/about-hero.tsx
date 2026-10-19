"use client";

import HeroBadge from "@/components/home/hero-badge";
import SplitPillButton from "@/components/home/split-pill-button";

interface AboutHeroProps {
  badgeText?: string;
  badgeHref?: string;
  titleLine1?: string;
  titleItalic?: string;
  description?: string;
  ctaText?: string;
  ctaHref?: string;
}

export default function AboutHero({
  badgeText = "ABOUT XTREME MOBILE TIRE",
  badgeHref = "/booking",
  titleLine1 = "Welcome to",
  titleItalic = "Xtreme Mobile Tire.",
  description = "Fast, reliable on-site tire repair and replacement for everyday drivers and commercial fleets across the USA and Canada.",
  ctaText = "Book Now",
  ctaHref = "/booking",
}: AboutHeroProps) {
  return (
    <div className="relative w-full overflow-hidden flex flex-col items-center justify-center pt-8 sm:pt-14 lg:pt-18 pb-16 sm:pb-24 text-center bg-transparent dark:bg-black transition-colors select-none">
      
      {/* 
        ========================================================================
        RESPONSIVE LUXURY BACKDROP CANVAS (MEDIA BAY):
        - Light Mode: Clean white/natural container canvas with warm ambient glow.
        - Dark Mode: Deep pitch-black luxury canvas ready for future video/photo.
        ========================================================================
      */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {/* Soft Crimson Ambient Glow at top center */}
        <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-[850px] h-[500px] bg-gradient-to-b from-[var(--brand-light)]/70 dark:from-[var(--brand-primary)]/20 via-[var(--brand-light)]/20 dark:via-[var(--brand-primary)]/5 to-transparent blur-3xl rounded-full" />
        
        {/* Secondary subtle side ambient blooms */}
        <div className="absolute top-1/2 -left-40 -translate-y-1/2 w-96 h-96 bg-[var(--brand-light)]/40 dark:bg-[var(--brand-primary)]/10 blur-3xl rounded-full" />
        <div className="absolute top-1/2 -right-40 -translate-y-1/2 w-96 h-96 bg-[var(--brand-light)]/40 dark:bg-[var(--brand-primary)]/10 blur-3xl rounded-full" />

        {/* High-Tech Fine Micro-Grid Texture */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_75%_55%_at_50%_40%,#000_70%,transparent_100%)]" />

        {/* Bottom smooth fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-[var(--neutral-light)] dark:to-black" />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 flex flex-col items-center">
        
        {/* Top Announcement / Page Badge */}
        <HeroBadge text={badgeText} href={badgeHref} />

        {/* Stacked Two-Font Headline Matching Wireframe & Design Inspiration */}
        <h1 className="mt-4 text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-6 leading-[1.08] max-w-4xl">
          <span className="font-sans block sm:inline">
            {titleLine1}{" "}
          </span>
          <span className="font-serif italic font-normal text-[var(--brand-primary)] block sm:inline">
            {titleItalic}
          </span>
        </h1>

        {/* User-Specified Description Text */}
        <p className="max-w-xl sm:max-w-2xl mx-auto text-base sm:text-lg text-zinc-600 dark:text-zinc-300 mb-8 leading-relaxed font-normal">
          {description}
        </p>

        {/* Center CTA Button "Book Now" (Adaptive contrast in Light & Dark modes) */}
        <div className="flex flex-col items-center justify-center gap-2.5">
          {/* Light Theme: Black button with crimson arrow */}
          <div className="dark:hidden">
            <SplitPillButton
              label={ctaText}
              href={ctaHref}
              theme="black-crimson"
              arrowDirection="down-right"
              size="lg"
            />
          </div>
          {/* Dark Theme: White button with crimson arrow */}
          <div className="hidden dark:block">
            <SplitPillButton
              label={ctaText}
              href={ctaHref}
              theme="white-crimson"
              arrowDirection="down-right"
              size="lg"
            />
          </div>

          <span className="text-xs font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400 mt-2">
            Your Safety — Our Mission
          </span>
        </div>

      </div>

    </div>
  );
}

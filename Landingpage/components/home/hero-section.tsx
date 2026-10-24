"use client";

import HeroBadge from "./hero-badge";
import SplitPillButton from "./split-pill-button";
import HeroInteractiveHub from "./hero/hero-interactive-hub";

interface HeroSectionProps {
  badgeText?: string;
  badgeHref?: string;
  titleLine1?: string;
  titleItalic?: string;
  description?: string;
  ctaText?: string;
  ctaHref?: string;
}

export default function HeroSection({
  badgeText = "24/7 FLEET TIRE SUPPORT",
  badgeHref = "/booking",
  titleLine1 = "Reliable Mobile Tires.",
  titleItalic = "Anytime. Anywhere.",
  description = "The modern platform for commercial fleets and vehicle owners who need fast, professional on-site tire services wherever they operate — day or night.",
  ctaText = "Book Now",
  ctaHref = "/booking",
}: HeroSectionProps) {
  return (
    <div className="w-full flex flex-col items-center">
      
      {/* 
        HERO BANNER:
        Ambient crimson glow is strictly contained within this top hero banner only.
        The 6 cards below sit outside on the clean canvas.
      */}
      <section className="relative w-full overflow-hidden flex flex-col items-center justify-center pt-8 sm:pt-12 pb-14 sm:pb-18 text-center">
        {/* Soft Ambient Texture & Top Glow inside Hero Banner */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          {/* Subtle warm Crimson glow fading from the top */}
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-gradient-to-b from-[var(--brand-light)]/70 via-transparent to-transparent blur-3xl rounded-full" />
          {/* Fine horizontal scanline/dot matrix pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
          {/* Bottom fade out */}
          <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-b from-transparent to-[var(--neutral-light)] dark:to-black" />
        </div>

        <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 flex flex-col items-center">
          {/* "24/7 FLEET TIRE SUPPORT" Pill Badge */}
          <HeroBadge text={badgeText} href={badgeHref} />

          {/* Main Title: 3 words + Anytime. Anywhere. */}
          <h1 className="mt-5 text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[var(--neutral-dark)] mb-5 leading-[1.08] max-w-4xl">
            {titleLine1} <br />
            <span className="font-serif italic font-normal text-[var(--brand-primary)]">
              {titleItalic}
            </span>
          </h1>

          {/* Subheading */}
          <p className="max-w-xl sm:max-w-2xl mx-auto text-base sm:text-lg text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed font-normal">
            {description}
          </p>

          {/* Center Action Buttons */}
          <div className="flex flex-col items-center justify-center gap-2.5">
            <div className="flex items-center gap-3">
              <SplitPillButton
                label={ctaText}
                href={ctaHref}
                theme="black-crimson"
                arrowDirection="down-right"
                size="lg"
              />
              <SplitPillButton
                label="Register Your Fleet"
                href="/fleet-solutions"
                theme="white-crimson"
                arrowDirection="up-right"
                size="lg"
              />
            </div>
            <span className="text-xs font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400 mt-2">
              Your Safety — Our Mission
            </span>
          </div>
        </div>
      </section>

      {/* 
        HERO INTERACTIVE HUB ARCHITECTURE:
        Surrounds the central video laptop with 5 status cards connected via animated circuit lines.
        Rests cleanly outside the hero banner on the natural container canvas.
      */}
      <HeroInteractiveHub />

    </div>
  );
}

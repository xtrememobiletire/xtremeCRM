import HeroBadge from "./hero-badge";
import SplitPillButton from "./split-pill-button";

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
  badgeText = "Now Available • 24/7 Mobile Tire Service",
  badgeHref = "#booking",
  titleLine1 = "Reliable Mobile Tires.",
  titleItalic = "Anytime. Anywhere.",
  description = "The modern platform for commercial fleets and vehicle owners who need fast, professional on-site tire services wherever they operate — day or night.",
  ctaText = "Get Started",
  ctaHref = "#booking",
}: HeroSectionProps) {
  return (
    <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 lg:pt-24 pb-20 sm:pb-28 text-center my-auto flex flex-col items-center">
      {/* "Now Available +" Pill Badge */}
      <HeroBadge text={badgeText} href={badgeHref} />

      {/* Main Title matching Image 1's "Build Faster / Ship with Confidence" font hierarchy */}
      <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[var(--neutral-dark)] mb-6 leading-[1.08]">
        {titleLine1} <br />
        <span className="font-serif italic font-normal text-[var(--brand-primary)]">
          {titleItalic}
        </span>
      </h1>

      {/* Subheading */}
      <p className="max-w-xl sm:max-w-2xl mx-auto text-base sm:text-lg text-zinc-600 dark:text-zinc-400 mb-10 leading-relaxed font-normal">
        {description}
      </p>

      {/* Bottom Center Action Button matching Image 1's 'Get Started ↘' */}
      <div className="flex items-center justify-center">
        <SplitPillButton
          label={ctaText}
          href={ctaHref}
          theme="black-crimson"
          arrowDirection="down-right"
          size="lg"
        />
      </div>
    </main>
  );
}

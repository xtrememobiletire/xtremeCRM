"use client";

import { useEffect, useRef } from "react";
import SplitPillButton from "./split-pill-button";
import HeroInteractiveHub from "./hero/hero-interactive-hub";
import HeroDynamicPhoneBar from "./hero-dynamic-phone-bar";

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
  const desktopVideoRef = useRef<HTMLVideoElement>(null);
  const tabletVideoRef = useRef<HTMLVideoElement>(null);
  const mobileVideoRef = useRef<HTMLVideoElement>(null);

  // Guarantee immediate playback as soon as user lands on the page
  useEffect(() => {
    const startPlayback = (video: HTMLVideoElement | null) => {
      if (!video) return;
      video.defaultMuted = true;
      video.muted = true;
      const promise = video.play();
      if (promise !== undefined) {
        promise.catch(() => {});
      }
    };

    startPlayback(desktopVideoRef.current);
    startPlayback(tabletVideoRef.current);
    startPlayback(mobileVideoRef.current);
  }, []);

  return (
    <div className="w-full flex flex-col items-center">
      
      {/* 
        HERO BANNER WITH RESPONSIVE BACKGROUND VIDEOS:
        - Pulls up behind the floating navbar (-mt-24 sm:-mt-28 lg:-mt-32)
        - Seamlessly covers from the upper edge behind the navbar down past the action buttons
        - Desktop (16:9), Tablet (1:1), and Phone/Mobile (9:16)
        - Pure dark overlay with zero white foggy background at the bottom
      */}
      <section className="relative w-full overflow-hidden flex flex-col items-center justify-center -mt-24 sm:-mt-28 lg:-mt-32 pt-28 sm:pt-36 lg:pt-44 pb-16 sm:pb-24 text-center">
        
        {/* Background Video Layer with Smooth Bottom Fade (strictly below the button line) */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-black"
          style={{
            maskImage: "linear-gradient(to bottom, black 0%, black calc(100% - 50px), transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 0%, black calc(100% - 50px), transparent 100%)",
          }}
        >
          {/* 1. Desktop Video (16:9) - visible on lg (>=1024px) */}
          <video
            ref={desktopVideoRef}
            src="https://res.cloudinary.com/ebjikx52/video/upload/v1792843197/xtreme-hero-desktop-16x9.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="hidden lg:block absolute inset-0 w-full h-full object-cover object-center"
          />

          {/* 2. Tablet Video (1:1) - visible on sm to md (640px - 1023px) */}
          <video
            ref={tabletVideoRef}
            src="https://res.cloudinary.com/ebjikx52/video/upload/v1792843187/xtreme-hero-tablet-1x1.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="hidden sm:block lg:hidden absolute inset-0 w-full h-full object-cover object-center"
          />

          {/* 3. Mobile / Phone Video (9:16) - visible on mobile (<640px) */}
          <video
            ref={mobileVideoRef}
            src="https://res.cloudinary.com/ebjikx52/video/upload/v1792843184/xtreme-hero-mobile-9x16.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="block sm:hidden absolute inset-0 w-full h-full object-cover object-center"
          />

          {/* Subtle Dark Vignette & Contrast Overlays for 100% Text Readability */}
          <div className="absolute inset-0 bg-black/45" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/25 to-black/85" />
        </div>

        {/* 
          SOFT BLUR DIFFUSER OVERLAY (STRICTLY BELOW BUTTON LINE):
          Only softens the very bottom edge where the black section meets the canvas,
          leaving the car, buttons, and text 100% crisp and dark.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 sm:h-16 backdrop-blur-sm sm:backdrop-blur-md"
          style={{
            maskImage: "linear-gradient(to bottom, transparent 0%, black 50%, black 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 50%, black 100%)",
          }}
        />

        {/* Foreground Content */}
        <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 flex flex-col items-center">
          {/* Main Title: 3 words + Anytime. Anywhere. */}
          <h1 className="mt-2 text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white mb-5 leading-[1.08] max-w-4xl drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)]">
            {titleLine1} <br />
            <span className="font-serif italic font-normal text-[#DC2626] drop-shadow-[0_2px_16px_rgba(220,38,38,0.5)]">
              {titleItalic}
            </span>
          </h1>

          {/* Subheading */}
          <p className="max-w-xl sm:max-w-2xl mx-auto text-base sm:text-lg text-zinc-100 mb-8 leading-relaxed font-normal drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
            {description}
          </p>

          {/* Center Action Buttons */}
          <div className="flex flex-col items-center justify-center gap-2.5">
            <div className="flex flex-wrap items-center justify-center gap-3">
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
            <span className="text-xs font-semibold tracking-wider uppercase text-zinc-200 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] mt-2">
              Your Safety — Our Mission
            </span>
            <HeroDynamicPhoneBar />
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

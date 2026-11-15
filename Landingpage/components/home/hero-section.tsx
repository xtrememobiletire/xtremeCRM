"use client";

import { useEffect, useRef, useState } from "react";
import SpecularButton from "./specular-button";
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

const DESKTOP_VIDEO_SRC =
  "https://res.cloudinary.com/wgstyulb/video/upload/v1792988129/Headlights_illuminating_black_lu__1080p_20261026090435.mp4";
const MOBILE_VIDEO_SRC =
  "https://res.cloudinary.com/wgstyulb/video/upload/v1792988128/Luxury_car_headlights_turning_on_1080p_20261026090417.mp4";

export default function HeroSection({
  titleLine1 = "24/7 Mobile Tire Service.",
  titleItalic = "Anytime. Anywhere.",
  description = "On-demand mobile tire repair, replacement, and commercial fleet management delivered directly to your driveway, workplace, or roadside location.",
  ctaText = "Book Now",
  ctaHref = "/booking",
}: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const desktopVideoRef = useRef<HTMLVideoElement>(null);
  const mobileVideoRef = useRef<HTMLVideoElement>(null);

  // Viewport detection to avoid downloading both 1080p videos simultaneously
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 640px)");
    setIsDesktop(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Safe autoplay helper
  const startPlayback = (video: HTMLVideoElement | null) => {
    if (!video) return;
    video.defaultMuted = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    const promise = video.play();
    if (promise !== undefined) {
      promise.catch(() => {
        const resume = () => {
          video.muted = true;
          video.play().catch(() => {});
        };
        window.addEventListener("click", resume, { once: true, passive: true });
        window.addEventListener("touchstart", resume, { once: true, passive: true });
        window.addEventListener("scroll", resume, { once: true, passive: true });
      });
    }
  };

  // Play video matching active viewport mode
  useEffect(() => {
    if (isDesktop === null) return;
    if (isDesktop) {
      startPlayback(desktopVideoRef.current);
    } else {
      startPlayback(mobileVideoRef.current);
    }
  }, [isDesktop]);

  // Pause playback when hero section is scrolled out of viewport
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const activeVideo = isDesktop
          ? desktopVideoRef.current
          : mobileVideoRef.current;
        if (!activeVideo) return;

        if (entry.isIntersecting) {
          activeVideo.play().catch(() => {});
        } else {
          activeVideo.pause();
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [isDesktop]);

  return (
    <div className="w-full flex flex-col items-center">
      {/* 
        HERO BANNER WITH RESPONSIVE BACKGROUND VIDEO:
        - Pulls up behind the floating navbar (-mt-24 sm:-mt-28 lg:-mt-32)
        - Single video stream loaded conditionally by media query
        - Pure dark vignette overlay with zero foggy gray background at the bottom
      */}
      <section
        ref={sectionRef}
        className="relative w-full overflow-hidden flex flex-col items-center justify-center min-h-[100dvh] bg-black -mt-24 sm:-mt-28 lg:-mt-32 text-center"
      >
        {/* Background Video Layer: z-0 */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          {/* 1. Desktop & Tablet Video (16:9) - only mounted on screen >= 640px */}
          {isDesktop !== false && (
            <video
              ref={desktopVideoRef}
              src={isDesktop ? DESKTOP_VIDEO_SRC : undefined}
              autoPlay
              muted
              loop
              playsInline
              preload={isDesktop ? "auto" : "none"}
              className="hidden sm:block absolute inset-0 w-full h-full object-cover object-center"
            />
          )}

          {/* 2. Mobile Video (9:16) - only mounted on phone screens < 640px */}
          {isDesktop !== true && (
            <video
              ref={mobileVideoRef}
              src={isDesktop === false ? MOBILE_VIDEO_SRC : undefined}
              autoPlay
              muted
              loop
              playsInline
              preload={isDesktop === false ? "auto" : "none"}
              className="block sm:hidden absolute inset-0 w-full h-full object-cover object-center"
            />
          )}

          {/* Subtle Dark Vignette & Contrast Overlays */}
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/80" />
        </div>

        {/* Foreground Content */}
        <div className="relative z-20 w-full max-w-4xl mx-auto px-4 sm:px-6 flex flex-col items-center justify-center my-auto pt-20 xs:pt-24 sm:pt-28 lg:pt-32 pb-14 sm:pb-20">
          {/* Main Title: 3 words + Anytime. Anywhere. */}
          <h1 className="mt-0 text-[28px] xs:text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight text-white mb-3 sm:mb-4 leading-[1.12] sm:leading-[1.08] max-w-4xl drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)]">
            {titleLine1} <br />
            <span className="font-serif italic font-normal text-[var(--brand-primary)] drop-shadow-[0_2px_16px_rgba(200,16,46,0.5)]">
              {titleItalic}
            </span>
          </h1>

          {/* Subheading */}
          <p className="max-w-xl sm:max-w-2xl mx-auto text-sm xs:text-base sm:text-lg text-zinc-100 mb-5 sm:mb-6 leading-relaxed font-normal drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] px-2 sm:px-0">
            {description}
          </p>

          {/* Center Action Buttons */}
          <div className="flex flex-col items-center justify-center gap-2 w-full xs:w-auto">
            <div className="flex flex-col xs:flex-row items-center justify-center gap-3 sm:gap-4 w-full xs:w-auto">
              <SpecularButton
                label={ctaText}
                href={ctaHref}
                variant="crimson"
              />
              <SpecularButton
                label="Register Your Fleet"
                href="/fleet-solutions"
                variant="white"
              />
            </div>
            <span className="text-xs font-semibold tracking-wider uppercase text-zinc-200 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] mt-2">
              Your Safety — Our Mission
            </span>
            <HeroDynamicPhoneBar />
          </div>
        </div>

        {/* Soft Blurred Gradient Border Diffuser between Hero and Interactive Hub */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 sm:h-16 z-10 backdrop-blur-md bg-gradient-to-b from-transparent via-[#eceef2]/40 to-[#eceef2] dark:via-black/50 dark:to-black/90"
        />
      </section>

      {/* HERO INTERACTIVE HUB ARCHITECTURE */}
      <HeroInteractiveHub />
    </div>
  );
}

"use client";

import { useRef, useEffect, useState } from "react";
import { BadgeCheck, Compass, Wrench, Zap } from "lucide-react";
import SpeedometerGauge from "@/components/about/speedometer-gauge";

interface MissionPoint {
  id: string;
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const MISSION_POINTS: MissionPoint[] = [
  {
    id: "quality-reliability",
    number: "01",
    title: "Quality and Reliability",
    description:
      "Rapid 24/7 response across the USA and Canada using commercial-grade mobile tools and safety-inspected tires.",
    icon: <BadgeCheck className="w-5 h-5" strokeWidth={1.8} />,
  },
  {
    id: "driving-style",
    number: "02",
    title: "Tailored To Your Driving Style",
    description:
      "Custom tire solutions built around your schedule—from personal daily commuters to heavy-duty commercial fleets.",
    icon: <Compass className="w-5 h-5" strokeWidth={1.8} />,
  },
  {
    id: "thoughtful-upgrades",
    number: "03",
    title: "Safe, Thoughtful Upgrades",
    description:
      "Precision seasonal swaps, rim repairs, and top-brand tire installations that maximize grip and highway safety.",
    icon: <Wrench className="w-5 h-5" strokeWidth={1.8} />,
  },
  {
    id: "performance-no-compromise",
    number: "04",
    title: "Performance Without Compromise",
    description:
      "We believe performance should never come at the expense of reliability, safety, or peace of mind.",
    icon: <Zap className="w-5 h-5" strokeWidth={1.8} />,
  },
];

export default function AboutMissionSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const card0Ref = useRef<HTMLDivElement>(null);
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const card3Ref = useRef<HTMLDivElement>(null);

  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  // References for smooth animation loop
  const targetProgressRef = useRef(0);
  const currentProgressRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Locate the active scroll container:
    // PageShell renders <div ref={scrollContainerRef} className="... overflow-y-auto">
    const scrollParent =
      sectionRef.current?.closest(".overflow-y-auto") ||
      (document.scrollingElement as HTMLElement) ||
      window;

    const handleScroll = () => {
      const sectionEl = sectionRef.current;
      if (!sectionEl) return;

      const isElement = scrollParent instanceof HTMLElement;
      const parentRect = isElement
        ? scrollParent.getBoundingClientRect()
        : { top: 0, height: window.innerHeight, bottom: window.innerHeight };

      const sRect = sectionEl.getBoundingClientRect();
      const c3 = card3Ref.current;
      const yEnd = c3 ? c3.getBoundingClientRect().bottom : sRect.bottom;

      // Start spinning the moment user scrolls towards "About Us"
      // Start line at viewport bottom (parentRect.top + parentRect.height * 1.05)
      const startLine = parentRect.top + parentRect.height * 1.05;
      const totalSpan = yEnd - (sRect.top - parentRect.height * 0.15);

      if (totalSpan <= 0) return;

      const scrolled = startLine - sRect.top;
      const raw = scrolled / totalSpan;
      const clamped = Math.max(0, Math.min(1, raw));

      targetProgressRef.current = clamped;

      // Determine active item based on scroll position
      if (clamped < 0.28) setActiveCardIndex(0);
      else if (clamped < 0.52) setActiveCardIndex(1);
      else if (clamped < 0.78) setActiveCardIndex(2);
      else setActiveCardIndex(3);
    };

    // Responsive Lerp Animation Loop (60fps, high responsiveness)
    const tick = () => {
      const diff = targetProgressRef.current - currentProgressRef.current;
      if (Math.abs(diff) > 0.0005) {
        currentProgressRef.current += diff * 0.26;
      } else {
        currentProgressRef.current = targetProgressRef.current;
      }

      const p = currentProgressRef.current;
      setProgress(p);
      setSpeed(Math.round(p * 180));

      animFrameRef.current = requestAnimationFrame(tick);
    };

    // Attach listeners to both scroll container and window
    scrollParent.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    // Initial check
    handleScroll();
    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      scrollParent.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const cardRefs = [card0Ref, card1Ref, card2Ref, card3Ref];

  return (
    <section
      ref={sectionRef}
      className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 lg:pt-16 pb-20 sm:pb-28 lg:pb-36"
    >
      {/* 
        ========================================================================
        TWO-COLUMN PINNED LAYOUT:
        - Left Column (Sticky / Fixed): "OUR MISSION" + Speedometer Gauge
        - Right Column (Scrolling): "■ About Us" Header + 4 Borderless Items
        ========================================================================
      */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start relative">
        
        {/* 
          MOBILE-ONLY SECTION HEADER:
          - On phone screens: "■ About Us" + "Our Mission" + Mission statement at the very top
          - Followed directly by the Speedometer beneath it
        */}
        <div className="lg:hidden space-y-3 mb-6 sm:mb-8 text-left">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-black dark:bg-[var(--brand-primary)]/85 inline-block shrink-0 rounded-none shadow-sm" />
            <span className="text-xs sm:text-sm font-mono font-bold tracking-widest uppercase text-zinc-800 dark:text-zinc-200">
              About Us
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight uppercase text-zinc-950 dark:text-white font-sans select-none">
            Our Mission
          </h2>

          <p className="text-lg sm:text-xl leading-snug font-sans tracking-tight pt-1">
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">
              At Xtreme Mobile Tire, our goal is simple:{" "}
            </span>
            <span className="text-zinc-950 dark:text-white font-extrabold">
              eliminate roadside downtime by bringing fast, certified tire care straight to your location, 24/7.
            </span>
          </p>
        </div>

        {/* 
          LEFT COLUMN: FIXED / STICKY IN PLACE
          - Desktop: Contains "OUR MISSION" and Speedometer pinned in the middle
          - Mobile: Speedometer sits right beneath the mobile header
        */}
        <div className="lg:col-span-5 lg:sticky lg:top-28 self-start flex flex-col items-center justify-center z-20">
          
          {/* Desktop-only Header Title: "OUR MISSION" (Centered over speedometer, shifted right from left margin) */}
          <div className="hidden lg:block w-full text-center mb-6">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[38px] font-bold tracking-tight uppercase text-zinc-950 dark:text-white font-sans select-none">
              Our Mission
            </h2>
          </div>

          {/* Speedometer Instrument Cluster (Centered in the middle of the column) */}
          <div className="w-full flex justify-center items-center">
            <SpeedometerGauge
              progress={progress}
              currentSpeed={speed}
            />
          </div>

        </div>

        {/* 
          RIGHT COLUMN: ONLY THIS SIDE MOVES / SCROLLS
          - Contains "■ About Us" Tag, Mission Text, and the 4 Borderless Items
        */}
        <div className="lg:col-span-7 flex flex-col space-y-8">
          
          {/* Desktop Header Intro with Tag & Two-Tone Mission Text */}
          <div className="hidden lg:block space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-black dark:bg-[var(--brand-primary)]/85 inline-block shrink-0 rounded-none shadow-sm" />
              <span className="text-xs sm:text-sm font-mono font-bold tracking-widest uppercase text-zinc-800 dark:text-zinc-200">
                About Us
              </span>
            </div>

            <p className="text-xl sm:text-2xl md:text-3xl leading-snug font-sans tracking-tight">
              <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                At Xtreme Mobile Tire, our goal is simple:{" "}
              </span>
              <span className="text-zinc-950 dark:text-white font-extrabold">
                eliminate roadside downtime by bringing fast, certified tire care straight to your location, 24/7.
              </span>
            </p>
          </div>

          {/* 
            THE 4 BORDERLESS MISSION ITEMS:
            - Clean borderless typography & icons (NO boxes, NO borders, NO corner plus signs)
            - Active item illuminates in brand crimson in sync with the speedometer!
          */}
          <div className="space-y-8 pt-2">
            {MISSION_POINTS.map((point, index) => {
              const isActive = activeCardIndex === index;

              return (
                <div
                  key={point.id}
                  ref={cardRefs[index]}
                  className="group relative py-3 sm:py-4 transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    {/* Clean Borderless Icon */}
                    <div
                      className={`shrink-0 mt-1 transition-all duration-300 ${
                        isActive
                          ? "text-[var(--brand-primary)] scale-110"
                          : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300"
                      }`}
                    >
                      {point.icon}
                    </div>

                    {/* Text Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between mb-2">
                        <h3
                          className={`text-xl sm:text-2xl font-extrabold tracking-tight transition-colors duration-300 ${
                            isActive
                              ? "text-[var(--brand-primary)]"
                              : "text-zinc-900 dark:text-white"
                          }`}
                        >
                          {point.title}
                        </h3>
                        <span
                          className={`font-mono text-xs font-bold transition-colors duration-300 ${
                            isActive
                              ? "text-[var(--brand-primary)]"
                              : "text-zinc-400 dark:text-zinc-600"
                          }`}
                        >
                          {point.number}
                        </span>
                      </div>

                      <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-300 leading-relaxed font-normal">
                        {point.description}
                      </p>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
}

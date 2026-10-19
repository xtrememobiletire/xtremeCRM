"use client";

import { useState } from "react";
import { ShieldCheck, BadgeCheck, Wrench } from "lucide-react";

interface ValueCardItem {
  id: string;
  title: string;
  description: string;
  badge: string;
  imageSrc: string;
  hoverBarText: string;
  icon: React.ReactNode;
}

const VALUES_ITEMS: ValueCardItem[] = [
  {
    id: "trust-honesty",
    title: "Trust & Honesty",
    description:
      "Fixed, upfront pricing with zero hidden emergency fees—you only pay for what your vehicle truly needs.",
    badge: "Upfront Pricing",
    imageSrc: "/wheel-detail.jpg",
    hoverBarText: "Fixed Transparent Pricing",
    icon: <ShieldCheck className="w-5 h-5" strokeWidth={1.8} />,
  },
  {
    id: "quality-reliability",
    title: "Quality & Reliability",
    description:
      "Available 24/7 across the USA and Canada with safety-tested tires and commercial-grade mobile gear.",
    badge: "24/7 Coast to Coast",
    imageSrc: "/mobile-tire-service.jpg",
    hoverBarText: "Commercial-Grade Gear",
    icon: <BadgeCheck className="w-5 h-5" strokeWidth={1.8} />,
  },
  {
    id: "expertise-results",
    title: "Expertise & Results",
    description:
      "15+ years of certified mobile experience getting cars and commercial fleets back on the road fast.",
    badge: "15+ Years Certified",
    imageSrc: "/tire-service-wheel.jpg",
    hoverBarText: "Master Certified Technicians",
    icon: <Wrench className="w-5 h-5" strokeWidth={1.8} />,
  },
];

export default function AboutValuesCards() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <section className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
      
      {/* 
        ========================================================================
        SECTION HEADER (Matching Wireframe and Inspiration)
        - Tag: ■  About Us
        - Title: Our Values
        - Two-tone mission text matching wireframe
        ========================================================================
      */}
      <div className="text-left mb-10 sm:mb-14">
        {/* Top Tag */}
        <div className="flex items-center gap-2 mb-2.5">
          <span className="w-2.5 h-2.5 bg-black dark:bg-[var(--brand-primary)] inline-block shrink-0 rounded-none shadow-sm" />
          <span className="text-xs sm:text-sm font-mono font-bold tracking-widest uppercase text-zinc-800 dark:text-zinc-200">
            About Us
          </span>
        </div>

        {/* Section Headline */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-4">
          Our Values
        </h2>

        {/* High-Contrast Two-Tone Mission Text Matching User's Design Image */}
        <p className="text-lg sm:text-xl md:text-2xl leading-relaxed max-w-3xl">
          <span className="text-zinc-500 dark:text-zinc-400 font-semibold font-sans">
            At XtremeMobileTire, our mission is simple:{" "}
          </span>
          <span className="text-zinc-950 dark:text-white font-extrabold font-sans">
            to do what’s best for our customers and their vehicles
          </span>
        </p>
      </div>

      {/* 
        ========================================================================
        3-CARD VALUES GRID ("Picture Down When Hover")
        - Full-height picture in default state
        - Picture slides down smoothly to the bottom when hovered
        - Description text appears with smooth opacity & translation in center
        - Bottom bar changes color dynamically on hover
        ========================================================================
      */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
        {VALUES_ITEMS.map((item) => {
          const isHovered = hoveredCard === item.id;

          return (
            <div
              key={item.id}
              onMouseEnter={() => setHoveredCard(item.id)}
              onMouseLeave={() => setHoveredCard(null)}
              className="group relative rounded-none border border-black/10 dark:border-white/10 bg-white dark:bg-[#070707] hover:bg-zinc-50/50 dark:hover:bg-[#111113] transition-all duration-500 shadow-sm hover:shadow-2xl hover:border-[var(--brand-primary)]/40 overflow-hidden flex flex-col justify-between h-[460px] sm:h-[490px]"
            >
              
              {/* TOP HEADER SECTION: Custom Feature Icon + Card Title */}
              <div className="p-6 pb-2 text-center shrink-0">
                {/* Feature Icon Badge */}
                <div className="w-10 h-10 mx-auto rounded-none bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 flex items-center justify-center text-zinc-700 dark:text-zinc-300 group-hover:text-[var(--brand-primary)] group-hover:border-[var(--brand-primary)]/40 group-hover:scale-105 transition-all duration-300 mb-2.5 shadow-sm">
                  {item.icon}
                </div>

                {/* Card Title */}
                <h3 className="font-sans text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-white group-hover:text-[var(--brand-primary)] transition-colors tracking-tight leading-snug">
                  {item.title}
                </h3>
              </div>

              {/* 
                DETAIL DESCRIPTION TEXT REVEAL:
                Smoothly expands and transitions into view when hovered
              */}
              <div
                className={`flex-1 flex items-center justify-center text-center transition-all duration-500 px-6 ${
                  isHovered
                    ? "opacity-100 max-h-48 translate-y-0 my-2"
                    : "opacity-0 max-h-0 -translate-y-4 overflow-hidden pointer-events-none my-0"
                }`}
              >
                <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal">
                  {item.description}
                </p>
              </div>

              {/* 
                PICTURE CONTAINER ("Picture Down When Hover"):
                - Default: Dominates the card height (h-56 sm:h-64 my-auto)
                - Hover: Smoothly slides down to bottom (h-28 sm:h-32 mt-auto)
              */}
              <div className="px-6 pb-4">
                <div
                  className={`relative w-full rounded-none overflow-hidden border border-black/10 dark:border-white/10 bg-zinc-950 transition-all duration-500 ease-out shadow-inner ${
                    isHovered
                      ? "h-28 sm:h-32 mt-auto"
                      : "h-56 sm:h-64 my-auto"
                  }`}
                >
                  {/* Photo Visual */}
                  <img
                    src={item.imageSrc}
                    alt={item.title}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                  />

                  {/* Dark Vignette Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />

                  {/* High-Tech Fine Grid Pattern */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] pointer-events-none" />

                  {/* Subtle Corner Badge inside Photo */}
                  <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-none bg-[var(--brand-primary)]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/90 drop-shadow">
                      {item.badge}
                    </span>
                  </div>
                </div>
              </div>

              {/* 
                BOTTOM COLOR CHANGE BAR (From Wireframe "When Hover Color change"):
                - Default: Crisp neutral slate bar
                - Hover: Vibrant crimson red accent with bold white text
              */}
              <div
                className={`w-full py-2.5 px-4 text-center text-xs font-bold uppercase tracking-wider transition-colors duration-300 select-none ${
                  isHovered
                    ? "bg-[var(--brand-primary)] text-white"
                    : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border-t border-black/5 dark:border-white/10"
                }`}
              >
                {item.hoverBarText}
              </div>

            </div>
          );
        })}
      </div>

    </section>
  );
}

"use client";

import { useState } from "react";
import { ShieldCheck, BadgeCheck, Wrench } from "lucide-react";

interface ValueCardItem {
  id: string;
  title: string;
  description: string;
  imageSrc: string;
  hoverBarText: string;
  icon: React.ReactNode;
}

const VALUES_ITEMS: ValueCardItem[] = [
  {
    id: "trust-honesty",
    title: "Trust and Honesty",
    description:
      "Fixed, upfront pricing with zero hidden emergency fees. We provide honest estimates before any wrench turns—you only pay for what your vehicle truly needs.",
    imageSrc: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426894/xtreme/landing/wheel-detail_jpg.jpg",
    hoverBarText: "Fixed Transparent Pricing",
    icon: <ShieldCheck className="w-5 h-5" strokeWidth={2} />,
  },
  {
    id: "quality-reliability",
    title: "Quality and Reliability",
    description:
      "Available 24/7 across the USA and Canada with safety-tested tires, computerized laser dynamic wheel balancers, and commercial-grade mobile bay gear.",
    imageSrc: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426873/xtreme/landing/mobile-tire-service_jpg.jpg",
    hoverBarText: "Commercial-Grade Gear",
    icon: <BadgeCheck className="w-5 h-5" strokeWidth={2} />,
  },
  {
    id: "expertise-results",
    title: "Expertise and Results",
    description:
      "Over 15+ years of certified mobile technician experience getting daily commuter cars, commercial fleets, and heavy equipment back on the road fast.",
    imageSrc: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426886/xtreme/landing/tire-service-wheel_jpg.jpg",
    hoverBarText: "Master Certified Technicians",
    icon: <Wrench className="w-5 h-5" strokeWidth={2} />,
  },
];

export default function AboutValuesCards() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [clickedCard, setClickedCard] = useState<string | null>(null);

  return (
    <section className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
      
      {/* 
        ========================================================================
        SECTION HEADER
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

        {/* High-Contrast Two-Tone Mission Text */}
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
        3-CARD FULL-BLEED VALUES GRID:
        - Default state: Picture covers 100% of card length
        - Hover/Click state: Picture slides down to bottom, Information appears on top
        ========================================================================
      */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
        {VALUES_ITEMS.map((item) => {
          const isActive = hoveredCard === item.id || clickedCard === item.id;

          return (
            <div
              key={item.id}
              tabIndex={0}
              role="button"
              aria-expanded={isActive}
              aria-label={`${item.title} - Click or hover to reveal details`}
              onMouseEnter={() => setHoveredCard(item.id)}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => setClickedCard((prev) => (prev === item.id ? null : item.id))}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setClickedCard((prev) => (prev === item.id ? null : item.id));
                }
              }}
              className="group relative rounded-none border border-black/15 dark:border-white/15 bg-zinc-950 text-white overflow-hidden shadow-lg hover:shadow-2xl hover:border-[var(--brand-primary)]/70 transition-all duration-500 h-[480px] sm:h-[500px] flex flex-col justify-between cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
            >
              {/* ======================================================== */}
              {/* TOP SECTION: Information Panel (Revealed on Hover/Click) */}
              {/* ======================================================== */}
              <div
                className={`w-full overflow-hidden transition-all duration-500 ease-in-out shrink-0 bg-zinc-950 flex flex-col justify-between ${
                  isActive
                    ? "h-[240px] sm:h-[250px] opacity-100 p-6 border-b border-white/15"
                    : "h-0 opacity-0 p-0 border-b-0 pointer-events-none"
                }`}
              >
                <div>
                  {/* Icon & Eyebrow */}
                  <div className="flex items-center gap-2 mb-2 text-[var(--brand-primary)]">
                    {item.icon}
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-300">
                      Core Value
                    </span>
                  </div>

                  {/* Title in Information View */}
                  <h3 className="font-sans text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug mb-2.5">
                    {item.title}
                  </h3>

                  {/* Full Service Description */}
                  <p className="text-xs sm:text-[13px] text-zinc-300 leading-relaxed font-normal">
                    {item.description}
                  </p>
                </div>

                {/* Bottom Row of Information View */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {item.hoverBarText}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--brand-primary)]">
                    <span>Active Standard</span>
                    <span>&rarr;</span>
                  </span>
                </div>
              </div>

              {/* ======================================================== */}
              {/* PICTURE CONTAINER:                                       */}
              {/* - Default: Takes 100% of card length (Full Bleed Photo)  */}
              {/* - Hover/Click: Slides DOWN to bottom 50% of card!        */}
              {/* ======================================================== */}
              <div
                className={`relative w-full overflow-hidden transition-all duration-500 ease-in-out ${
                  isActive
                    ? "h-[240px] sm:h-[250px]"
                    : "h-full flex-1"
                }`}
              >
                {/* Full-Bleed Photograph covering entire container length */}
                <img
                  src={item.imageSrc}
                  alt={item.title}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                />

                {/* Subtle dark tint to maintain contrast */}
                <div
                  className={`absolute inset-0 transition-colors duration-500 ${
                    isActive ? "bg-black/25" : "bg-black/35 group-hover:bg-black/25"
                  }`}
                />

                {/* ======================================================== */}
                {/* REST STATE OVERLAYS (Visible when card is not active):   */}
                {/* Clean Bottom Overlay Title & Subtitle                    */}
                {/* ======================================================== */}
                <div
                  className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300 ${
                    isActive ? "opacity-0 pointer-events-none" : "opacity-100"
                  }`}
                >
                  <div className="p-5 sm:p-6 pt-16 bg-gradient-to-t from-black/95 via-black/65 to-transparent text-left">
                    {/* Icon Accent */}
                    <div className="w-9 h-9 rounded-none bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-[var(--brand-primary)] mb-3 shadow-md">
                      {item.icon}
                    </div>

                    <h3 className="font-sans text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight group-hover:text-[var(--brand-primary)] transition-colors">
                      {item.title}
                    </h3>
                    <div className="mt-2 flex items-center justify-between text-xs text-zinc-300">
                      <span className="font-mono text-[11px] text-zinc-300 truncate max-w-[200px]">
                        {item.hoverBarText}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-white/80 group-hover:text-white group-hover:translate-y-0.5 transition-all">
                        <span>Details</span>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Active Mode Subtle Lower Label */}
                {isActive && (
                  <div className="absolute bottom-2 right-3 z-10 pointer-events-none">
                    <span className="text-[10px] font-mono text-white/60 bg-black/60 px-2 py-0.5 rounded-none backdrop-blur-sm border border-white/10">
                      Click to collapse ↑
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </section>
  );
}

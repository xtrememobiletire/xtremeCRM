"use client";

import { useState } from "react";
import Link from "next/link";

interface ServiceCardItem {
  id: string;
  title: string;
  description: string;
  badge: string;
  status: string;
  image: string;
  ctaText: string;
  ctaHref: string;
  icon: React.ReactNode;
}

const SERVICE_ITEMS: ServiceCardItem[] = [
  {
    id: "mobile-service",
    title: "24/7 Mobile Service",
    description:
      "Professional mobile tire services available around the clock. Our fully equipped mobile units are ready day or night to keep your fleet running.",
    badge: "24/7 Rapid Mobile Bay",
    status: "Emergency Roadside & On-Site Repair",
    image:
      "https://res.cloudinary.com/ebjikx52/image/upload/v1792426881/xtreme/landing/service-mobile-van_jpg.jpg",
    ctaText: "Request Dispatch",
    ctaHref: "/booking",
    icon: (
      <svg className="w-4 h-4 text-[var(--brand-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: "fleet-solutions",
    title: "Fleet-Focused Solutions",
    description:
      "Specialized tire programs for commercial fleets. Minimize downtime, prevent delays, and keep your operations running smoothly with our expert service.",
    badge: "Commercial Fleet Hub",
    status: "Scheduled Shift Maintenance & Invoicing",
    image:
      "https://res.cloudinary.com/ebjikx52/image/upload/v1792426863/xtreme/landing/fleet-trucks_jpg.jpg",
    ctaText: "Explore Fleet Plans",
    ctaHref: "/fleet-solutions",
    icon: (
      <svg className="w-4 h-4 text-[var(--brand-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    id: "coast-coverage",
    title: "Coast to Coast Coverage",
    description:
      "Serving VA, MD, KY, NC, TN, Washington DC, and Ontario Canada. Dependable on-site tire solutions wherever your vehicles operate.",
    badge: "Multi-State & Canada Route",
    status: "VA • MD • KY • NC • TN • DC • ON",
    image:
      "https://res.cloudinary.com/ebjikx52/image/upload/v1792689325/xtreme/landing/coast-to-coast-coverage_jpg.jpg",
    ctaText: "View Coverage Areas",
    ctaHref: "/services",
    icon: (
      <svg className="w-4 h-4 text-[var(--brand-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
];

export default function ServicesCards() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [clickedCard, setClickedCard] = useState<string | null>(null);

  return (
    <section className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* 
        Section Header matching Image 1:
        ■  XTREME MOBILE TIRE SOLUTIONS
        Professional mobile tire services
      */}
      <div className="text-left mb-8 sm:mb-12">
        <div className="flex items-center gap-2.5 mb-2.5">
          <span className="w-2.5 h-2.5 bg-black dark:bg-[var(--brand-primary)] inline-block shrink-0 rounded-none shadow-sm" />
          <span className="text-xs sm:text-sm font-bold tracking-widest uppercase text-zinc-800 dark:text-zinc-200 font-sans">
            Xtreme Mobile Tire Solutions
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl tracking-tight text-[var(--neutral-dark)]">
          <span className="font-sans font-extrabold text-[var(--neutral-dark)]">
            Professional{" "}
          </span>
          <span className="font-serif italic font-normal text-[var(--neutral-dark)]">
            mobile tire services
          </span>
        </h2>
      </div>

      {/* 3-Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
        {SERVICE_ITEMS.map((item) => {
          const isActive = hoveredCard === item.id || clickedCard === item.id;

          return (
            <div
              key={item.id}
              tabIndex={0}
              role="button"
              aria-expanded={isActive}
              aria-label={`${item.title} - Click or hover to reveal service details`}
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
                  {/* Title in Information View */}
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug mb-2.5">
                    {item.title}
                  </h3>

                  {/* Complete Service Description (Matching User Screenshots) */}
                  <p className="text-xs sm:text-[13px] text-zinc-300 leading-relaxed font-normal">
                    {item.description}
                  </p>
                </div>

                {/* Bottom Row: Direct Action CTA */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {item.status}
                  </span>

                  <Link
                    href={item.ctaHref}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--brand-primary)] hover:text-white transition-colors shrink-0 group/link"
                  >
                    <span>{item.ctaText}</span>
                    <span className="transition-transform group-hover/link:translate-x-1">&rarr;</span>
                  </Link>
                </div>
              </div>

              {/* ======================================================== */}
              {/* PICTURE CONTAINER:                                       */}
              {/* - Default: Takes 100% of card length (Full Bleed Photo)  */}
              {/* - Hover/Click: Slides DOWN to bottom 45% of card!        */}
              {/* ======================================================== */}
              <div
                className={`relative w-full overflow-hidden transition-all duration-500 ease-in-out ${
                  isActive
                    ? "h-[220px] sm:h-[230px]"
                    : "h-full flex-1"
                }`}
              >
                {/* Full-Bleed Photograph covering entire container length */}
                <img
                  src={item.image}
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
                {/* Shows Badge at top, Title & Subtitle at bottom of photo  */}
                {/* ======================================================== */}
                <div
                  className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300 ${
                    isActive ? "opacity-0 pointer-events-none" : "opacity-100"
                  }`}
                >
                  {/* Bottom Overlay Title & Prompt */}
                  <div className="p-5 sm:p-6 pt-16 bg-gradient-to-t from-black/95 via-black/65 to-transparent text-left">
                    <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight group-hover:text-[var(--brand-primary)] transition-colors">
                      {item.title}
                    </h3>
                    <div className="mt-2 flex items-center justify-between text-xs text-zinc-300">
                      <span className="font-mono text-[11px] text-zinc-300 truncate max-w-[200px]">
                        {item.status}
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

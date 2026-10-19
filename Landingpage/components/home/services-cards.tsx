"use client";

import { useState } from "react";

interface ServiceCardItem {
  id: string;
  title: string;
  description: string;
  badge: string;
  status: string;
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
    icon: (
      <svg className="w-8 h-8 text-[var(--brand-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
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
    icon: (
      <svg className="w-8 h-8 text-[var(--brand-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
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
    icon: (
      <svg className="w-8 h-8 text-[var(--brand-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
];

export default function ServicesCards() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <section className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* 
        Section Header matching Image 1:
        ■  RELIABLE MOBILE TIRE SOLUTIONS
        Professional mobiletire services
      */}
      <div className="text-left mb-8 sm:mb-12">
        <div className="flex items-center gap-2.5 mb-2.5">
          <span className="w-2.5 h-2.5 bg-black dark:bg-white inline-block shrink-0" />
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
          const isHovered = hoveredCard === item.id;

          return (
            <div
              key={item.id}
              onMouseEnter={() => setHoveredCard(item.id)}
              onMouseLeave={() => setHoveredCard(null)}
              className="group relative rounded-none border border-black/15 dark:border-white/15 bg-zinc-100/90 dark:bg-zinc-900/60 hover:bg-zinc-50 dark:hover:bg-zinc-900/90 transition-all duration-500 shadow-sm hover:shadow-2xl hover:border-[var(--brand-primary)]/40 overflow-hidden flex flex-col justify-between p-6 sm:p-7 h-[420px] sm:h-[450px]"
            >
              {/* Card Title */}
              <div className="text-center shrink-0">
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-[var(--neutral-dark)] group-hover:text-[var(--brand-primary)] transition-colors leading-snug">
                  {item.title}
                </h3>
              </div>

              {/* 
                Detail Description Text:
                Revealed smoothly in the center when the user hovers over the card
              */}
              <div
                className={`flex-1 flex items-center justify-center text-center transition-all duration-500 px-2 ${
                  isHovered
                    ? "opacity-100 max-h-48 translate-y-0 my-3"
                    : "opacity-0 max-h-0 -translate-y-4 overflow-hidden pointer-events-none my-0"
                }`}
              >
                <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal">
                  {item.description}
                </p>
              </div>

              {/* 
                Picture / Visual Container ("Picture Down When Hover"):
                - Initially occupies prominent center space.
                - When hovered: smoothly slides DOWN to the bottom of the card!
              */}
              <div
                className={`relative w-full rounded-none overflow-hidden border border-black/10 dark:border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black text-white p-4 transition-all duration-500 ease-out flex flex-col justify-between shadow-md ${
                  isHovered
                    ? "h-28 sm:h-32 mt-auto translate-y-0"
                    : "h-60 sm:h-64 my-auto translate-y-0"
                }`}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] pointer-events-none" />

                {/* Top Badge */}
                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-none bg-white/10 text-zinc-300 border border-white/10">
                    {item.badge}
                  </span>
                  <span className="w-2 h-2 rounded-none bg-[var(--brand-primary)] animate-pulse" />
                </div>

                {/* Center Visual Icon & Title */}
                <div className="relative z-10 flex items-center justify-center gap-3 my-auto">
                  <div className="p-2.5 rounded-none bg-white/[0.08] text-[var(--brand-primary)] group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  {!isHovered && (
                    <div className="text-left hidden sm:block">
                      <div className="text-xs font-bold text-white tracking-wide">
                        {item.badge}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {item.status}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Status Line */}
                <div className="relative z-10 pt-2 border-t border-white/10 text-center text-[10px] sm:text-[11px] text-zinc-400 truncate">
                  {item.status}
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </section>
  );
}

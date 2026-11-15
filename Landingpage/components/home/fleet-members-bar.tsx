"use client";

import React from "react";
import { Truck, ShieldCheck, Navigation, Wrench, Package, Radio, Building2, Flame } from "lucide-react";

interface FleetMember {
  id: string;
  name: string;
  icon: React.ReactNode;
}

const FLEET_MEMBERS: FleetMember[] = [
  {
    id: "apex-freight",
    name: "Apex Freight Logistics",
    icon: <Truck className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.75} />,
  },
  {
    id: "metro-delivery",
    name: "Metro Delivery Express",
    icon: <Navigation className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.75} />,
  },
  {
    id: "titan-haulage",
    name: "Titan Heavy Haulage",
    icon: <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.75} />,
  },
  {
    id: "vanguard-fleet",
    name: "Vanguard Contractor Fleet",
    icon: <Wrench className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.75} />,
  },
  {
    id: "ryder-systems",
    name: "Ryder Fleet Systems",
    icon: <Building2 className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.75} />,
  },
  {
    id: "penske-truck",
    name: "Penske Commercial Truck",
    icon: <Package className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.75} />,
  },
  {
    id: "dhl-supply",
    name: "DHL Express Supply",
    icon: <Radio className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.75} />,
  },
  {
    id: "swift-trans",
    name: "Swift Transportation",
    icon: <Flame className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.75} />,
  },
];

export default function FleetMembersBar() {
  return (
    <section className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 my-4 sm:my-8">
      {/* 
        Substantially Enlarged Flowing Bar:
        - Taller padding (py-4 sm:py-6) for an authoritative enterprise look.
        - Pinned left label "Fleet Members" with prominent red status pulse.
        - High-visibility logos with larger typography and icons.
        - Smooth continuous infinite auto-scrolling with pause on hover.
      */}
      <div className="relative w-full border-y border-black/15 dark:border-white/15 py-4 sm:py-6 flex items-center overflow-hidden">
        
        {/* Left Pinned Label matching Reference Image 1 */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 pr-3 sm:pr-8 mr-2.5 sm:mr-7 border-r-2 border-black/10 dark:border-white/10 z-10 bg-[var(--neutral-light)] dark:bg-black">
          <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--brand-primary)] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-[var(--brand-primary)]" />
          </span>
          <span className="text-xs xs:text-sm sm:text-base md:text-lg font-bold tracking-tight text-[var(--neutral-dark)] dark:text-zinc-100 whitespace-nowrap">
            Fleet Members
          </span>
        </div>

        {/* Continuous Flowing Marquee Track with edge fade masks & pause on hover */}
        <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_32px,white_calc(100%-32px),transparent)]">
          <div className="animate-marquee hover:[animation-play-state:paused] gap-8 sm:gap-14 cursor-pointer">
            {/* Render items twice to ensure unbroken, infinite marquee cycle */}
            {[...FLEET_MEMBERS, ...FLEET_MEMBERS].map((member, index) => (
              <div
                key={`${member.id}-${index}`}
                className="flex items-center gap-2.5 sm:gap-3 text-zinc-500 dark:text-zinc-400 hover:text-[var(--neutral-dark)] dark:hover:text-white transition-all duration-200 cursor-pointer select-none group/item shrink-0"
              >
                <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-none bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 flex items-center justify-center text-zinc-500 dark:text-zinc-400 group-hover/item:text-[var(--brand-primary)] group-hover/item:scale-110 group-hover/item:border-[var(--brand-primary)]/40 transition-all shadow-sm">
                  {member.icon}
                </div>
                <span className="text-xs xs:text-sm sm:text-base md:text-lg font-bold tracking-tight font-sans">
                  {member.name}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}

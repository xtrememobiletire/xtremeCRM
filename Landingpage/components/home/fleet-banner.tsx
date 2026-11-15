"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const FLEET_BENEFITS = [
  "Manage your fleet and drivers in one place.",
  "Enjoy fixed pricing with no surprises.",
  "Get simple weekly billing and invoices.",
  "Get reliable 24/7 roadside assistance.",
];

export default function FleetBanner() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14"
    >
      {/* 
        Section Header OUTSIDE the card:
        - "Fleet Solutions" tag
        - "BUILT FOR FLEET MANAGERS" header
      */}
      <div className="text-left mb-6 sm:mb-8">
        <div className="flex items-center gap-2.5 mb-2.5">
          <span className="w-3 h-3 bg-black dark:bg-[var(--brand-primary)] inline-block shrink-0 shadow-sm rounded-none" />
          <span className="text-xs sm:text-sm font-bold tracking-widest uppercase text-zinc-800 dark:text-zinc-200 font-sans">
            Fleet Solutions
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl tracking-tight text-[var(--neutral-dark)] leading-[1.15]">
          <span className="font-sans font-extrabold text-[var(--neutral-dark)]">
            Built for{" "}
          </span>
          <span className="font-serif italic font-normal text-[var(--brand-primary)]">
            fleet managers
          </span>
        </h2>
      </div>

      {/* 
        Outer Container Card:
        2-tier corner geometry token system (rounded-2xl shell).
        Simple, professional, elegant, and realistic color scheme.
      */}
      <div className="relative rounded-2xl bg-white/70 dark:bg-zinc-950/90 backdrop-blur-md border border-black/15 dark:border-white/10 p-4 xs:p-6 sm:p-10 lg:p-12 overflow-hidden shadow-2xl">
        
        {/* Subtle Ambient Crimson Glow */}
        <div className="pointer-events-none absolute -right-24 -top-24 w-96 h-96 bg-[var(--brand-primary)]/15 blur-3xl rounded-none" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 w-80 h-80 bg-[var(--brand-primary)]/10 blur-3xl rounded-none" />

        {/* Micro-grid overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#00000006_1px,transparent_1px),linear-gradient(to_bottom,#00000006_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:2rem_2rem]" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          
          {/* ======================================================== */}
          {/* LEFT COLUMN: Spacious Benefits Box and Action CTA        */}
          {/* ======================================================== */}
          <div className="lg:col-span-6 flex flex-col justify-between text-left">
            <div>
              {/* 
                Bordered Benefits Box:
                - Generous internal padding and breathing room between lines
                - Clean, legible simple sans-serif typography
                - Inner card rounded-lg
              */}
              <div className="relative rounded-lg border border-black/20 dark:border-white/20 bg-zinc-50/80 dark:bg-white/[0.04] p-5 xs:p-7 sm:p-9 lg:p-10 shadow-sm hover:border-[var(--brand-primary)]/50 transition-colors group/box">
                {/* Subtle Crimson Accent Bar on left edge */}
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-transparent group-hover/box:bg-[var(--brand-primary)] transition-colors rounded-none" />

                <ul className="space-y-4 sm:space-y-5">
                  {FLEET_BENEFITS.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 sm:gap-3.5 font-sans text-sm sm:text-base lg:text-[17px] leading-relaxed text-zinc-800 dark:text-zinc-200 font-normal"
                    >
                      <span className="w-1.5 h-1.5 rounded-none bg-[var(--brand-primary)] mt-2.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Bottom Action Row: Button + Arrow */}
            <div className="pt-8 sm:pt-12 mt-auto">
              <Link
                href="/fleet-solutions#create-fleet-account"
                className="group/cta w-full xs:w-auto inline-flex items-center justify-center gap-3 px-7 py-3.5 rounded-none bg-[var(--brand-primary)] hover:bg-[var(--brand-secondary)] text-white font-bold text-xs sm:text-sm uppercase tracking-wider select-none shadow-[0_0_20px_rgba(200,16,46,0.35)] transition-all duration-200 min-h-[44px]"
              >
                <span>Register Your Fleet</span>
                <svg
                  className="w-4 h-4 stroke-[2.5] transition-transform duration-200 group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 17 17 7" />
                  <path d="M7 7h10v10" />
                </svg>
              </Link>
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: Fleet Image Card with Proper Dark Contrast */}
          {/* ======================================================== */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="group/image relative w-full h-full rounded-lg overflow-hidden border border-black/15 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl flex flex-col">
              
              {/* Top Compartment: Commercial Fleet Photography (Clean, no badges) */}
              <div className="relative w-full h-52 xs:h-64 sm:h-72 lg:h-80 overflow-hidden bg-zinc-950 shrink-0">
                <img
                  src="https://res.cloudinary.com/ebjikx52/image/upload/v1792426861/xtreme/landing/fleet-manager_jpg.jpg"
                  alt="Commercial Fleet Logistics and Tire Maintenance"
                  className="w-full h-full object-cover object-center group-hover/image:scale-105 transition-transform duration-700 ease-out"
                />
              </div>

              {/* Bottom Compartment: Full Width Box Below Picture with High Contrast */}
              <div className="flex-1 p-4 xs:p-6 sm:p-8 lg:p-9 border-t border-black/15 dark:border-white/15 bg-white dark:bg-zinc-900/90 text-zinc-950 dark:text-white flex flex-col justify-center text-left">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-none bg-[var(--brand-primary)] shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)] font-mono">
                    Single Master Invoice
                  </span>
                </div>
                <h4 className="text-lg sm:text-xl font-bold text-zinc-950 dark:text-white leading-tight mb-2">
                  Dedicated Fleet Command
                </h4>
                <p className="font-sans text-sm sm:text-base text-zinc-600 dark:text-zinc-300 leading-relaxed font-normal">
                  Priority on-site scheduling, automatic telemetry logs, and dedicated B2B account managers.
                </p>
              </div>

            </div>
          </div>

        </div>

      </div>
    </motion.section>
  );
}

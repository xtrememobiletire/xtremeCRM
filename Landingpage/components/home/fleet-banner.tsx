"use client";

import Link from "next/link";

const FLEET_BENEFITS = [
  "Manage your fleet and drivers in one place.",
  "Enjoy fixed pricing with no surprises.",
  "Get simple weekly billing and invoices.",
  "Get reliable 24/7 roadside assistance.",
];

export default function FleetBanner() {
  return (
    <section className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* 
        Section Header OUTSIDE the card:
        - "Fleet Solutions" in Times New Roman style
        - "BUILT FOR FLEET MANAGERS" second header with decreased font size
      */}
      <div className="text-left mb-6 sm:mb-8">
        <div className="flex items-center gap-2.5 mb-2.5">
          <span className="w-3 h-3 bg-black dark:bg-[var(--brand-primary)] inline-block shrink-0 shadow-sm rounded-none" />
          <span
            className="text-xs sm:text-sm font-bold tracking-widest uppercase text-zinc-800 dark:text-zinc-200"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
            Fleet Solutions
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl tracking-tight text-[var(--neutral-dark)] leading-[1.15]">
          <span className="font-sans font-extrabold text-[var(--neutral-dark)]">
            Built for{" "}
          </span>
          <span className="font-serif italic font-normal text-[var(--neutral-dark)]">
            fleet managers
          </span>
        </h2>
      </div>

      {/* 
        Outer Container Card:
        Sharp brutalist lines (rounded-none), zero rounded corners.
        Simple, professional, elegant, and realistic color scheme.
      */}
      <div className="relative rounded-none bg-white/70 dark:bg-[#080d1a]/85 backdrop-blur-md border border-black/15 dark:border-white/10 p-6 sm:p-10 lg:p-12 overflow-hidden shadow-2xl">
        
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
                3. Bordered Benefits Box matching Wireframe:
                - Generous internal padding and breathing room between lines
                - High-contrast editorial serif typography (Playfair Display)
                - Sharp corners (rounded-none)
              */}
              <div className="relative rounded-none border border-black/20 dark:border-white/20 bg-zinc-50/80 dark:bg-white/[0.04] p-7 sm:p-9 lg:p-10 shadow-sm hover:border-[var(--brand-primary)]/50 transition-colors group/box">
                {/* Subtle Crimson Accent Bar on left edge */}
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-transparent group-hover/box:bg-[var(--brand-primary)] transition-colors rounded-none" />

                <ul className="space-y-4 sm:space-y-5">
                  {FLEET_BENEFITS.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 sm:gap-3.5 font-serif text-base sm:text-lg lg:text-xl leading-relaxed text-zinc-800 dark:text-zinc-200 font-normal"
                    >
                      <span className="w-1.5 h-1.5 rounded-none bg-[var(--brand-primary)] mt-2.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 4. Bottom Action Row matching Wireframe: Button + Arrow */}
            <div className="pt-8 sm:pt-12 mt-auto">
              <Link
                href="/fleet-solutions"
                className="group/cta inline-flex items-center gap-3 px-6 sm:px-7 py-3 sm:py-3.5 rounded-none border-2 border-black dark:border-white text-zinc-900 dark:text-white bg-transparent hover:bg-[var(--brand-primary)] hover:border-[var(--brand-primary)] hover:text-white transition-all duration-300 font-bold text-xs sm:text-sm uppercase tracking-wider select-none shadow-sm"
              >
                <span>Sign up your Fleet</span>
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2] transition-transform duration-300 group-hover/cta:translate-x-1 group-hover/cta:-translate-y-1"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 17L17 7M7 7h10v10"
                  />
                </svg>
              </Link>
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: Realistic Commercial Fleet Image Card      */}
          {/* ======================================================== */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="group/image relative w-full h-full min-h-[420px] sm:min-h-[480px] lg:min-h-[520px] rounded-none overflow-hidden border border-black/15 dark:border-white/10 bg-zinc-950 shadow-2xl flex flex-col justify-between">
              
              {/* Background Photography (Heavy Commercial Fleet Truck) */}
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src="/fleet-manager.jpg"
                  alt="Commercial Fleet Logistics and Tire Maintenance"
                  className="w-full h-full object-cover object-center group-hover/image:scale-105 transition-transform duration-700 ease-out"
                />
                
                {/* Radiant Gradient Vignette for dramatic luxury contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Top Floating Badge */}
              <div className="relative z-10 p-5 sm:p-6 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-none bg-black/60 backdrop-blur-md border border-white/20 text-white text-[11px] sm:text-xs font-bold uppercase tracking-wider shadow-lg">
                  <span className="w-2 h-2 rounded-none bg-[var(--brand-primary)] animate-pulse" />
                  B2B Fleet Portal
                </span>
                <span className="text-[11px] font-mono text-zinc-300 bg-black/50 backdrop-blur-md px-2 py-0.5 border border-white/10 rounded-none">
                  PORTAL ACTIVE
                </span>
              </div>

              {/* Bottom Telemetry Card */}
              <div className="relative z-10 p-5 sm:p-6 mt-auto">
                <div className="p-4 rounded-none bg-black/70 backdrop-blur-md border border-white/10 text-white">
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                    <span className="font-semibold text-[var(--brand-primary)] uppercase tracking-wider text-[10px]">
                      Single Master Invoice
                    </span>
                    <span className="text-[10px]">Zero Driver Downtime</span>
                  </div>
                  <h4 className="text-base sm:text-lg font-bold text-white leading-tight">
                    Dedicated Fleet Command
                  </h4>
                  <p className="text-xs text-zinc-300 mt-1 line-clamp-2">
                    Priority on-site scheduling, automatic telemetry logs, and dedicated B2B account managers.
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}

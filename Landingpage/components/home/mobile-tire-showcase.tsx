"use client";

import Link from "next/link";

export default function MobileTireShowcase() {
  return (
    <section className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* 
        Outer Container Card:
        Sharp brutalist lines (rounded-none), zero rounded corners.
        Ultra-clean border, attractive dark/light contrast.
      */}
      <div className="relative rounded-none bg-white/70 dark:bg-[#080d1a]/85 backdrop-blur-md border border-black/15 dark:border-white/10 p-6 sm:p-10 lg:p-12 overflow-hidden shadow-2xl">
        
        {/* Subtle Ambient Crimson Glow */}
        <div className="pointer-events-none absolute -right-24 -top-24 w-96 h-96 bg-[var(--brand-primary)]/15 blur-3xl rounded-none" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 w-80 h-80 bg-[var(--brand-primary)]/10 blur-3xl rounded-none" />

        {/* Micro-grid overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#00000006_1px,transparent_1px),linear-gradient(to_bottom,#00000006_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:2rem_2rem]" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          
          {/* ======================================================== */}
          {/* LEFT COLUMN: Header, Bordered Quote Box, and Learn More  */}
          {/* ======================================================== */}
          <div className="lg:col-span-6 flex flex-col justify-between text-left">
            <div>
              {/* 1. Square Marker & Subheading matching Wireframe */}
              <div className="flex items-center gap-2.5 mb-3 sm:mb-4">
                <span className="w-3 h-3 bg-black dark:bg-[var(--brand-primary)] inline-block shrink-0 shadow-sm rounded-none" />
                <span className="text-xs sm:text-sm font-bold tracking-widest uppercase text-zinc-800 dark:text-zinc-200 font-sans">
                  XTREME MOBILE TIRE SOLUTIONS
                </span>
              </div>

              {/* 2. Main Title - Two-font alternating style */}
              <h2 className="text-2xl sm:text-3xl md:text-4xl tracking-tight text-[var(--neutral-dark)] leading-[1.15] mb-6 sm:mb-8">
                <span className="font-sans font-extrabold text-[var(--neutral-dark)]">
                  Professional{" "}
                </span>
                <span className="font-serif italic font-normal text-[var(--neutral-dark)]">
                  mobile tire services
                </span>
              </h2>

              {/* 3. Bordered Text Box matching Wireframe (Simple font, clean size) */}
              <div className="relative rounded-none border border-black/20 dark:border-white/20 bg-zinc-50/80 dark:bg-white/[0.04] p-6 sm:p-8 shadow-sm hover:border-[var(--brand-primary)]/50 transition-colors group/box">
                {/* Subtle Crimson Accent Bar on left edge */}
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-transparent group-hover/box:bg-[var(--brand-primary)] transition-colors rounded-none" />

                <p className="font-sans text-sm sm:text-base lg:text-lg leading-relaxed text-zinc-700 dark:text-zinc-300 font-normal">
                  Xtreme Mobile Tire brings expert tire services directly to your home, workplace, or roadside..
                </p>
              </div>
            </div>

            {/* 4. Bottom "Learn More" Action Row matching Wireframe */}
            <div className="pt-10 sm:pt-14 mt-auto">
              <Link
                href="/services"
                className="group block w-full focus:outline-none select-none"
              >
                <div className="flex items-center justify-between gap-4 pb-3 border-b-2 border-black/20 dark:border-white/20 group-hover:border-[var(--brand-primary)] transition-colors">
                  <span className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-[var(--neutral-dark)] group-hover:text-[var(--brand-primary)] transition-colors">
                    Learn More
                  </span>
                  
                  {/* Sleek directional arrow */}
                  <svg
                    className="w-8 h-8 sm:w-9 sm:h-9 text-[var(--neutral-dark)] group-hover:text-[var(--brand-primary)] group-hover:translate-x-2 group-hover:-translate-y-1 transition-all duration-300 stroke-[1.6]"
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
                </div>
              </Link>
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: Tall Picture Frame (Sharp rounded-none)    */}
          {/* ======================================================== */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="group/image relative w-full h-full min-h-[420px] sm:min-h-[480px] lg:min-h-[520px] rounded-none overflow-hidden border border-black/15 dark:border-white/10 bg-zinc-950 shadow-2xl flex flex-col justify-between">
              
              {/* Background Photography (High-performance vehicle with custom wheels/tires at dusk) */}
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src="https://res.cloudinary.com/ebjikx52/image/upload/v1792426893/xtreme/landing/wheel-car_jpg.png"
                  alt="Professional Mobile Tire Service"
                  className="w-full h-full object-cover object-center group-hover/image:scale-105 transition-transform duration-700 ease-out"
                />
                
                {/* Radiant Gradient Vignette for dramatic luxury contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Bottom Image Details & Telemetry */}
              <div className="relative z-10 p-5 sm:p-6 mt-auto">
                <div className="p-4 rounded-none bg-black/70 backdrop-blur-md border border-white/10 text-white">
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                    <span className="font-semibold text-[var(--brand-primary)] uppercase tracking-wider text-[10px]">
                      Professional On-Site Mounting
                    </span>
                    <span className="text-[10px]">Commercial Grade</span>
                  </div>
                  <h4 className="text-base sm:text-lg font-bold text-white leading-tight">
                    Next-Gen Mobile Bay Unit
                  </h4>
                  <p className="text-xs text-zinc-300 mt-1 line-clamp-2">
                    Commercial tire changers, dynamic computer balancing, and fast roadside blowout recovery.
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

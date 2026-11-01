"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function AboutServicesCta() {
  return (
    <section className="relative z-10 w-full bg-transparent text-zinc-950 dark:text-white py-10 sm:py-16 lg:py-20 border-t border-black/5 dark:border-white/5">
      <div className="max-w-6xl mx-auto px-3.5 xs:px-4 sm:px-6 lg:px-8">
        {/* 
          CARD CONTAINER:
          - Responsive on both sides: Centered with balanced gutters and proportional padding.
          - Light Mode: Clean pure white card (bg-white border-black/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]).
          - Dark Mode: Rich luxury obsidian card (dark:bg-[#111317] dark:border-white/10 dark:shadow-2xl).
          - Blueprint corner crosshairs (+) with clean elevation.
        */}
        <div className="relative w-full rounded-none bg-white dark:bg-[#111317] border border-black/10 dark:border-white/10 px-4 xs:px-6 sm:px-12 md:px-16 lg:px-20 py-8 xs:py-10 sm:py-14 lg:py-16 transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-2xl overflow-hidden group">
          
          {/* Subtle Blueprint Crosshair Marks at corners */}
          <span className="absolute top-2 left-2 font-mono text-xs text-zinc-400/60 dark:text-zinc-600/60 select-none pointer-events-none">+</span>
          <span className="absolute top-2 right-2 font-mono text-xs text-zinc-400/60 dark:text-zinc-600/60 select-none pointer-events-none">+</span>
          <span className="absolute bottom-2 left-2 font-mono text-xs text-zinc-400/60 dark:text-zinc-600/60 select-none pointer-events-none">+</span>
          <span className="absolute bottom-2 right-2 font-mono text-xs text-zinc-400/60 dark:text-zinc-600/60 select-none pointer-events-none">+</span>

          <div className="relative z-10 max-w-xl lg:max-w-2xl space-y-6 sm:space-y-12">
            {/* 
              MAIN HEADLINE:
              Strict 3-line cadence matching wireframe
            */}
            <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-[44px] font-medium tracking-tight text-zinc-950 dark:text-white leading-[1.22] font-sans">
              24/7 mobile tire and roadside
              <br className="hidden sm:inline" />{" "}
              service, delivered wherever
              <br className="hidden sm:inline" />{" "}
              you are.
            </h2>

            {/* 
              ACTION LINK:
              "Our Services" + Arrow ↗ with continuous underline spanning across
            */}
            <div className="pt-2">
              <Link
                href="/services"
                className="inline-flex items-center justify-between gap-4 sm:gap-6 pb-2.5 border-b-2 border-zinc-900/40 dark:border-white/50 hover:border-[var(--brand-primary)] dark:hover:border-[var(--brand-primary)] group/link transition-all duration-300 w-full max-w-[280px] sm:max-w-[340px] min-h-[44px]"
              >
                <span className="text-lg xs:text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white group-hover/link:text-[var(--brand-primary)] transition-colors">
                  Our Services
                </span>
                
                <ArrowUpRight className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-950 dark:text-white group-hover/link:text-[var(--brand-primary)] group-hover/link:translate-x-1 group-hover/link:-translate-y-1 transition-all duration-300 shrink-0" />
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

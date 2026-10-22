"use client";

import React from "react";
import { Phone, Mail } from "lucide-react";

export default function DispatchContactBar() {
  return (
    <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 my-6 sm:my-8">
      {/* 
        24/7 FLEET DISPATCH CONTACT BAR
        - Sharp brutalist box (rounded-none)
        - High-contrast background in both light and dark modes
        - Clickable tel: and mailto: links with hover micro-transitions
        - Fully responsive wrapping on mobile screens
      */}
      <div className="w-full rounded-none border border-black/15 dark:border-white/15 bg-zinc-100/90 dark:bg-zinc-900/80 backdrop-blur-md p-3.5 sm:p-4 lg:p-5 flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-2.5 text-center text-xs sm:text-sm md:text-base font-medium text-zinc-800 dark:text-zinc-200 shadow-sm hover:border-[var(--brand-primary)]/40 transition-colors">
        
        {/* Headline Label with pulsing Phone icon */}
        <div className="flex items-center gap-2 font-bold text-zinc-950 dark:text-white shrink-0">
          <Phone className="w-4 h-4 text-[var(--brand-primary)] shrink-0 animate-pulse" />
          <span>24/7 Fleet Dispatch:</span>
        </div>

        {/* Contact Numbers Row */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
          {/* US Dispatch */}
          <a
            href="tel:+18043265442"
            className="hover:text-[var(--brand-primary)] transition-colors cursor-pointer whitespace-nowrap group/link"
          >
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover/link:text-[var(--brand-primary)]">
              (804) 326-5442
            </span>{" "}
            <span className="text-zinc-500 text-xs font-normal">(US)</span>
          </a>

          <span className="text-zinc-400 dark:text-zinc-600 hidden sm:inline select-none">|</span>

          {/* CA Dispatch */}
          <a
            href="tel:+14373755674"
            className="hover:text-[var(--brand-primary)] transition-colors cursor-pointer whitespace-nowrap group/link"
          >
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover/link:text-[var(--brand-primary)]">
              (437) 375-5674
            </span>{" "}
            <span className="text-zinc-500 text-xs font-normal">(CA)</span>
          </a>

          <span className="text-zinc-400 dark:text-zinc-600 hidden sm:inline select-none">|</span>

          {/* UK Dispatch */}
          <a
            href="tel:+441630234331"
            className="hover:text-[var(--brand-primary)] transition-colors cursor-pointer whitespace-nowrap group/link"
          >
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover/link:text-[var(--brand-primary)]">
              +44 1630 234331
            </span>{" "}
            <span className="text-zinc-500 text-xs font-normal">(UK)</span>
          </a>

          <span className="text-zinc-400 dark:text-zinc-600 hidden sm:inline select-none">|</span>

          {/* Official Email */}
          <a
            href="mailto:Info@Xtrememobiletire.com"
            className="inline-flex items-center gap-1.5 hover:text-[var(--brand-primary)] transition-colors cursor-pointer whitespace-nowrap group/link"
          >
            <Mail className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover/link:text-[var(--brand-primary)]">
              Info@Xtrememobiletire.com
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}

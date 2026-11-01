"use client";

import React from "react";
import { Phone, Mail } from "lucide-react";

export default function DispatchContactBar() {
  return (
    <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 my-3 sm:my-4">
      {/* 
        24/7 FLEET DISPATCH CONTACT BAR
        - Open-ended on left and right sides (border-y border-x-0)
        - Narrow height with compact vertical padding
        - Clickable tel: and mailto: links with hover micro-transitions
      */}
      <div className="w-full rounded-none border-y border-x-0 border-black/15 dark:border-white/15 bg-zinc-100/90 dark:bg-zinc-900/80 backdrop-blur-md py-2 sm:py-2.5 px-3 sm:px-6 flex flex-col sm:flex-row flex-wrap lg:flex-nowrap items-center justify-center gap-x-3 sm:gap-x-5 gap-y-1.5 sm:gap-y-1 text-center text-xs sm:text-[13px] md:text-sm font-medium text-zinc-800 dark:text-zinc-200 shadow-sm transition-colors">
        
        {/* Headline Label with pulsing Phone icon */}
        <div className="flex items-center gap-2 font-bold text-zinc-950 dark:text-white shrink-0 py-1">
          <Phone className="w-4 h-4 text-[var(--brand-primary)] shrink-0 animate-pulse" />
          <span>24/7 Fleet Dispatch:</span>
        </div>

        {/* Contact Numbers Row */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-4 gap-y-1 sm:gap-y-1.5">
          {/* US Dispatch */}
          <a
            href="tel:+18043265442"
            className="hover:text-[var(--brand-primary)] transition-colors cursor-pointer whitespace-nowrap group/link min-h-[36px] inline-flex items-center px-1.5 py-1"
          >
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover/link:text-[var(--brand-primary)]">
              (804) 326-5442
            </span>{" "}
            <span className="text-zinc-500 text-xs font-normal ml-1">(US)</span>
          </a>

          <span className="text-zinc-400 dark:text-zinc-600 hidden md:inline select-none">|</span>

          {/* CA Dispatch */}
          <a
            href="tel:+14373755674"
            className="hover:text-[var(--brand-primary)] transition-colors cursor-pointer whitespace-nowrap group/link min-h-[36px] inline-flex items-center px-1.5 py-1"
          >
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover/link:text-[var(--brand-primary)]">
              (437) 375-5674
            </span>{" "}
            <span className="text-zinc-500 text-xs font-normal ml-1">(CA)</span>
          </a>

          <span className="text-zinc-400 dark:text-zinc-600 hidden md:inline select-none">|</span>

          {/* UK Dispatch */}
          <a
            href="tel:+441630234331"
            className="hover:text-[var(--brand-primary)] transition-colors cursor-pointer whitespace-nowrap group/link min-h-[36px] inline-flex items-center px-1.5 py-1"
          >
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover/link:text-[var(--brand-primary)]">
              +44 1630 234331
            </span>{" "}
            <span className="text-zinc-500 text-xs font-normal ml-1">(UK)</span>
          </a>

          <span className="text-zinc-400 dark:text-zinc-600 hidden md:inline select-none">|</span>

          {/* Official Email */}
          <a
            href="mailto:Info@Xtrememobiletire.com"
            className="inline-flex items-center gap-1.5 hover:text-[var(--brand-primary)] transition-colors cursor-pointer break-all sm:break-normal min-h-[36px] px-1.5 py-1 group/link"
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

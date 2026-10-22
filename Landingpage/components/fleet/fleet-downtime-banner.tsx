"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Phone, Mail, ArrowUpRight } from "lucide-react";

export default function FleetDowntimeBanner() {
  return (
    <section className="w-full py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-zinc-300 dark:border-zinc-800">
      {/* 
        TOP PICTURE BANNER (Matching Wireframe Image Box)
        - Sharp rectangular box (rounded-none)
        - Blueprint crosshairs (+) at corners
        - High-resolution commercial fleet photography
        - Serif display headline: "Ready to Eliminate Fleet Downtime Across the USA, UK and Canada?"
      */}
      <div className="relative w-full rounded-none overflow-hidden border border-zinc-300 dark:border-zinc-800 bg-zinc-950 min-h-[380px] sm:min-h-[440px] lg:min-h-[480px] flex items-center justify-center p-8 sm:p-14 lg:p-20 shadow-2xl group">
        {/* Background Commercial Fleet Image */}
        <div className="absolute inset-0 w-full h-full">
          <Image
            src="https://res.cloudinary.com/ebjikx52/image/upload/v1792426862/xtreme/landing/fleet-semi_jpg.jpg"
            alt="Commercial Fleet on Highway"
            fill
            className="object-cover object-center opacity-45 transition-transform duration-1000 ease-out group-hover:scale-105"
            sizes="(max-width: 1280px) 100vw, 1280px"
            priority
          />
        </div>

        {/* Cinematic Vignette Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-black/85 z-[1]" />
        <div
          className="absolute inset-0 opacity-10 pointer-events-none z-[2]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.25) 1px, transparent 0)`,
            backgroundSize: "24px 24px",
          }}
        />

        {/* Blueprint Crosshair Marks (+) at corners */}
        <span className="absolute top-3 left-3 font-mono text-xs text-white/50 select-none pointer-events-none z-10">+</span>
        <span className="absolute top-3 right-3 font-mono text-xs text-white/50 select-none pointer-events-none z-10">+</span>
        <span className="absolute bottom-3 left-3 font-mono text-xs text-white/50 select-none pointer-events-none z-10">+</span>
        <span className="absolute bottom-3 right-3 font-mono text-xs text-white/50 select-none pointer-events-none z-10">+</span>

        {/* Content Container */}
        <div className="relative z-10 max-w-3xl text-center sm:text-left space-y-6 sm:space-y-8">
          {/* Eyebrow */}
          <div className="flex items-center justify-center sm:justify-start gap-2.5">
            <span className="w-2.5 h-2.5 bg-[#DC2626] rounded-none inline-block shadow-sm" />
            <span className="text-xs sm:text-sm font-mono font-bold tracking-widest uppercase text-zinc-300">
              National Commercial Coverage
            </span>
          </div>

          {/* Headline in Clean Bold Sans Font - using "and", not "&" */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[54px] font-bold tracking-tight text-white leading-[1.15]">
            Ready to Eliminate Fleet Downtime Across the USA, UK and Canada?
          </h2>

          {/* Action Button */}
          <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#DC2626] text-white hover:bg-white hover:text-black font-semibold text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 rounded-none shadow-lg shadow-red-950/40 cursor-pointer group/cta"
            >
              <span>Open Fleet Account</span>
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
            </Link>
            <Link
              href="/booking"
              className="inline-flex items-center gap-2 px-8 py-3.5 border border-white/40 text-white hover:bg-white/10 font-semibold text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 rounded-none cursor-pointer"
            >
              Request Live Quote
            </Link>
          </div>
        </div>
      </div>

      {/* 
        BOTTOM DISPATCH BAR (Matching Wireframe Ticker)
        - 24/7 Fleet Dispatch phone numbers
        - Sharp rectangular bar (rounded-none)
        - Clickable tel: links with hand cursor
      */}
      <div className="mt-4 sm:mt-6 w-full rounded-none border border-zinc-300 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/70 p-4 sm:p-5 flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-2 text-center text-xs sm:text-sm md:text-base font-medium text-zinc-800 dark:text-zinc-200">
        <div className="flex items-center gap-2 font-bold text-zinc-950 dark:text-white">
          <Phone className="w-4 h-4 text-[#DC2626] shrink-0" />
          <span>24/7 Fleet Dispatch:</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <a
            href="tel:+18043265442"
            className="hover:text-[#DC2626] transition-colors cursor-pointer whitespace-nowrap"
          >
            <span className="font-semibold">(804) 326-5442</span> <span className="text-zinc-500 text-xs">(US)</span>
          </a>
          <span className="text-zinc-400 dark:text-zinc-600">|</span>
          <a
            href="tel:+14373755674"
            className="hover:text-[#DC2626] transition-colors cursor-pointer whitespace-nowrap"
          >
            <span className="font-semibold">(437) 375-5674</span> <span className="text-zinc-500 text-xs">(CA)</span>
          </a>
          <span className="text-zinc-400 dark:text-zinc-600">|</span>
          <a
            href="tel:+441630234331"
            className="hover:text-[#DC2626] transition-colors cursor-pointer whitespace-nowrap"
          >
            <span className="font-semibold">+44 1630 234331</span> <span className="text-zinc-500 text-xs">(UK)</span>
          </a>
          <span className="text-zinc-400 dark:text-zinc-600 hidden sm:inline select-none">|</span>
          <a
            href="mailto:Info@Xtrememobiletire.com"
            className="inline-flex items-center gap-1.5 hover:text-[#DC2626] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Mail className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
            <span className="font-semibold">Info@Xtrememobiletire.com</span>
          </a>
        </div>
      </div>
    </section>
  );
}

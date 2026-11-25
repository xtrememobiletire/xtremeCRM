"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Phone, Mail, ArrowUpRight } from "lucide-react";

export default function FleetDowntimeBanner() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full py-10 xs:py-12 sm:py-16 lg:py-20 px-3.5 xs:px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-zinc-300 dark:border-zinc-800"
    >
      {/* 
        TOP PICTURE BANNER (Matching Wireframe Image Box)
        - 2-tier corner geometry token system (rounded-2xl shell)
        - Blueprint crosshairs (+) at corners
        - High-resolution commercial fleet photography
      */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-zinc-300 dark:border-zinc-800 bg-zinc-950 min-h-[320px] xs:min-h-[380px] sm:min-h-[440px] lg:min-h-[480px] flex items-center justify-center p-4 xs:p-8 sm:p-14 lg:p-20 shadow-2xl group">
        {/* Background Commercial Fleet Image */}
        <div className="absolute inset-0 w-full h-full">
          <Image
            src="https://res.cloudinary.com/ebjikx52/image/upload/v1792426862/xtreme/landing/fleet-semi_jpg.jpg"
            alt="Commercial Fleet on Highway"
            fill
            unoptimized
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
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: "24px 24px",
          }}
        />

        {/* Blueprint Crosshair Marks (+) at corners */}
        <span className="absolute top-2.5 xs:top-3 left-2.5 xs:left-3 font-mono text-[10px] xs:text-xs text-white/50 select-none pointer-events-none z-10">+</span>
        <span className="absolute top-2.5 xs:top-3 right-2.5 xs:right-3 font-mono text-[10px] xs:text-xs text-white/50 select-none pointer-events-none z-10">+</span>
        <span className="absolute bottom-2.5 xs:bottom-3 left-2.5 xs:left-3 font-mono text-[10px] xs:text-xs text-white/50 select-none pointer-events-none z-10">+</span>
        <span className="absolute bottom-2.5 xs:bottom-3 right-2.5 xs:right-3 font-mono text-[10px] xs:text-xs text-white/50 select-none pointer-events-none z-10">+</span>

        {/* Content Container */}
        <div className="relative z-10 max-w-3xl text-center sm:text-left space-y-4 xs:space-y-6 sm:space-y-8">
          {/* Eyebrow */}
          <div className="flex items-center justify-center sm:justify-start gap-2.5">
            <span className="w-2.5 h-2.5 bg-[var(--brand-primary)] rounded-none inline-block shadow-sm" />
            <span className="text-[11px] xs:text-xs sm:text-sm font-mono font-bold tracking-widest uppercase text-zinc-300">
              National Commercial Coverage
            </span>
          </div>

          {/* Headline in Clean Bold Sans Font + Serif Italic Brand Accent */}
          <h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-[54px] font-bold tracking-tight text-white leading-[1.15]">
            <span className="font-sans font-bold text-white">
              Ready to Eliminate Fleet Downtime Across the{" "}
            </span>
            <span className="font-serif italic font-normal text-[var(--brand-primary)]">
              USA, UK and Canada?
            </span>
          </h2>

          {/* Action Button */}
          <div className="pt-2 flex flex-col xs:flex-row items-center justify-center sm:justify-start gap-3 xs:gap-4 w-full xs:w-auto">
            <button
              type="button"
              onClick={() => {
                const target = document.getElementById("create-fleet-account");
                if (target) {
                  target.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
              className="w-full xs:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 bg-[var(--brand-primary)] text-white hover:bg-white hover:text-black font-semibold text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 rounded-none shadow-lg shadow-red-950/40 cursor-pointer group/cta"
            >
              <span>Open Fleet Account</span>
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
            </button>
            <Link
              href="/booking"
              className="w-full xs:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 border border-white/40 text-white hover:bg-white/10 font-semibold text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 rounded-none cursor-pointer"
            >
              Request Live Quote
            </Link>
          </div>
        </div>
      </div>

      {/* 
        BOTTOM DISPATCH BAR (Matching Wireframe Ticker)
        - 24/7 Fleet Dispatch phone numbers
        - Rounded-xl inner card
        - Clickable tel: links with hand cursor
      */}
      <div className="mt-4 sm:mt-6 w-full rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/70 p-3.5 xs:p-4 sm:p-5 flex flex-wrap items-center justify-center gap-x-3 xs:gap-x-4 sm:gap-x-6 gap-y-2 text-center text-xs sm:text-sm md:text-base font-medium text-zinc-800 dark:text-zinc-200">
        <div className="flex items-center gap-2 font-bold text-zinc-950 dark:text-white">
          <Phone className="w-4 h-4 text-[var(--brand-primary)] shrink-0" />
          <span>24/7 Fleet Dispatch:</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-3 xs:gap-x-4 gap-y-1">
          <a
            href="mailto:Info@Xtrememobiletire.com"
            className="inline-flex items-center gap-1.5 hover:text-[var(--brand-primary)] transition-colors cursor-pointer break-all sm:break-normal min-h-[36px]"
          >
            <Mail className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
            <span className="font-semibold">Info@Xtrememobiletire.com</span>
          </a>
        </div>
      </div>
    </motion.section>
  );
}

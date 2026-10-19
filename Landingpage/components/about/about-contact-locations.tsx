"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Mail, MapPin, ArrowUpRight } from "lucide-react";

interface LocationItem {
  id: string;
  code: string;
  name: string;
  country: string;
  flag: string;
  line1: string;
  line2: string;
  phone: string;
  phoneRaw: string;
  email: string;
}

const LOCATIONS: LocationItem[] = [
  {
    id: "uk",
    code: "UK",
    name: "United Kingdom",
    country: "United Kingdom",
    flag: "/flags/uk.svg",
    line1: "10 Downing Street, London",
    line2: "SW1A 2AA, United Kingdom",
    phone: "+44 1630 234331",
    phoneRaw: "+441630234331",
    email: "Info@xtrememobiletire.com",
  },
  {
    id: "us",
    code: "US",
    name: "United States",
    country: "USA",
    flag: "/flags/us.svg",
    line1: "11815 Medway Church Loop",
    line2: "Manassas, VA 20109, USA",
    phone: "(804) 326-5442",
    phoneRaw: "+18043265442",
    email: "Info@Xtrememobiletire.com",
  },
  {
    id: "cad",
    code: "CAD",
    name: "Canada",
    country: "Canada",
    flag: "/flags/ca.svg",
    line1: "857 Winterton Way, Mississauga, ON L5V 1Z5",
    line2: "Canada",
    phone: "(437) 375-5674",
    phoneRaw: "+14373755674",
    email: "Info@Xtrememobiletire.com",
  },
];

// Circular progress animation timings (5 seconds per location, 25ms tick)
const DURATION_MS = 5000;
const INTERVAL_MS = 25;

// SVG circle metrics
const RADIUS = 34;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~213.63

export default function AboutContactLocations() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // Auto-advancing progress timer that loops through UK -> US -> Canada
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (INTERVAL_MS / DURATION_MS) * 100;
        if (next >= 100) {
          setActiveIndex((curr) => (curr + 1) % LOCATIONS.length);
          return 0;
        }
        return next;
      });
    }, INTERVAL_MS);

    return () => clearInterval(timer);
  }, [activeIndex]);

  const handleSelectLocation = (idx: number) => {
    setActiveIndex(idx);
    setProgress(0);
  };

  const current = LOCATIONS[activeIndex];
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress / 100);

  return (
    <section className="relative z-10 w-full bg-transparent text-zinc-950 dark:text-white py-12 sm:py-16 lg:py-20 border-t border-black/5 dark:border-white/5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 
          MAIN CARD CONTAINER:
          - Crisp, pure white in Light Mode (bg-white border-black/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]).
          - Deep, rich luxury obsidian in Dark Mode (dark:bg-[#111317] dark:border-white/10 dark:shadow-2xl).
          - Clean, elegant, and modern with blueprint corner crosshairs (+) and no muddy grid tint.
        */}
        <div className="relative w-full rounded-none bg-white dark:bg-[#111317] border border-black/10 dark:border-white/10 p-6 sm:p-10 md:p-12 lg:p-14 min-h-[380px] sm:min-h-[400px] md:min-h-[420px] transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-2xl overflow-hidden group">
          
          {/* Blueprint Crosshair Marks at corners */}
          <span className="absolute top-2.5 left-2.5 font-mono text-xs text-zinc-400/60 dark:text-zinc-600/60 select-none pointer-events-none">+</span>
          <span className="absolute top-2.5 right-2.5 font-mono text-xs text-zinc-400/60 dark:text-zinc-600/60 select-none pointer-events-none">+</span>
          <span className="absolute bottom-2.5 left-2.5 font-mono text-xs text-zinc-400/60 dark:text-zinc-600/60 select-none pointer-events-none">+</span>
          <span className="absolute bottom-2.5 right-2.5 font-mono text-xs text-zinc-400/60 dark:text-zinc-600/60 select-none pointer-events-none">+</span>

          {/* 
            TWO-COLUMN SPLIT:
            - Left: "Get In Touch" headline and subtitle.
            - Vertical Divider: Separates left & right columns on md/lg screens.
            - Right: 3 Circular status tabs with national flags + dynamic location details.
          */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 lg:gap-12 items-center">
            
            {/* ======================================================== */}
            {/* LEFT COLUMN: Get In Touch (Matching Wireframe)            */}
            {/* ======================================================== */}
            <div className="md:col-span-5 md:pr-4 lg:pr-6 flex flex-col justify-center space-y-4 sm:space-y-6">
              
              {/* Category Eyebrow */}
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[var(--brand-primary)] inline-block shrink-0 rounded-none shadow-sm" />
                <span className="text-xs font-mono font-bold tracking-widest uppercase text-zinc-600 dark:text-zinc-400">
                  Direct Contact and Support
                </span>
              </div>

              {/* Main Headline */}
              <h2 className="text-4xl sm:text-5xl lg:text-[54px] font-bold tracking-tight text-zinc-950 dark:text-white leading-[1.08]">
                Get In Touch
              </h2>

              {/* Subtitle */}
              <p className="text-base sm:text-lg md:text-xl text-zinc-700 dark:text-zinc-300 font-sans tracking-tight font-medium">
                Book Now or Request a Quote
              </p>

              {/* Action Link button */}
              <div className="pt-2">
                <Link
                  href="/booking"
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-950 dark:text-white hover:text-[var(--brand-primary)] dark:hover:text-[var(--brand-primary)] transition-colors group/cta"
                >
                  <span>Schedule Immediate Service</span>
                  <ArrowUpRight className="w-4 h-4 text-[var(--brand-primary)] group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5 transition-transform" />
                </Link>
              </div>

            </div>

            {/* ======================================================== */}
            {/* RIGHT COLUMN: Circular Status Tabs with Flags + Details   */}
            {/* ======================================================== */}
            <div className="md:col-span-7 md:border-l border-zinc-300 dark:border-zinc-700/80 md:pl-8 lg:pl-12 flex flex-col justify-center space-y-8 sm:space-y-10">
              
              {/* 
                CIRCULAR TABS ROW:
                - 3 circles: UK, US, CAD
                - National flag inside each circle (clipped cleanly to circle)
                - Circular SVG status bar running around the active circle
                - On status line complete, auto-advances to next country
                - Clickable to immediately switch country
              */}
              <div className="flex items-center justify-start gap-5 sm:gap-7 lg:gap-8 select-none">
                {LOCATIONS.map((loc, idx) => {
                  const isActive = idx === activeIndex;

                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => handleSelectLocation(idx)}
                      className="group/circle flex flex-col items-center gap-2.5 focus:outline-none transition-transform duration-200"
                      title={`${loc.name} - Click to switch`}
                    >
                      {/* Circle Container with SVG Status Ring */}
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                        
                        {/* SVG Progress Ring */}
                        <svg
                          className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
                          viewBox="0 0 80 80"
                        >
                          {/* Neutral Background Track */}
                          <circle
                            cx="40"
                            cy="40"
                            r={RADIUS}
                            fill="none"
                            className="stroke-zinc-300 dark:stroke-zinc-700/90"
                            strokeWidth={isActive ? "3.5" : "2.5"}
                          />
                          {/* Active Red Progress Stroke */}
                          {isActive && (
                            <circle
                              cx="40"
                              cy="40"
                              r={RADIUS}
                              fill="none"
                              stroke="var(--brand-primary)"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              strokeDasharray={CIRCUMFERENCE}
                              strokeDashoffset={strokeDashoffset}
                              className="transition-[stroke-dashoffset] duration-75 ease-linear shadow-sm"
                            />
                          )}
                        </svg>

                        {/* Circular Flag Inner Avatar */}
                        <div
                          className={`relative w-12 h-12 sm:w-15 sm:h-15 rounded-full overflow-hidden border transition-all duration-300 shadow-md ${
                            isActive
                              ? "border-white dark:border-zinc-900 scale-100 ring-2 ring-[var(--brand-primary)]/20"
                              : "border-black/15 dark:border-white/15 opacity-70 group-hover/circle:opacity-100 group-hover/circle:scale-105"
                          }`}
                        >
                          <Image
                            src={loc.flag}
                            alt={`${loc.name} flag`}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover object-center"
                            unoptimized
                          />
                        </div>
                      </div>

                      {/* Country Code Label matching wireframe (UK, US, CAD) */}
                      <span
                        className={`text-xs sm:text-sm font-bold tracking-wider uppercase font-mono transition-colors ${
                          isActive
                            ? "text-zinc-950 dark:text-white"
                            : "text-zinc-600 dark:text-zinc-400 group-hover/circle:text-zinc-900 dark:group-hover/circle:text-white"
                        }`}
                      >
                        {loc.code}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 
                DYNAMIC ACTIVE COUNTRY ADDRESS & CONTACT DETAILS:
                - Fixed height container so card height never changes
                - Exactly 2 lines for address (line1 and line2)
                - Exactly 1 line for phone number
                - Exactly 1 line for email with underline
                - Zero layout shift: UK, US, and Canada occupy the identical height
              */}
              <div className="relative h-[150px] sm:h-[160px] w-full flex items-start overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={current.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="space-y-2.5 sm:space-y-3 w-full"
                  >
                    {/* Address in only two lines (Clean, simple, modern sans-serif) */}
                    <div className="text-base sm:text-lg md:text-xl text-zinc-700 dark:text-zinc-300 font-normal leading-snug tracking-tight font-sans">
                      <p className="truncate">{current.line1}</p>
                      <p className="truncate">{current.line2}</p>
                    </div>

                    {/* Phone Number in one line */}
                    <p className="text-base sm:text-lg md:text-xl text-zinc-900 dark:text-white font-medium tracking-tight truncate font-sans">
                      <a
                        href={`tel:${current.phoneRaw}`}
                        className="hover:text-[var(--brand-primary)] dark:hover:text-[var(--brand-primary)] transition-colors inline-flex items-center gap-2"
                      >
                        <Phone className="w-4 h-4 text-[var(--brand-primary)] shrink-0 inline md:hidden" />
                        <span>{current.phone}</span>
                      </a>
                    </p>

                    {/* Email with continuous underline */}
                    <p className="text-base sm:text-lg md:text-xl text-zinc-900 dark:text-white font-medium tracking-tight pt-0.5 truncate font-sans">
                      <a
                        href={`mailto:${current.email}`}
                        className="underline underline-offset-4 decoration-zinc-400 dark:decoration-zinc-600 hover:decoration-[var(--brand-primary)] hover:text-[var(--brand-primary)] dark:hover:text-[var(--brand-primary)] transition-all inline-flex items-center gap-2"
                      >
                        <Mail className="w-4 h-4 text-[var(--brand-primary)] shrink-0 inline md:hidden" />
                        <span>{current.email}</span>
                      </a>
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

            </div>

          </div>

        </div>
      </div>
    </section>
  );
}

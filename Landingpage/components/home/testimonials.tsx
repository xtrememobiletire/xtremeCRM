"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TestimonialItem {
  id: string;
  name: string;
  role: string;
  company: string;
  quote: string;
  avatarSrc: string;
  avatarAlt: string;
}

const TESTIMONIALS: TestimonialItem[] = [
  {
    id: "jennifer",
    name: "Jennifer Walsh",
    role: "Director of Fleet Operations",
    company: "Apex Freight Logistics",
    avatarSrc: "/avatar-1.jpg",
    avatarAlt: "Jennifer Walsh - Apex Freight",
    quote:
      "Xtreme Mobile Tire completely transformed how our commercial logistics operations run. Roadside blowout downtime dropped by 65% and our drivers are back on the highway in under 40 minutes.",
  },
  {
    id: "marcus",
    name: "Marcus Vance",
    role: "Regional Dispatch Manager",
    company: "Metro Delivery Express",
    avatarSrc: "/avatar-2.jpg",
    avatarAlt: "Marcus Vance - Metro Delivery",
    quote:
      "Having certified mechanics service our 48 delivery vans right at the depot during driver shift changeovers has been a total game changer. Zero yard disruption, zero lost driver hours.",
  },
  {
    id: "elena",
    name: "Elena Rostova",
    role: "Fleet Maintenance Lead",
    company: "Titan Heavy Haulage",
    avatarSrc: "/avatar-3.jpg",
    avatarAlt: "Elena Rostova - Titan Heavy Haulage",
    quote:
      "The automated tread depth telemetry and bi-weekly master billing gave our management team absolute transparency. Their TIA certified mobile mechanics are the best in the industry.",
  },
  {
    id: "david",
    name: "David Morales",
    role: "Operations Director",
    company: "Vanguard Contractor Fleet",
    avatarSrc: "/avatar-4.jpg",
    avatarAlt: "David Morales - Vanguard Contractor",
    quote:
      "Whether it's an emergency flat on I-95 or scheduled skid steer and work van tire rotations across job sites, Xtreme Mobile Tire is always on site before our paperwork is even finished.",
  },
];

const DURATION_MS = 5000;
const INTERVAL_MS = 25; // Smooth 40 FPS status ring animation

// Circle SVG calculations
const RADIUS = 31;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~194.78

export default function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // Continuous auto-advancing timer that runs ALL THE TIME (never pauses on hover)
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (INTERVAL_MS / DURATION_MS) * 100;
        if (next >= 100) {
          setActiveIndex((curr) => (curr + 1) % TESTIMONIALS.length);
          return 0;
        }
        return next;
      });
    }, INTERVAL_MS);

    return () => clearInterval(timer);
  }, [activeIndex]);

  const handleSelectClient = (index: number) => {
    setActiveIndex(index);
    setProgress(0);
  };

  const current = TESTIMONIALS[activeIndex];
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress / 100);

  return (
    <section className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* 
        Main Testimonial Card:
        - Header kept INSIDE the box as requested
        - Decreased compact height without empty dead space
        - Full-width legible quote layout (no squished 1-word lines)
        - Sharp corners (rounded-none)
        - Continuous circular status progress on active client avatar
      */}
      <div className="relative w-full rounded-none bg-white/70 dark:bg-[#080d1a]/85 backdrop-blur-md border border-black/15 dark:border-white/10 p-6 sm:p-8 lg:p-9 overflow-hidden shadow-2xl">
        
        {/* Subtle Ambient Crimson Glow */}
        <div className="pointer-events-none absolute -right-24 -top-24 w-96 h-96 bg-[var(--brand-primary)]/10 blur-3xl rounded-none" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 w-80 h-80 bg-[var(--brand-primary)]/10 blur-3xl rounded-none" />

        {/* Section Header INSIDE the card */}
        <div className="text-left mb-6 sm:mb-8">
          <div className="flex items-center gap-2.5 mb-2.5">
            <span className="w-3 h-3 bg-black dark:bg-[var(--brand-primary)] inline-block shrink-0 shadow-sm rounded-none" />
            <span className="text-xs sm:text-sm font-bold tracking-widest uppercase text-zinc-800 dark:text-zinc-200 font-sans">
              Trusted by the world Leading companies
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl tracking-tight text-[var(--neutral-dark)]">
            <span className="font-sans font-extrabold text-[var(--neutral-dark)]">
              What our clients{" "}
            </span>
            <span className="font-serif italic font-normal text-[var(--neutral-dark)]">
              say
            </span>
          </h2>
        </div>

        {/* Interactive Layout: Avatars on left, full-width active quote on right */}
        <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8 lg:gap-10 w-full">
          
          {/* ======================================================== */}
          {/* LEFT: Client Avatar Row with Circular Status Progress    */}
          {/* ======================================================== */}
          <div className="shrink-0 flex items-center justify-start gap-2.5 sm:gap-3.5 select-none">
            {TESTIMONIALS.map((item, idx) => {
              const isActive = idx === activeIndex;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectClient(idx)}
                  className="relative flex items-center justify-center cursor-pointer transition-transform duration-200 group/avatar"
                  title={`${item.name} - ${item.company}`}
                >
                  {isActive ? (
                    /* Active Avatar with SVG Circular Progress Ring */
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
                      {/* SVG Progress Ring */}
                      <svg
                        className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
                        viewBox="0 0 72 72"
                      >
                        {/* Background track circle */}
                        <circle
                          cx="36"
                          cy="36"
                          r={RADIUS}
                          fill="none"
                          className="stroke-zinc-200 dark:stroke-zinc-800"
                          strokeWidth="2.5"
                        />
                        {/* Dynamic Crimson Progress Circle */}
                        <circle
                          cx="36"
                          cy="36"
                          r={RADIUS}
                          fill="none"
                          stroke="var(--brand-primary)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeDasharray={CIRCUMFERENCE}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-[stroke-dashoffset] duration-75 ease-linear shadow-sm"
                        />
                      </svg>

                      {/* Active Portrait Photo */}
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden shadow-md border-2 border-white dark:border-black/50">
                        <img
                          src={item.avatarSrc}
                          alt={item.avatarAlt}
                          className="w-full h-full object-cover object-center"
                        />
                      </div>
                    </div>
                  ) : (
                    /* Inactive Avatar */
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full overflow-hidden border border-black/15 dark:border-white/15 opacity-60 hover:opacity-100 transition-all duration-300 grayscale hover:grayscale-0 hover:scale-105">
                      <img
                        src={item.avatarSrc}
                        alt={item.avatarAlt}
                        className="w-full h-full object-cover object-center"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ======================================================== */}
          {/* RIGHT: Active Testimonial Quote & Author Bio             */}
          {/* ======================================================== */}
          <div className="flex-1 min-w-0 w-full flex flex-col justify-center text-left">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="w-full space-y-2.5"
              >
                {/* Quote Text */}
                <p className="w-full text-sm sm:text-base lg:text-lg text-zinc-700 dark:text-zinc-200 leading-relaxed font-normal">
                  &ldquo;{current.quote}&rdquo;
                </p>

                {/* Author Credentials */}
                <div className="pt-1 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                  <span className="font-bold text-[var(--neutral-dark)]">
                    {current.name}
                  </span>
                  <span>, {current.role} @ </span>
                  <span className="font-semibold text-[var(--brand-primary)]">
                    {current.company}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

        </div>

      </div>

    </section>
  );
}

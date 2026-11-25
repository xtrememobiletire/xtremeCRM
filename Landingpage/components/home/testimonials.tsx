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
    avatarSrc: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426721/xtreme/landing/avatar-1_jpg.jpg",
    avatarAlt: "Jennifer Walsh - Apex Freight",
    quote:
      "Call Mobile Tire completely transformed how our commercial logistics operations run. Roadside blowout downtime dropped by 65% and our drivers are back on the highway in under 40 minutes.",
  },
  {
    id: "marcus",
    name: "Marcus Vance",
    role: "Regional Dispatch Manager",
    company: "Metro Delivery Express",
    avatarSrc: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426721/xtreme/landing/avatar-2_jpg.jpg",
    avatarAlt: "Marcus Vance - Metro Delivery",
    quote:
      "Having certified mechanics service our 48 delivery vans right at the depot during driver shift changeovers has been a total game changer. Zero yard disruption, zero lost driver hours.",
  },
  {
    id: "elena",
    name: "Elena Rostova",
    role: "Fleet Maintenance Lead",
    company: "Titan Heavy Haulage",
    avatarSrc: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426722/xtreme/landing/avatar-3_jpg.jpg",
    avatarAlt: "Elena Rostova - Titan Heavy Haulage",
    quote:
      "The automated tread depth telemetry and bi-weekly master billing gave our management team absolute transparency. Their expert mobile mechanics are the best in the industry.",
  },
  {
    id: "david",
    name: "David Morales",
    role: "Operations Director",
    company: "Vanguard Contractor Fleet",
    avatarSrc: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426723/xtreme/landing/avatar-4_jpg.jpg",
    avatarAlt: "David Morales - Vanguard Contractor",
    quote:
      "Whether it's an emergency flat on I-95 or scheduled skid steer and work van tire rotations across job sites, Call Mobile Tire is always on site before our paperwork is even finished.",
  },
];

const RADIUS = 31;
const CIRCUMFERENCE = 194.78; // 2 * Math.PI * 31

export default function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const handleSelectClient = (index: number) => {
    setActiveIndex(index);
  };

  const current = TESTIMONIALS[activeIndex];

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 w-full max-w-6xl mx-auto px-3.5 xs:px-4 sm:px-6 py-8 sm:py-14"
    >
      {/* 
        Main Testimonial Card:
        - Header kept INSIDE the box
        - Full-width legible quote layout
        - Outer shell rounded-2xl
        - Circular status progress on active client avatar with freeze-in-place pause-on-hover
      */}
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="relative w-full rounded-2xl bg-white/80 dark:bg-[#0c0d10] backdrop-blur-md border border-black/10 dark:border-white/10 p-4 xs:p-6 sm:p-8 lg:p-10 overflow-hidden shadow-2xl transition-all"
      >
        {/* Subtle Ambient Crimson Glow */}
        <div className="pointer-events-none absolute -right-24 -top-24 w-96 h-96 bg-[var(--brand-primary)]/10 blur-3xl rounded-full" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 w-80 h-80 bg-[var(--brand-primary)]/10 blur-3xl rounded-full" />

        {/* Section Header INSIDE the card */}
        <div className="text-left mb-6 sm:mb-9">
          <div className="flex items-center gap-2.5 mb-2 sm:mb-2.5">
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-black dark:bg-[var(--brand-primary)] inline-block shrink-0 shadow-sm rounded-none" />
            <span className="text-[11px] xs:text-xs sm:text-sm font-bold tracking-widest uppercase text-zinc-800 dark:text-zinc-200 font-sans">
              Trusted by commercial teams
            </span>
          </div>
          <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl tracking-tight text-zinc-950 dark:text-white">
            <span className="font-sans font-extrabold text-zinc-950 dark:text-white">
              What our clients{" "}
            </span>
            <span className="font-serif italic font-normal text-[var(--brand-primary)]">
              say
            </span>
          </h2>
        </div>

        {/* Interactive Layout: Avatars on left, full-width active quote on right */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-5 sm:gap-8 lg:gap-10 w-full">
          {/* Client Avatar Row with Smooth SVG Progress Ring */}
          <div className="shrink-0 flex items-center justify-start gap-2 xs:gap-2.5 sm:gap-3.5 select-none overflow-x-auto max-w-full pb-1 md:pb-0">
            {TESTIMONIALS.map((item, idx) => {
              const isActive = idx === activeIndex;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectClient(idx)}
                  className="relative flex items-center justify-center cursor-pointer transition-transform duration-200 group/avatar shrink-0 min-w-[40px] min-h-[40px]"
                  title={`${item.name} - ${item.company}`}
                >
                  {isActive ? (
                    /* Active Avatar with SVG Circular Progress Ring */
                    <div className="relative w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 flex items-center justify-center">
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
                        {/* Smooth GPU Animated Progress Circle with freeze-in-place pause-on-hover */}
                        <circle
                          key={item.id}
                          cx="36"
                          cy="36"
                          r={RADIUS}
                          fill="none"
                          stroke="var(--brand-primary)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeDasharray={CIRCUMFERENCE}
                          style={{
                            "--ring-circumference": `${CIRCUMFERENCE}px`,
                            animation: "progress-ring-draw 5s linear forwards",
                            animationPlayState: isPaused ? "paused" : "running",
                          } as React.CSSProperties}
                          onAnimationEnd={() =>
                            setActiveIndex((curr) => (curr + 1) % TESTIMONIALS.length)
                          }
                          className="shadow-sm"
                        />
                      </svg>

                      {/* Active Portrait Photo */}
                      <div className="w-9 h-9 xs:w-11 xs:h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden shadow-md border-2 border-white dark:border-black/50">
                        <img
                          src={item.avatarSrc}
                          alt={item.avatarAlt}
                          className="w-full h-full object-cover object-center"
                        />
                      </div>
                    </div>
                  ) : (
                    /* Inactive Avatar */
                    <div className="w-8 h-8 xs:w-9 xs:h-9 sm:w-11 sm:h-11 rounded-full overflow-hidden border border-black/15 dark:border-white/15 opacity-60 hover:opacity-100 transition-all duration-300 grayscale hover:grayscale-0 hover:scale-105">
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

          {/* Active Testimonial Quote & Author Bio */}
          <div className="flex-1 min-w-0 w-full flex flex-col justify-center text-left">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="w-full space-y-2 sm:space-y-2.5"
              >
                {/* Quote Text */}
                <p className="w-full text-xs xs:text-sm sm:text-base lg:text-lg text-zinc-700 dark:text-zinc-200 leading-relaxed font-normal">
                  &ldquo;{current.quote}&rdquo;
                </p>

                {/* Author Credentials */}
                <div className="pt-1 text-[11px] xs:text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
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
    </motion.section>
  );
}

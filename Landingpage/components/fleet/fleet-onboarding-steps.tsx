"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, ArrowRight, ChevronDown, CheckCircle2 } from "lucide-react";

interface OnboardingStep {
  id: string;
  stepNumber: string;
  title: string;
  description: string;
  ctaText: string;
  ctaHref: string;
  imageSrc: string;
  imageAlt: string;
  badge: string;
  telemetryTag: string;
  summaryText: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "step-1",
    stepNumber: "01",
    title: "Apply for an Approved B2B Account",
    description:
      "Submit your company details to receive your dedicated Fleet Account Code and portal login.",
    ctaText: "Apply for B2B Account",
    ctaHref: "/signup",
    imageSrc: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426881/xtreme/landing/service-mobile-van_jpg.jpg",
    imageAlt: "Commercial Mobile Tire Service Van Workshop",
    badge: "B2B FLEET OPERATIONS",
    telemetryTag: "Dedicated Account Code",
    summaryText:
      "Specialized tire programs for commercial fleets. Minimize downtime, prevent delays, and keep your operations running smoothly with our expert service.",
  },
  {
    id: "step-2",
    stepNumber: "02",
    title: "Add Your Vehicles and Drivers",
    description:
      "Register your entire fleet in one dashboard by uploading your commercial vehicles, license plates, and assigned driver details.",
    ctaText: "Upload Fleet Roster",
    ctaHref: "/signup",
    imageSrc: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426863/xtreme/landing/fleet-trucks_jpg.jpg",
    imageAlt: "Commercial Fleet Vehicles Lined Up",
    badge: "FLEET ASSET ROSTER",
    telemetryTag: "One-Dashboard Management",
    summaryText:
      "Centralized fleet management. Easily manage vehicle specs, tire sizing, and assigned drivers with one-click roster updates.",
  },
  {
    id: "step-3",
    stepNumber: "03",
    title: "Automated Dispatch and Tracking",
    description:
      "Your drivers call us directly when stuck—track live repair status from your portal and pay via consolidated weekly invoices.",
    ctaText: "Explore Live Portal",
    ctaHref: "/signin",
    imageSrc: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426862/xtreme/landing/fleet-semi_jpg.jpg",
    imageAlt: "Commercial Roadside Semi Truck Dispatch",
    badge: "LIVE GPS TELEMETRY",
    telemetryTag: "24/7 Roadside Response",
    summaryText:
      "24/7 priority commercial roadside dispatch. Live technician GPS tracking and consolidated weekly billing.",
  },
];

export default function FleetOnboardingSteps() {
  const [activeStepId, setActiveStepId] = useState<string>("step-1");
  const activeStep =
    ONBOARDING_STEPS.find((s) => s.id === activeStepId) || ONBOARDING_STEPS[0];

  return (
    <section className="w-full py-16 sm:py-24 lg:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-zinc-300 dark:border-zinc-800">
      {/* Top Header Section matching wireframe */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12 sm:pb-16 border-b border-zinc-300 dark:border-zinc-800 mb-12 sm:mb-16">
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <span className="w-3 h-3 bg-black dark:bg-[#DC2626] inline-block shrink-0 rounded-none shadow-sm" />
            <span className="text-xs sm:text-sm font-bold tracking-widest uppercase text-zinc-800 dark:text-zinc-200 font-sans">
              Fleet Solutions
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
            Get Your Fleet Protected
          </h2>
        </div>
        <p className="text-sm sm:text-base md:text-lg text-zinc-600 dark:text-zinc-400 max-w-md font-normal leading-relaxed">
          At XtremeMobileTire, keep your commercial fleet moving 24/7 with live dispatch and zero downtime.
        </p>
      </div>

      {/* Main Split Layout: Left Accordion Steps + Right Picture Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        {/* Left Column: Interactive Step Accordion */}
        <div className="lg:col-span-6 flex flex-col divide-y divide-zinc-300 dark:divide-zinc-800 border-t border-b border-zinc-300 dark:border-zinc-800">
          {ONBOARDING_STEPS.map((step) => {
            const isActive = step.id === activeStepId;

            return (
              <div
                key={step.id}
                className={`transition-all duration-300 relative ${
                  isActive
                    ? "bg-red-500/[0.04] dark:bg-red-500/[0.08]"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                }`}
              >
                {/* Active Left Indicator Bar */}
                {isActive && (
                  <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#DC2626] shadow-[0_0_10px_rgba(220,38,38,0.5)]" />
                )}

                <button
                  type="button"
                  onClick={() => setActiveStepId(step.id)}
                  className="w-full p-6 sm:p-7 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="font-mono text-xs sm:text-sm text-zinc-400 dark:text-zinc-500 font-bold shrink-0">
                      {step.stepNumber}
                    </span>
                    <h3 className="text-base sm:text-lg lg:text-xl font-bold tracking-tight text-zinc-950 dark:text-white truncate">
                      {step.title}
                    </h3>
                  </div>

                  {/* Circular Action Indicator */}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300 cursor-pointer ${
                      isActive
                        ? "bg-[#DC2626] text-white border-[#DC2626] shadow-md shadow-red-600/30 scale-105"
                        : "bg-white dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 border-zinc-300 dark:border-zinc-700 hover:border-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    <ArrowRight
                      className={`w-4 h-4 transition-transform duration-300 ${
                        isActive ? "rotate-90" : "rotate-0"
                      }`}
                    />
                  </div>
                </button>

                {/* Expanded Content for Active Step */}
                <AnimatePresence initial={false}>
                  {isActive && (
                    <motion.div
                      key={`content-${step.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-7 sm:px-7 sm:pb-8 pt-0 pl-14 sm:pl-16 space-y-4">
                        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
                          {step.description}
                        </p>
                        <div className="pt-2">
                          <Link
                            href={step.ctaHref}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-zinc-950 dark:bg-white text-white dark:text-black hover:bg-[#DC2626] dark:hover:bg-[#DC2626] dark:hover:text-white font-semibold text-xs uppercase tracking-wider transition-all duration-300 rounded-none shadow-sm cursor-pointer group/cta"
                          >
                            <span>{step.ctaText}</span>
                            <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Right Column: Picture Box + Bottom Bordered Text Box (matching Wireframe) */}
        <div className="lg:col-span-6">
          <div className="relative rounded-none border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl overflow-hidden flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="w-full flex flex-col"
              >
                {/* Top Compartment: Picture Box with Telemetry */}
                <div className="relative w-full h-64 sm:h-72 lg:h-80 overflow-hidden bg-zinc-950 shrink-0">
                  <Image
                    src={activeStep.imageSrc}
                    alt={activeStep.imageAlt}
                    fill
                    className="object-cover object-center transition-transform duration-700 ease-out hover:scale-105"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                  {/* Subtle Vignette Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

                  {/* Top Status Badge */}
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                    <span className="px-3 py-1 rounded-none bg-black/70 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold uppercase tracking-wider shadow-lg">
                      {activeStep.badge}
                    </span>
                  </div>

                  {/* Bottom Telemetry Tag */}
                  <div className="absolute bottom-3 left-4 right-4 z-10 flex items-center justify-between text-xs text-white">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-[11px]">
                      <span className="w-2 h-2 rounded-none bg-[#DC2626] animate-pulse" />
                      {activeStep.telemetryTag}
                    </span>
                    <span className="text-[10px] text-zinc-300 font-mono">24/7 Support</span>
                  </div>
                </div>

                {/* Bottom Compartment: Bordered Text Box matching Wireframe (Simple modern font) */}
                <div className="p-6 sm:p-8 lg:p-9 border-t border-zinc-300 dark:border-zinc-800 bg-zinc-50/90 dark:bg-white/[0.03] flex items-center justify-center text-center">
                  <p className="font-sans text-sm sm:text-base lg:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed font-normal max-w-lg">
                    {activeStep.summaryText}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

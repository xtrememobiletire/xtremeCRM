"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  KeyRound,
  Radio,
  Truck,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";

interface FleetFeature {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  badge: string;
}

const FLEET_FEATURES: FleetFeature[] = [
  {
    id: "b2b-code",
    title: "Dedicated B2B Account Code",
    description:
      "Get a unique Fleet Code (e.g., XFC-526). Stranded drivers call our 24/7 dispatch directly—no out-of-pocket payments or calls to you.",
    icon: KeyRound,
    badge: "Direct B2B Access",
  },
  {
    id: "dispatch-tracking",
    title: "Fleet Dispatch and Job Tracking",
    description:
      "Track active roadside jobs in real time—from technician assignment and IN_PROGRESS to COMPLETED—without picking up the phone.",
    icon: Radio,
    badge: "Live Telemetry",
  },
  {
    id: "roster",
    title: "Centralized Vehicle and Driver Roster",
    description:
      "Store all your commercial trucks, license plates, tire specs, and assigned drivers in one dashboard for faster dispatch.",
    icon: Truck,
    badge: "One-Click Roster",
  },
  {
    id: "requests",
    title: "Click Urgent and Scheduled Requests",
    description:
      "Book URGENT roadside rescue or STANDARD tire swaps, replacements, and oil changes from your portal in seconds.",
    icon: Zap,
    badge: "Priority Queue",
  },
];

export default function FleetPortalFeatures() {
  const [activeFeature, setActiveFeature] = useState<string>("b2b-code");

  return (
    <section className="w-full py-16 sm:py-24 lg:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-zinc-300 dark:border-zinc-800">
      {/* Top Section Header & Eyebrow (matching wireframe) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12 sm:pb-16 border-b border-zinc-300 dark:border-zinc-800 mb-12 sm:mb-16">
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <span className="w-3 h-3 bg-black dark:bg-[#DC2626] inline-block shrink-0 rounded-none shadow-sm" />
            <span className="text-xs sm:text-sm font-bold tracking-widest uppercase text-zinc-800 dark:text-zinc-200 font-sans">
              Fleet Solutions
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
            Everything Included in Your Fleet Manager Portal
          </h2>
        </div>
        <p className="text-sm sm:text-base md:text-lg text-zinc-600 dark:text-zinc-400 max-w-md font-normal leading-relaxed">
          At XtremeMobileTire, keep your commercial fleet moving 24/7 with live dispatch and zero downtime.
        </p>
      </div>

      {/* Main Split Layout: Left Display Title + Right 2x2 Feature Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        {/* Left Column: Bold Display Typography matching wireframe */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-6 sm:space-y-8">
          <div className="space-y-4">
            <h3
              className="text-4xl sm:text-5xl lg:text-[56px] font-serif font-normal text-zinc-950 dark:text-white leading-[1.08] tracking-tight select-none"
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              Everything
              <br />
              Included in Your
              <br />
              Fleet Manager
              <br />
              Portal
            </h3>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-md leading-relaxed pt-2">
              Eliminate roadside phone tag, out-of-pocket driver reimbursements, and operational delays. Everything your dispatch team needs in a single unified dashboard.
            </p>
          </div>

          {/* Quick CTA to register */}
          <div className="pt-2 flex items-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#DC2626] text-white hover:bg-black dark:hover:bg-white dark:hover:text-black font-semibold text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 rounded-none shadow-md shadow-red-950/20 cursor-pointer group/btn"
            >
              <span>Setup Fleet Account</span>
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
            </Link>
          </div>
        </div>

        {/* Right Column: 2x2 Architectural Grid (Matching wireframe) */}
        <div className="lg:col-span-7">
          <div className="relative rounded-none border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950/90 shadow-sm dark:shadow-2xl overflow-hidden group">
            {/* Blueprint Crosshair Marks (+) at the 4 corners */}
            <span className="absolute top-2.5 left-2.5 font-mono text-xs text-zinc-400 dark:text-zinc-600 select-none pointer-events-none z-10">+</span>
            <span className="absolute top-2.5 right-2.5 font-mono text-xs text-zinc-400 dark:text-zinc-600 select-none pointer-events-none z-10">+</span>
            <span className="absolute bottom-2.5 left-2.5 font-mono text-xs text-zinc-400 dark:text-zinc-600 select-none pointer-events-none z-10">+</span>
            <span className="absolute bottom-2.5 right-2.5 font-mono text-xs text-zinc-400 dark:text-zinc-600 select-none pointer-events-none z-10">+</span>

            {/* 2x2 Grid with clean divider lines */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-300 dark:divide-zinc-800 border-b border-zinc-300 dark:border-zinc-800">
              {/* Feature 1: Top-Left */}
              <div
                onClick={() => setActiveFeature(FLEET_FEATURES[0].id)}
                className={`p-6 sm:p-8 lg:p-9 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[250px] relative ${
                  activeFeature === FLEET_FEATURES[0].id
                    ? "bg-red-500/[0.05] dark:bg-red-500/[0.10]"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                }`}
              >
                {activeFeature === FLEET_FEATURES[0].id && (
                  <span className="absolute top-0 left-0 right-0 h-1 bg-[#DC2626]" />
                )}
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div
                      className={`w-10 h-10 rounded-none flex items-center justify-center border transition-all ${
                        activeFeature === FLEET_FEATURES[0].id
                          ? "bg-[#DC2626] text-white border-[#DC2626] shadow-sm"
                          : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded-none">
                      {FLEET_FEATURES[0].badge}
                    </span>
                  </div>
                  <h4
                    className="text-lg sm:text-xl font-normal text-zinc-950 dark:text-white mb-2 leading-snug"
                    style={{ fontFamily: '"Times New Roman", Times, serif' }}
                  >
                    {FLEET_FEATURES[0].title}
                  </h4>
                </div>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pt-2">
                  {FLEET_FEATURES[0].description}
                </p>
              </div>

              {/* Feature 2: Top-Right */}
              <div
                onClick={() => setActiveFeature(FLEET_FEATURES[1].id)}
                className={`p-6 sm:p-8 lg:p-9 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[250px] relative ${
                  activeFeature === FLEET_FEATURES[1].id
                    ? "bg-red-500/[0.05] dark:bg-red-500/[0.10]"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                }`}
              >
                {activeFeature === FLEET_FEATURES[1].id && (
                  <span className="absolute top-0 left-0 right-0 h-1 bg-[#DC2626]" />
                )}
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div
                      className={`w-10 h-10 rounded-none flex items-center justify-center border transition-all ${
                        activeFeature === FLEET_FEATURES[1].id
                          ? "bg-[#DC2626] text-white border-[#DC2626] shadow-sm"
                          : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      <Radio className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded-none">
                      {FLEET_FEATURES[1].badge}
                    </span>
                  </div>
                  <h4
                    className="text-lg sm:text-xl font-normal text-zinc-950 dark:text-white mb-2 leading-snug"
                    style={{ fontFamily: '"Times New Roman", Times, serif' }}
                  >
                    {FLEET_FEATURES[1].title}
                  </h4>
                </div>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pt-2">
                  {FLEET_FEATURES[1].description}
                </p>
              </div>
            </div>

            {/* Bottom Row of 2x2 Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-300 dark:divide-zinc-800">
              {/* Feature 3: Bottom-Left */}
              <div
                onClick={() => setActiveFeature(FLEET_FEATURES[2].id)}
                className={`p-6 sm:p-8 lg:p-9 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[250px] relative ${
                  activeFeature === FLEET_FEATURES[2].id
                    ? "bg-red-500/[0.05] dark:bg-red-500/[0.10]"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                }`}
              >
                {activeFeature === FLEET_FEATURES[2].id && (
                  <span className="absolute top-0 left-0 right-0 h-1 bg-[#DC2626]" />
                )}
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div
                      className={`w-10 h-10 rounded-none flex items-center justify-center border transition-all ${
                        activeFeature === FLEET_FEATURES[2].id
                          ? "bg-[#DC2626] text-white border-[#DC2626] shadow-sm"
                          : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      <Truck className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded-none">
                      {FLEET_FEATURES[2].badge}
                    </span>
                  </div>
                  <h4
                    className="text-lg sm:text-xl font-normal text-zinc-950 dark:text-white mb-2 leading-snug"
                    style={{ fontFamily: '"Times New Roman", Times, serif' }}
                  >
                    {FLEET_FEATURES[2].title}
                  </h4>
                </div>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pt-2">
                  {FLEET_FEATURES[2].description}
                </p>
              </div>

              {/* Feature 4: Bottom-Right */}
              <div
                onClick={() => setActiveFeature(FLEET_FEATURES[3].id)}
                className={`p-6 sm:p-8 lg:p-9 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[250px] relative ${
                  activeFeature === FLEET_FEATURES[3].id
                    ? "bg-red-500/[0.05] dark:bg-red-500/[0.10]"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                }`}
              >
                {activeFeature === FLEET_FEATURES[3].id && (
                  <span className="absolute top-0 left-0 right-0 h-1 bg-[#DC2626]" />
                )}
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div
                      className={`w-10 h-10 rounded-none flex items-center justify-center border transition-all ${
                        activeFeature === FLEET_FEATURES[3].id
                          ? "bg-[#DC2626] text-white border-[#DC2626] shadow-sm"
                          : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      <Zap className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded-none">
                      {FLEET_FEATURES[3].badge}
                    </span>
                  </div>
                  <h4
                    className="text-lg sm:text-xl font-normal text-zinc-950 dark:text-white mb-2 leading-snug"
                    style={{ fontFamily: '"Times New Roman", Times, serif' }}
                  >
                    {FLEET_FEATURES[3].title}
                  </h4>
                </div>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pt-2">
                  {FLEET_FEATURES[3].description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

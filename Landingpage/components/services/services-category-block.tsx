"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  RotateCw,
  Wrench,
  Sparkles,
  BadgeCheck,
  Warehouse,
  Disc3,
  ShieldCheck,
  Droplets,
  Disc,
  Zap,
  Clock,
  KeyRound,
  Fuel,
  Shield,
  CheckCircle2,
  Timer,
  ShieldAlert,
  ArrowRight
} from "lucide-react";
import { ServiceCategory, ServiceItem } from "./services-data";
import BookingModal from "@/components/booking/booking-modal";

interface ServicesCategoryBlockProps {
  category: ServiceCategory;
}

const ICON_MAP: Record<string, React.ElementType> = {
  RotateCw,
  Wrench,
  Sparkles,
  BadgeCheck,
  Warehouse,
  Disc3,
  ShieldCheck,
  Droplets,
  Disc,
  Zap,
  Clock,
  KeyRound,
  Fuel,
  Shield,
  ShieldAlert
};

export default function ServicesCategoryBlock({ category }: ServicesCategoryBlockProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedServiceTitle, setSelectedServiceTitle] = useState("");
  const activeService: ServiceItem = category.services[activeIndex] || category.services[0];
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleOpenBooking = (title: string) => {
    setSelectedServiceTitle(title);
    setIsBookingOpen(true);
  };

  // Auto-cycle through services every 5 seconds unless paused
  useEffect(() => {
    if (isPaused || category.services.length <= 1) return;

    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % category.services.length);
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, category.services.length]);

  const handleSelectService = (index: number) => {
    setActiveIndex(index);
    setIsPaused(true);
    // Resume auto-cycling after 10s of inactivity
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsPaused(false);
    }, 10000);
  };

  return (
    <div
      id={category.id}
      className="w-full rounded-none border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950/90 backdrop-blur-md overflow-hidden shadow-sm dark:shadow-2xl transition-all duration-300"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 1. Category Header (Wireframe style with sharp square corners and 'and') */}
      <div className="p-6 sm:p-8 lg:p-10 border-b border-zinc-300 dark:border-zinc-800 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2.5">
            <span className="w-2.5 h-2.5 bg-[#DC2626] rounded-none inline-block shadow-sm" />
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-zinc-500 dark:text-zinc-400">
              Section {category.index} • Comprehensive Coverage
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
            {category.title}
          </h2>
        </div>
        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-xl font-normal leading-relaxed">
          {category.description}
        </p>
      </div>

      {/* 2. Mobile Compact Pill Selector (Sharp rectangular tabs with cursor pointer) */}
      <div className="block lg:hidden px-4 sm:px-6 pt-5 pb-2 overflow-x-auto no-scrollbar border-b border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
        <div className="flex items-center gap-2 pb-2 min-w-max">
          {category.services.map((service, idx) => {
            const IconCmp = ICON_MAP[service.iconName] || Sparkles;
            const isActive = idx === activeIndex;
            return (
              <button
                key={service.id}
                type="button"
                onClick={() => {
                  handleSelectService(idx);
                  handleOpenBooking(service.title);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-none text-xs sm:text-sm font-semibold transition-all duration-200 shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-[#DC2626] text-white shadow-md shadow-red-600/30 border border-[#DC2626]"
                    : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-800 hover:border-zinc-500"
                }`}
              >
                <IconCmp className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-[#DC2626]"}`} />
                <span>{service.title.split("(")[0].trim()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Main Split Content (Left List on Desktop, Right Preview + CTA) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
        {/* Left Column: Interactive Service List spanning full height with Hand Cursor */}
        <div className="hidden lg:flex lg:col-span-6 flex-col h-full divide-y divide-zinc-200/80 dark:divide-zinc-800/80 border-r border-zinc-300 dark:border-zinc-800">
          {category.services.map((service, idx) => {
            const IconCmp = ICON_MAP[service.iconName] || Sparkles;
            const isActive = idx === activeIndex;

            return (
              <button
                key={service.id}
                type="button"
                onClick={() => {
                  handleSelectService(idx);
                  handleOpenBooking(service.title);
                }}
                className={`w-full text-left p-6 transition-all duration-300 flex-1 flex items-center justify-between gap-4 group relative cursor-pointer ${
                  isActive
                    ? "bg-red-500/[0.08] dark:bg-red-500/[0.14]"
                    : "hover:bg-zinc-100/80 dark:hover:bg-zinc-900/60"
                }`}
              >
                {/* Left Active Bar Indicator */}
                {isActive && (
                  <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#DC2626] shadow-[0_0_12px_rgba(220,38,38,0.5)]" />
                )}

                <div className="flex items-start gap-4 min-w-0 pr-2">
                  <div
                    className={`w-11 h-11 rounded-none flex items-center justify-center shrink-0 transition-all duration-300 ${
                      isActive
                        ? "bg-[#DC2626] text-white shadow-md shadow-red-600/30 scale-105"
                        : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 group-hover:bg-zinc-200/70 dark:group-hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    <IconCmp className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`text-base sm:text-lg font-bold tracking-tight transition-colors duration-200 ${
                          isActive
                            ? "text-zinc-950 dark:text-white"
                            : "text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-950 dark:group-hover:text-white"
                        }`}
                      >
                        {service.title}
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {service.shortDesc}
                    </p>
                  </div>
                </div>

                {/* Wireframe Arrow Box (sharp square with Hand Cursor) */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectService(idx);
                    handleOpenBooking(service.title);
                  }}
                  className={`w-10 h-10 rounded-none flex items-center justify-center shrink-0 transition-all duration-300 border cursor-pointer ${
                    isActive
                      ? "bg-[#DC2626] text-white border-[#DC2626] shadow-md shadow-red-600/30 scale-105"
                      : "bg-transparent text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-zinc-800 group-hover:border-zinc-400 dark:group-hover:border-zinc-600 group-hover:text-zinc-900 dark:group-hover:text-white group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800 group-hover:scale-105"
                  }`}
                  title="Book this service"
                >
                  <ArrowUpRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Column: Visual Preview + Floating Glass Stats Card + GET A QUOTE Button */}
        <div className="lg:col-span-6 flex flex-col justify-between bg-zinc-950 text-white relative overflow-hidden">
          {/* Visual Showcase Stage with clearly visible background image */}
          <div className="relative flex-1 min-h-[460px] sm:min-h-[500px] lg:min-h-[520px] flex items-end justify-start p-4 sm:p-6 lg:p-8 overflow-hidden">
            {/* Background Image: Vivid high opacity so car/fleet/wheels show clearly */}
            {category.services.map((service, idx) => (
              <div
                key={`bg-${service.id}`}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  idx === activeIndex ? "opacity-85 sm:opacity-90 scale-100" : "opacity-0 scale-105 pointer-events-none"
                }`}
              >
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  unoptimized
                  className="object-cover transition-transform duration-1000 ease-out"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority={idx === 0}
                />
              </div>
            ))}

            {/* Subtle Vignette Gradient allowing image to be bright and clear */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-zinc-950/20 to-zinc-950/40 z-[1] pointer-events-none" />
            <div
              className="absolute inset-0 opacity-10 pointer-events-none z-[2]"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.25) 1px, transparent 0)`,
                backgroundSize: "24px 24px"
              }}
            />

            {/* Sleek, Compact Floating Glass Stats Card (positioned at bottom-left) */}
            <div
              onClick={() => handleOpenBooking(activeService.title)}
              className="relative z-10 w-[92%] sm:w-[330px] max-w-[350px] rounded-2xl bg-black/65 backdrop-blur-xl border border-white/20 p-4 sm:p-5 shadow-2xl shadow-black/90 transition-all duration-300 cursor-pointer hover:border-[var(--brand-primary)]/60 hover:scale-[1.01]"
              title="Click to book this service"
            >
              {/* Feature Title matching inspiration */}
              <div className="mb-2">
                <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  {activeService.stats.badge}
                </h4>
              </div>

              {/* Glowing animated progress / readiness bar */}
              <div className="w-full h-2 rounded-full bg-zinc-900/90 border border-white/10 overflow-hidden mb-3.5 p-[1px] relative shadow-inner">
                <div className="h-full w-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-300 rounded-full animate-pulse shadow-[0_0_18px_rgba(239,68,68,0.7)]" />
              </div>

              {/* Compact Quick Specs Badges */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-white/[0.06] border border-white/10 rounded-xl px-2.5 py-1.5 flex items-center gap-2">
                  <Timer className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[9px] text-zinc-400 uppercase font-mono tracking-wider">Est. Time</div>
                    <div className="text-[11px] font-semibold text-white truncate">{activeService.stats.duration}</div>
                  </div>
                </div>
                <div className="bg-white/[0.06] border border-white/10 rounded-xl px-2.5 py-1.5 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[9px] text-zinc-400 uppercase font-mono tracking-wider">Protection</div>
                    <div className="text-[11px] font-semibold text-white truncate">{activeService.stats.warranty}</div>
                  </div>
                </div>
              </div>

              {/* Checklist items with clean green checkmarks */}
              <div className="space-y-1.5 border-t border-white/10 pt-2.5">
                {activeService.stats.checkmarks.map((point, pIdx) => (
                  <div
                    key={pIdx}
                    className="flex items-center justify-between text-xs text-zinc-200 gap-2 bg-white/[0.03] px-2.5 py-1.5 rounded-lg border border-white/5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                      <span className="truncate font-medium">{point}</span>
                    </div>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Wireframe Bottom Button: BOOK NOW / GET A QUOTE */}
          <button
            type="button"
            onClick={() => handleOpenBooking(activeService.title)}
            className="w-full py-4 sm:py-5 px-6 font-bold uppercase tracking-wider text-sm sm:text-base flex items-center justify-center gap-3 transition-all duration-300 z-10 bg-[#DC2626] text-white border-t border-red-700/50 hover:bg-white hover:text-black hover:border-white shadow-lg shadow-red-950/40 rounded-none cursor-pointer group/cta"
          >
            <span>Book Now – {activeService.title.split('(')[0].trim()}</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover/cta:translate-x-1" />
          </button>
        </div>
      </div>

      {/* Taylor Tire 24/7 Booking System Modal */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        initialServiceTitle={selectedServiceTitle || activeService.title}
        initialServiceCategory={category.id === "roadside-assistance" ? "ROADSIDE_ASSISTANCE" : "TIRE_SERVICE"}
      />
    </div>
  );
}

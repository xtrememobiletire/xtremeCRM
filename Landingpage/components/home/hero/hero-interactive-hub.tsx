"use client";

import { motion } from "framer-motion";
import LaptopMockup from "./laptop-mockup";
import CircuitConnectors from "./circuit-connectors";

interface HubCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  className?: string;
}

/* 
  WHITE CARD COMPONENT:
  - Pure white background (bg-white)
  - Subtle rounded corners (rounded-lg / 8px radius)
  - Fixed exact height (h-[120px]) so circuit lines touch borders with 0 gap
  - Crisp high-contrast typography: Bold title + subtle subtitle
  - Clean light inset tray housing the icon
*/
function HubCard({
  title,
  subtitle,
  icon,
  className = "",
}: HubCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`group relative h-[120px] rounded-lg border border-slate-200/90 bg-white p-3 shadow-[0_12px_28px_-5px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,1)] hover:border-[var(--brand-primary)]/50 hover:shadow-xl transition-all duration-300 flex flex-col justify-between ${className}`}
    >
      {/* Title & Subtitle */}
      <div className="text-center px-0.5">
        <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 leading-tight tracking-tight">
          {title}
        </h4>
        <p className="text-[11px] text-slate-500 mt-0.5 font-normal leading-tight">
          {subtitle}
        </p>
      </div>

      {/* Crisp Light Inset Tray */}
      <div className="w-full bg-slate-100/90 rounded-md border border-slate-200 py-1.5 px-2 flex items-center justify-center shadow-inner group-hover:border-[var(--brand-primary)]/30 transition-all">
        <div className="w-4 h-4 flex items-center justify-center text-slate-700 group-hover:text-[var(--brand-primary)] transition-colors">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

export default function HeroInteractiveHub() {
  return (
    <div className="relative w-full max-w-5xl mx-auto px-4 sm:px-6 mt-8 sm:mt-12 mb-10 sm:mb-14">
      {/* 
        MAIN SURROUNDING TECH CANVAS BOARD:
        - Sleek solid gray chassis (bg-[#2b303c] / not black!)
        - Subtle rounded-2xl chassis
        - Micro-grid tech texture with clean white grid lines
      */}
      <div className="relative rounded-2xl border border-zinc-600/50 bg-[#2b303c] backdrop-blur-md p-6 sm:p-8 lg:p-10 overflow-hidden shadow-2xl">
        
        {/* Subtle Ambient Radial Glow */}
        <div className="pointer-events-none absolute -right-24 -top-24 w-80 h-80 bg-white/5 blur-3xl rounded-full" />
        <div className="pointer-events-none absolute -left-24 -bottom-24 w-80 h-80 bg-white/5 blur-3xl rounded-full" />

        {/* Micro-grid Texture with subtle white lines */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:2rem_2rem]" />

        {/* ============================================================== */}
        {/* DESKTOP 2-TIER HUB ARCHITECTURE                                */}
        {/* ============================================================== */}
        <div className="relative h-[580px] hidden lg:block">
          {/* Animated Pure White Connecting Circuit Lines Overlay */}
          <CircuitConnectors />

          {/* ------------------------------------------------------------ */}
          {/* TIER 1 (ROW 1): TOP 3 CARDS (top-6 = 24px, height = 120px)  */}
          {/* ------------------------------------------------------------ */}

          {/* 1. TOP-LEFT CARD: 24/7 Rapid Dispatch (Pure White Card) */}
          <div className="absolute top-6 left-6 w-[215px] z-20">
            <HubCard
              title="24/7 Rapid Dispatch"
              subtitle="Active Fleet Units"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            />
          </div>

          {/* 2. TOP-CENTER CARD: Commercial Fleet Safety (Pure White Card With 3-Slot Inset Tray) */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[380px] sm:w-[400px] z-20">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="group relative h-[120px] rounded-lg border border-slate-200/90 bg-white p-3 shadow-[0_12px_28px_-5px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,1)] hover:border-[var(--brand-primary)]/50 hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              {/* Header Title & Subtitle */}
              <div className="text-center px-1">
                <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 leading-tight tracking-tight">
                  Commercial Fleet Safety
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 font-normal leading-tight">
                  Commercial safety standards & compliance
                </p>
              </div>

              {/* 3-Slot Inset Tray */}
              <div className="grid grid-cols-3 gap-2 w-full">
                <div className="bg-slate-100/90 rounded-md border border-slate-200 py-1 px-1.5 flex flex-col items-center justify-center text-center shadow-inner">
                  <svg className="w-3.5 h-3.5 text-slate-700 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-[8.5px] font-medium text-slate-700 truncate">Safety Protocol</span>
                </div>
                <div className="bg-slate-100/90 rounded-md border border-slate-200 py-1 px-1.5 flex flex-col items-center justify-center text-center shadow-inner">
                  <svg className="w-3.5 h-3.5 text-slate-700 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-[8.5px] font-medium text-slate-700 truncate">Master Techs</span>
                </div>
                <div className="bg-slate-100/90 rounded-md border border-slate-200 py-1 px-1.5 flex flex-col items-center justify-center text-center shadow-inner">
                  <svg className="w-3.5 h-3.5 text-slate-700 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-[8.5px] font-medium text-slate-700 truncate">100% Insured</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* 3. TOP-RIGHT CARD: On-Site Tire Mounting (Pure White Card) */}
          <div className="absolute top-6 right-6 w-[215px] z-20">
            <HubCard
              title="On-Site Mounting"
              subtitle="Heavy Duty & Van"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                </svg>
              }
            />
          </div>

          {/* ------------------------------------------------------------ */}
          {/* TIER 2 (ROW 2): BOTTOM 2 CARDS + CENTRAL SHARP PC LAPTOP     */}
          {/* (bottom-6 = 24px, height = 120px)                            */}
          {/* ------------------------------------------------------------ */}

          {/* 4. BOTTOM-LEFT CARD: Emergency Roadside (Pure White Card) */}
          <div className="absolute bottom-6 left-6 w-[215px] z-20">
            <HubCard
              title="Emergency Roadside"
              subtitle="32 min avg response"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
            />
          </div>

          {/* 5. CENTRAL SHARP RECTANGULAR PC / LAPTOP (Centered Vertically) */}
          <div className="absolute bottom-[76px] left-1/2 -translate-x-1/2 w-[310px] sm:w-[330px] z-20">
            <LaptopMockup />
          </div>

          {/* 6. BOTTOM-RIGHT CARD: Fleet Portal Access (Pure White Card) */}
          <div className="absolute bottom-6 right-6 w-[215px] z-20">
            <HubCard
              title="Fleet Portal Access"
              subtitle="Instant B2B Login"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              }
            />
          </div>

        </div>

        {/* ============================================================== */}
        {/* TABLET & MOBILE RESPONSIVE LAYOUT                              */}
        {/* ============================================================== */}
        <div className="lg:hidden flex flex-col items-center gap-5">
          {/* Central Sharp PC Laptop */}
          <div className="w-full max-w-[320px]">
            <LaptopMockup />
          </div>

          {/* Top-Center Card (Pure White) */}
          <div className="w-full">
            <div className="rounded-lg border border-slate-200/90 bg-white p-3.5 shadow-md">
              <div className="text-center px-1">
                <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 leading-tight tracking-tight">
                  Commercial Fleet Safety
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 font-normal leading-tight">
                  Commercial safety standards & compliance
                </p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 w-full">
                <div className="bg-slate-100/90 rounded-md border border-slate-200 py-1.5 px-2 flex flex-col items-center justify-center text-center shadow-inner">
                  <span className="text-[9px] font-medium text-slate-700">Safety Protocol</span>
                </div>
                <div className="bg-slate-100/90 rounded-md border border-slate-200 py-1.5 px-2 flex flex-col items-center justify-center text-center shadow-inner">
                  <span className="text-[9px] font-medium text-slate-700">Master Techs</span>
                </div>
                <div className="bg-slate-100/90 rounded-md border border-slate-200 py-1.5 px-2 flex flex-col items-center justify-center text-center shadow-inner">
                  <span className="text-[9px] font-medium text-slate-700">100% Insured</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Cards in 2-Column Responsive Grid (Pure White) */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <HubCard
              title="24/7 Rapid Dispatch"
              subtitle="Active Fleet Units"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            />
            <HubCard
              title="Emergency Roadside"
              subtitle="32 min avg response"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
            />
            <HubCard
              title="On-Site Mounting"
              subtitle="Heavy Duty & Van"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                </svg>
              }
            />
            <HubCard
              title="Fleet Portal Access"
              subtitle="Instant B2B Login"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              }
            />
          </div>
        </div>

      </div>
    </div>
  );
}
"use client";

import { StatueOfLibertyIcon, CanadaLandmarkIcon } from "./footer-landmark-icons";

export default function FooterLocationCards() {
  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 pt-2 pb-2">
      
      {/* ======================================================== */}
      {/* 1. UNITED STATES LOCATION CARD (EXACT INSPIRATION STYLE) */}
      {/* ======================================================== */}
      <div className="group relative rounded-none bg-[#141722] hover:bg-[#181d2c] border border-white/10 hover:border-white/20 p-6 sm:p-7 flex items-center justify-between gap-4 transition-all duration-300 shadow-xl">
        <div className="space-y-3 flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <h4 className="text-xl sm:text-2xl font-bold tracking-tight text-white group-hover:text-[var(--brand-primary)] transition-colors font-sans">
              United States
            </h4>
            <span className="px-2 py-0.5 rounded-none bg-white/10 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
              USA Warehouse
            </span>
          </div>

          <div className="space-y-1.5 text-xs sm:text-sm text-zinc-400 font-sans">
            {/* Address */}
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-[var(--brand-primary)] shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              <span className="leading-snug">
                11815 Medway Church Loop, Manassas, VA 20109
              </span>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[var(--brand-primary)] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
              </svg>
              <a
                href="tel:8043265442"
                className="hover:text-white transition-colors font-medium text-zinc-300"
              >
                (804) 326-5442
              </a>
            </div>

            {/* Email */}
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[var(--brand-primary)] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
              <a
                href="mailto:Info@Xtrememobiletire.com"
                className="underline hover:text-white transition-colors truncate text-zinc-300"
              >
                Info@Xtrememobiletire.com
              </a>
            </div>
          </div>
        </div>

        {/* Right Landmark Visual: Black & White Line-Art Statue of Liberty Icon */}
        <div className="shrink-0 p-2 flex items-center justify-center">
          <StatueOfLibertyIcon className="w-14 h-14 sm:w-16 sm:h-16 text-zinc-400 group-hover:text-white transition-colors" />
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. CANADA LOCATION CARD (EXACT INSPIRATION STYLE)        */}
      {/* ======================================================== */}
      <div className="group relative rounded-none bg-[#141722] hover:bg-[#181d2c] border border-white/10 hover:border-white/20 p-6 sm:p-7 flex items-center justify-between gap-4 transition-all duration-300 shadow-xl">
        <div className="space-y-3 flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <h4 className="text-xl sm:text-2xl font-bold tracking-tight text-white group-hover:text-[var(--brand-primary)] transition-colors font-sans">
              Canada
            </h4>
            <span className="px-2 py-0.5 rounded-none bg-white/10 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
              Canada Warehouse
            </span>
          </div>

          <div className="space-y-1.5 text-xs sm:text-sm text-zinc-400 font-sans">
            {/* Address */}
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-[var(--brand-primary)] shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              <span className="leading-snug">
                857 Winterton Way, Mississauga, ON L5V 1Z5, Canada
              </span>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[var(--brand-primary)] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
              </svg>
              <a
                href="tel:4373755674"
                className="hover:text-white transition-colors font-medium text-zinc-300"
              >
                (437) 375-5674
              </a>
            </div>

            {/* Email */}
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[var(--brand-primary)] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
              <a
                href="mailto:Info@Xtrememobiletire.com"
                className="underline hover:text-white transition-colors truncate text-zinc-300"
              >
                Info@Xtrememobiletire.com
              </a>
            </div>
          </div>
        </div>

        {/* Right Landmark Visual: Black & White Line-Art Canada Landmark Icon */}
        <div className="shrink-0 p-2 flex items-center justify-center">
          <CanadaLandmarkIcon className="w-14 h-14 sm:w-16 sm:h-16 text-zinc-400 group-hover:text-white transition-colors" />
        </div>
      </div>

    </div>
  );
}

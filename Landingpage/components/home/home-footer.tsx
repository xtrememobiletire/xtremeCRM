"use client";

import Link from "next/link";
import { StatueOfLibertyIcon, CanadaLandmarkIcon } from "./footer/footer-landmark-icons";
import FooterLargeBranding from "./footer/footer-large-branding";

interface HomeFooterProps {
  brandName?: string;
  logoSrc?: string;
  className?: string;
}

export default function HomeFooter({
  brandName = "Xtreme Mobile Tire",
  logoSrc = "https://res.cloudinary.com/ebjikx52/image/upload/v1792687627/logo.jpg",
  className = "",
}: HomeFooterProps) {
  return (
    /* 
      ROUNDED FLOATING FOOTER CARD:
      - Mobile: Full width (w-full), zero bottom margin (mb-0), rounded-b-none (attached flush to bottom).
      - Desktop/Tablet (sm+): Floating card with side and bottom gaps (w-[calc(100%-3rem)], mb-6, rounded-b-[36px]).
      - Solid dark black background (#050811) with border-white/10
    */
    <footer id="footer" className={`relative z-10 w-full sm:w-[calc(100%-3rem)] lg:w-[calc(100%-4rem)] mx-auto bg-[#050811] text-white border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-t-[38px] lg:rounded-t-[48px] rounded-b-none sm:rounded-b-[36px] lg:rounded-b-[44px] ${className ? className : "mt-6 sm:mt-8"} pt-10 sm:pt-16 pb-0 overflow-hidden shadow-2xl flex flex-col justify-between mb-0 sm:mb-6`}>
      
      {/* Increased Width Content Container */}
      <div className="w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 space-y-10 sm:space-y-12 flex-1">
        
        {/* ======================================================== */}
        {/* 3-COLUMN WIREFRAME BOXED CONTAINER                       */}
        {/* ======================================================== */}
        <div className="border border-white/10 rounded-2xl bg-[#0a0e1a]/90 backdrop-blur-md shadow-2xl grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-white/10 overflow-hidden">
          
          {/* ======================================================== */}
          {/* COLUMN 1 (LEFT): Logo, Simple Quote & 4 Social Links     */}
          {/* ======================================================== */}
          <div className="md:col-span-5 p-7 sm:p-9 lg:p-10 flex flex-col justify-between space-y-8">
            <div className="space-y-5">
              {/* Logo in sleek dark bordered box - links to home page */}
              <Link
                href="/"
                aria-label="Return to Home"
                className="inline-flex items-center px-3.5 py-2.5 bg-black/80 border border-white/15 rounded-lg shadow-sm hover:border-[var(--brand-primary)] transition-colors group cursor-pointer"
              >
                <img
                  src={logoSrc}
                  alt={brandName}
                  className="h-8 sm:h-9 w-auto object-contain transition-transform group-hover:scale-105"
                />
              </Link>

              {/* Simple Sans-Serif Quote with Generous Breathing Room */}
              <p className="font-sans text-sm sm:text-base text-zinc-300 leading-relaxed max-w-sm font-normal">
                Xtreme Mobile Tire delivers expert mobile tire installation, replacement, and repair across Canada and the USA.
              </p>
            </div>

            {/* Social Row: Connect With Us & ONLY 4 SOCIAL ICONS (TikTok, Facebook, YouTube, Instagram) */}
            <div className="pt-2">
              <h4 className="font-sans text-xs sm:text-sm font-bold uppercase tracking-wider text-white mb-4">
                Connect With Us
              </h4>
              <div className="flex items-center gap-3">
                
                {/* 1. TikTok */}
                <a
                  href="https://tiktok.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="TikTok"
                  className="w-10 h-10 rounded-lg bg-white/[0.06] hover:bg-white/[0.14] border border-white/15 flex items-center justify-center text-zinc-300 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] transition-colors"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01v8.83c0 2.13-.67 4.24-1.99 5.89-1.57 2-4.04 3.19-6.61 3.27-2.6.09-5.18-.9-7-2.69-1.92-1.89-2.91-4.57-2.73-7.24.19-2.7 1.6-5.18 3.79-6.73 2.06-1.47 4.67-2.03 7.15-1.56.02 1.45.01 2.9.01 4.35-1.46-.37-3.07-.13-4.31.74-1.16.8-1.89 2.19-1.93 3.63-.05 1.5.58 2.97 1.7 3.93 1.1 1 2.65 1.45 4.09 1.18 1.41-.26 2.62-1.28 3.16-2.61.27-.67.4-1.4.4-2.13V.02z" />
                  </svg>
                </a>

                {/* 2. Facebook */}
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="w-10 h-10 rounded-lg bg-white/[0.06] hover:bg-white/[0.14] border border-white/15 flex items-center justify-center text-zinc-300 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] transition-colors"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                  </svg>
                </a>

                {/* 3. YouTube */}
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="YouTube"
                  className="w-10 h-10 rounded-lg bg-white/[0.06] hover:bg-white/[0.14] border border-white/15 flex items-center justify-center text-zinc-300 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] transition-colors"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>

                {/* 4. Instagram */}
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="w-10 h-10 rounded-lg bg-white/[0.06] hover:bg-white/[0.14] border border-white/15 flex items-center justify-center text-zinc-300 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] transition-colors"
                >
                  <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                    <rect x="2" y="2" width="20" height="20" rx="0" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </a>

              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* COLUMN 2 (MIDDLE): Quick Links (4 selected links)        */}
          {/* ======================================================== */}
          <div className="md:col-span-3 p-7 sm:p-9 lg:p-10 flex flex-col justify-start">
            <div className="mb-6">
              <h3 className="font-sans text-base sm:text-lg font-bold tracking-tight text-white uppercase">
                Quick Links
              </h3>
              <div className="w-full h-px bg-white/15 mt-2" />
            </div>

            <ul className="space-y-4 text-sm sm:text-base font-medium">
              <li>
                <Link
                  href="/about"
                  className="group inline-flex items-center gap-2.5 text-zinc-300 hover:text-[var(--brand-primary)] transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-none bg-zinc-500 group-hover:bg-[var(--brand-primary)] transition-colors" />
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/services"
                  className="group inline-flex items-center gap-2.5 text-zinc-300 hover:text-[var(--brand-primary)] transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-none bg-zinc-500 group-hover:bg-[var(--brand-primary)] transition-colors" />
                  Services
                </Link>
              </li>
              <li>
                <Link
                  href="/fleet-solutions"
                  className="group inline-flex items-center gap-2.5 text-zinc-300 hover:text-[var(--brand-primary)] transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-none bg-zinc-500 group-hover:bg-[var(--brand-primary)] transition-colors" />
                  Fleet Solutions
                </Link>
              </li>
              <li>
                <Link
                  href="/booking"
                  className="group inline-flex items-center gap-2.5 text-zinc-300 hover:text-[var(--brand-primary)] transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-none bg-zinc-500 group-hover:bg-[var(--brand-primary)] transition-colors" />
                  Book Now
                </Link>
              </li>
            </ul>
          </div>

          {/* ======================================================== */}
          {/* COLUMN 3 (RIGHT): LOCATION & CONTACT                     */}
          {/* (Embedded country cards with address & B&W icon only)    */}
          {/* ======================================================== */}
          <div className="md:col-span-4 p-6 sm:p-8 lg:p-9 flex flex-col justify-start">
            <div className="mb-5">
              <h3 className="font-sans text-base sm:text-lg font-bold uppercase tracking-wider text-white">
                LOCATION &amp; CONTACT
              </h3>
              <div className="w-full h-px bg-white/15 mt-2" />
            </div>

            <div className="space-y-3.5">
              
              {/* United States Card */}
              <div className="group rounded-xl border border-white/10 hover:border-[#e62e2d] bg-white/[0.04] hover:bg-[#e62e2d] p-4 flex items-center justify-between gap-3 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-red-950/40">
                <div className="space-y-1 min-w-0 flex-1">
                  <h4 className="text-base font-bold text-white group-hover:text-black transition-colors font-sans">
                    United States
                  </h4>
                  <p className="text-xs text-zinc-300 group-hover:text-black leading-snug font-sans transition-colors">
                    11815 Medway Church Loop, Manassas, VA 20109
                  </p>
                  <div className="pt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-zinc-400 group-hover:text-black font-sans transition-colors">
                    <a href="tel:8043265442" className="hover:underline text-zinc-300 group-hover:text-black transition-colors">
                      (804) 326-5442
                    </a>
                    <span>•</span>
                    <a href="mailto:Info@Xtrememobiletire.com" className="hover:underline text-zinc-300 group-hover:text-black transition-colors truncate">
                      Info@Xtrememobiletire.com
                    </a>
                  </div>
                </div>

                {/* B&W Line-Art Statue of Liberty Icon: Gray normally, Black on hover */}
                <div className="shrink-0 p-1 flex items-center justify-center">
                  <StatueOfLibertyIcon className="w-10 h-10 sm:w-11 sm:h-11 text-zinc-400 group-hover:text-black transition-colors" />
                </div>
              </div>

              {/* Canada Card */}
              <div className="group rounded-xl border border-white/10 hover:border-[#e62e2d] bg-white/[0.04] hover:bg-[#e62e2d] p-4 flex items-center justify-between gap-3 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-red-950/40">
                <div className="space-y-1 min-w-0 flex-1">
                  <h4 className="text-base font-bold text-white group-hover:text-black transition-colors font-sans">
                    Canada
                  </h4>
                  <p className="text-xs text-zinc-300 group-hover:text-black leading-snug font-sans transition-colors">
                    857 Winterton Way, Mississauga, ON L5V 1Z5, Canada
                  </p>
                  <div className="pt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-zinc-400 group-hover:text-black font-sans transition-colors">
                    <a href="tel:4373755674" className="hover:underline text-zinc-300 group-hover:text-black transition-colors">
                      (437) 375-5674
                    </a>
                    <span>•</span>
                    <a href="mailto:Info@Xtrememobiletire.com" className="hover:underline text-zinc-300 group-hover:text-black transition-colors truncate">
                      Info@Xtrememobiletire.com
                    </a>
                  </div>
                </div>

                {/* B&W Line-Art Canada Landmark Icon: Gray normally, Black on hover */}
                <div className="shrink-0 p-1 flex items-center justify-center">
                  <CanadaLandmarkIcon className="w-10 h-10 sm:w-11 sm:h-11 text-zinc-400 group-hover:text-black transition-colors" />
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* ======================================================== */}
      {/* FULL-WIDTH TWO-TONE BRANDING TEXT                        */}
      {/* ======================================================== */}
      <FooterLargeBranding brandText="XtremeMobileTire" />

    </footer>
  );
}

"use client";

import Link from "next/link";

export default function FooterNavColumns() {
  return (
    <div className="w-full space-y-12">
      {/* Top 4-Column Grid: Services, Fleet Solutions, Company, Our Social */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10">
        
        {/* Column 1: Services */}
        <div className="lg:col-span-3 space-y-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-white">
            Services
          </h4>
          <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-400">
            <li>
              <Link href="/services" className="hover:text-white transition-colors">
                24/7 Mobile Tire Service
              </Link>
            </li>
            <li>
              <Link href="/services" className="hover:text-white transition-colors">
                Commercial Fleet Support
              </Link>
            </li>
            <li>
              <Link href="/services" className="hover:text-white transition-colors">
                Emergency Roadside Blowout
              </Link>
            </li>
            <li>
              <Link href="/services" className="hover:text-white transition-colors">
                On-Site Fleet Installation
              </Link>
            </li>
            <li>
              <Link href="/services" className="hover:text-white transition-colors">
                Tire Balancing &amp; Calibration
              </Link>
            </li>
            <li>
              <Link href="/services" className="hover:text-white transition-colors">
                Preventative Fleet Audit
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 2: Fleet Solutions */}
        <div className="lg:col-span-3 space-y-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-white">
            Fleet Solutions
          </h4>
          <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-400">
            <li>
              <Link href="/fleet-solutions" className="hover:text-white transition-colors">
                Dedicated Fleet Dashboard
              </Link>
            </li>
            <li>
              <Link href="/fleet-solutions" className="hover:text-white transition-colors">
                24/7 Driver Dispatch Command
              </Link>
            </li>
            <li>
              <Link href="/fleet-solutions" className="hover:text-white transition-colors">
                Fixed Pricing Contracts
              </Link>
            </li>
            <li>
              <Link href="/fleet-solutions" className="hover:text-white transition-colors">
                Weekly Consolidated Billing
              </Link>
            </li>
            <li>
              <Link href="/fleet-solutions" className="hover:text-white transition-colors">
                Multi-State Fleet Network
              </Link>
            </li>
            <li>
              <Link href="/fleet-solutions" className="hover:text-white transition-colors">
                Tire Asset Telemetry
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 3: Company */}
        <div className="lg:col-span-3 space-y-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-white">
            Company
          </h4>
          <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-400">
            <li>
              <Link href="/about" className="hover:text-white transition-colors">
                About Us
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-white transition-colors">
                Coverage Areas (USA &amp; Canada)
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-white transition-colors">
                Expert Mobile Technicians
              </Link>
            </li>
            <li>
              <Link href="/#reviews" className="hover:text-white transition-colors">
                Client Case Studies
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms &amp; Conditions
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 4: Our Social (Matching Grid of Dark Square Icon Buttons in Inspiration) */}
        <div className="lg:col-span-3 space-y-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-white">
            Our social
          </h4>
          <div className="grid grid-cols-4 gap-2.5 max-w-[220px]">
            {/* 1. Global / Web */}
            <a
              href="https://xtrememobiletire.com"
              aria-label="Website"
              className="w-11 h-11 rounded-none bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </a>

            {/* 2. Behance / Portfolio */}
            <a
              href="https://behance.net"
              target="_blank"
              rel="noreferrer"
              aria-label="Behance"
              className="w-11 h-11 rounded-none bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors font-bold text-xs"
            >
              Bē
            </a>

            {/* 3. Facebook */}
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
              className="w-11 h-11 rounded-none bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
              </svg>
            </a>

            {/* 4. Instagram */}
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="w-11 h-11 rounded-none bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                <rect x="2" y="2" width="20" height="20" rx="0" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>

            {/* 5. LinkedIn */}
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="w-11 h-11 rounded-none bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.68 1.68 0 1 0 0-3.36 1.68 1.68 0 0 0 0 3.36m1.4 9.74v-8.37H5.06v8.37h2.8z" />
              </svg>
            </a>

            {/* 6. YouTube */}
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noreferrer"
              aria-label="YouTube"
              className="w-11 h-11 rounded-none bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>

            {/* 7. TikTok */}
            <a
              href="https://tiktok.com"
              target="_blank"
              rel="noreferrer"
              aria-label="TikTok"
              className="w-11 h-11 rounded-none bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01v8.83c0 2.13-.67 4.24-1.99 5.89-1.57 2-4.04 3.19-6.61 3.27-2.6.09-5.18-.9-7-2.69-1.92-1.89-2.91-4.57-2.73-7.24.19-2.7 1.6-5.18 3.79-6.73 2.06-1.47 4.67-2.03 7.15-1.56.02 1.45.01 2.9.01 4.35-1.46-.37-3.07-.13-4.31.74-1.16.8-1.89 2.19-1.93 3.63-.05 1.5.58 2.97 1.7 3.93 1.1 1 2.65 1.45 4.09 1.18 1.41-.26 2.62-1.28 3.16-2.61.27-.67.4-1.4.4-2.13V.02z" />
              </svg>
            </a>

            {/* 8. X / Twitter */}
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noreferrer"
              aria-label="X (Twitter)"
              className="w-11 h-11 rounded-none bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
        </div>

      </div>

      {/* Solutions / Sectors Sub-Row Matching Inspiration */}
      <div className="pt-6 border-t border-white/10 space-y-3">
        <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Solutions
        </h5>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs sm:text-sm text-zinc-400">
          <span className="hover:text-white transition-colors cursor-pointer">
            Commercial Fleet Management
          </span>
          <span className="hover:text-white transition-colors cursor-pointer">
            Semi-Trucks &amp; Freight Haulers
          </span>
          <span className="hover:text-white transition-colors cursor-pointer">
            Last-Mile Delivery Vans
          </span>
          <span className="hover:text-white transition-colors cursor-pointer">
            Heavy Construction &amp; Earthmoving
          </span>
          <span className="hover:text-white transition-colors cursor-pointer">
            Municipal &amp; Utility Vehicles
          </span>
          <span className="hover:text-white transition-colors cursor-pointer">
            24/7 Roadside Emergency Dispatch
          </span>
        </div>
      </div>
    </div>
  );
}

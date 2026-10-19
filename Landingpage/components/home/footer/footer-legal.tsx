"use client";

import Link from "next/link";
import { LOGIN_URL } from "@/lib/config";

interface FooterLegalProps {
  brandName?: string;
  logoSrc?: string;
}

export default function FooterLegal({
  brandName = "Xtreme Mobile Tire",
  logoSrc = "https://res.cloudinary.com/ebjikx52/image/upload/v1792426904/xtreme/frontend/logo_webp.webp",
}: FooterLegalProps) {
  return (
    <div className="w-full pt-8 pb-4 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-400 font-mono">
      {/* Brand & Live Dispatch Badge */}
      <div className="flex items-center gap-3">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <img
            src={logoSrc}
            alt={brandName}
            className="h-6 w-auto object-contain transition-transform group-hover:scale-105"
          />
        </Link>
        <span className="text-zinc-600 dark:text-zinc-500">|</span>
        <div className="inline-flex items-center gap-2 text-zinc-400">
          <span className="w-2 h-2 rounded-none bg-[var(--brand-primary)] animate-pulse" />
          <span>24/7 Live Emergency Dispatch Active</span>
        </div>
      </div>

      {/* Copyright & Navigation */}
      <div className="flex flex-wrap items-center gap-4 text-center sm:text-right">
        <div>&copy; 2026 {brandName}. All rights reserved.</div>
        <span className="hidden sm:inline text-zinc-600">/</span>
        <Link href="/privacy" className="hover:text-white transition-colors">
          Privacy Policy
        </Link>
        <span>/</span>
        <Link href="/terms" className="hover:text-white transition-colors">
          Terms of Service
        </Link>
        <span>/</span>
        <a
          href={LOGIN_URL}
          className="hover:text-white transition-colors"
        >
          Fleet Portal
        </a>
      </div>
    </div>
  );
}

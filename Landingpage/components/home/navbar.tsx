"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import SplitPillButton from "./split-pill-button";
import { LOGIN_URL } from "@/lib/config";

export interface NavItem {
  label: string;
  href: string;
  hasDropdown?: boolean;
  children?: { label: string; href: string; description?: string }[];
}

export interface NavbarProps {
  brandName?: string;
  logoSrc?: string;
  navItems?: NavItem[];
  signInHref?: string;
  signUpHref?: string;
  onLogoClick?: () => void;
  hide?: boolean;
}

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { label: "About us", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Fleet Solutions", href: "/fleet-solutions" },
  { label: "Book now", href: "/booking" },
];

export default function Navbar({
  brandName = "Xtreme Mobile Tire",
  logoSrc = "/logo.webp",
  navItems = DEFAULT_NAV_ITEMS,
  signInHref = LOGIN_URL,
  signUpHref = "/signup",
  onLogoClick,
  hide = false,
}: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedDropdown, setExpandedDropdown] = useState<string | null>(null);
  const [desktopDropdown, setDesktopDropdown] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll listener for sticky elevation
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Clean up any pending dropdown timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  return (
    <>
      {/* 
        BACKDROP BLUR OVERLAY (MOBILE ONLY):
        Smoothly fades in at z-40 and blurs everything behind the drawer.
      */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="fixed inset-0 bg-black/45 backdrop-blur-md z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-50 w-full flex justify-center pointer-events-none">
        {/* 
          Container Wrapper:
          Uses clip-path: inset(-8px -100px -1000px -100px) so the clipping boundary sits safely
          above the top edge, avoiding subpixel hairline antialiasing during reveal.
          Releases to 'none' once animation completes so dropdowns have unrestricted overflow.
        */}
        <div
          style={{ clipPath: revealed ? "none" : "inset(-8px -100px -1000px -100px)" }}
          className="w-full lg:max-w-5xl px-0 sm:px-4 lg:px-6 pointer-events-auto"
        >
          {/* 
            NAVBAR ASSEMBLY (Moves as ONE unified piece):
            Contains the Left Wing, the Right Wing, and the Curved Nav Body.
            - Uses -top-[2px] upward bleed so solid black #050811 merges with the outer #050811 background,
              permanently eliminating any gray subpixel hairline seam.
            - Locks GPU texture using isolation: isolate and transform: translateZ(0) to prevent hover flicker.
            - Sets initial={revealed ? false : ...} so state re-renders never re-trigger the entrance animation.
          */}
          <motion.div
            initial={revealed ? false : { y: "-100%", opacity: 0 }}
            animate={{
              y: hide ? "-115%" : 0,
              opacity: hide ? 0 : 1,
            }}
            transition={{
              duration: hide ? 0.35 : (revealed ? 0.35 : 1.2),
              delay: revealed ? 0 : 0.2,
              ease: [0.16, 1, 0.3, 1],
            }}
            onAnimationComplete={() => setRevealed(true)}
            className={`relative mx-auto -top-[2px] isolate [transform:translateZ(0)] [backface-visibility:hidden] ${
              hide ? "pointer-events-none" : ""
            }`}
          >
            {/* Top 3px Continuous Bleed Strip (Covers any subpixel rounding gap) */}
            <div className="absolute -top-[2px] left-0 right-0 h-[4px] bg-[#050811] dark:bg-[#0c0c0e] pointer-events-none z-10" />

            {/* Left Inverted Wing (Fillet) with smooth curvature */}
            <div
              className="hidden lg:block absolute -top-[2px] -left-[30px] w-[32px] h-[32px] pointer-events-none z-10 dark:backdrop-blur-2xl"
            >
              <svg
                className="w-full h-full text-[#050811]"
                viewBox="0 -2 32 34"
                preserveAspectRatio="none"
                shapeRendering="geometricPrecision"
              >
                <path
                  d="M0,-2 L32,-2 L32,30 L30,30 C30,12 18,0 0,0 Z"
                  className="fill-[#050811] dark:fill-[#0c0c0e]"
                />
                <path
                  d="M30,30 C30,12 18,0 0,0"
                  fill="none"
                  strokeWidth="1"
                  className="hidden dark:block stroke-white/15"
                />
              </svg>
            </div>

            {/* Right Inverted Wing (Fillet) with smooth curvature */}
            <div
              className="hidden lg:block absolute -top-[2px] -right-[30px] w-[32px] h-[32px] pointer-events-none z-10 dark:backdrop-blur-2xl"
            >
              <svg
                className="w-full h-full text-[#050811]"
                viewBox="0 -2 32 34"
                preserveAspectRatio="none"
                shapeRendering="geometricPrecision"
              >
                <path
                  d="M0,-2 L32,-2 L32,0 C14,0 2,12 2,30 L0,30 Z"
                  className="fill-[#050811] dark:fill-[#0c0c0e]"
                />
                <path
                  d="M2,30 C2,12 14,0 32,0"
                  fill="none"
                  strokeWidth="1"
                  className="hidden dark:block stroke-white/15"
                />
              </svg>
            </div>

            {/* 
              MAIN NAVBAR CONTAINER:
              - Flush on top with rounded-t-none across all breakpoints
              - Calibrated rounded-b-[26px] / lg:rounded-b-[28px] ensuring the bottom convex curve
                never collides with the top concave fillet, permanently eliminating white slivers.
              - In Light Mode: Solid #050811 black notch against light card.
              - In Dark Mode: Sleek unified dark command notch (#0c0c0e backdrop-blur-2xl border-white/15)
                so the notch curves pop with rich clarity against the full black card.
            */}
            <nav
              aria-label="Main Navigation"
              className={`relative bg-[#050811] dark:bg-[#0c0c0e]/95 dark:backdrop-blur-2xl text-white shadow-2xl shadow-black/40 dark:shadow-[0_15px_35px_rgba(0,0,0,0.8)] dark:border-b dark:border-x dark:border-white/15 rounded-t-none rounded-b-2xl sm:rounded-b-[26px] lg:rounded-b-[28px] ${
                scrolled
                  ? "py-2 sm:py-2.5 px-4 sm:px-6 shadow-black/60 dark:shadow-[0_15px_35px_rgba(0,0,0,0.7)]"
                  : "py-2.5 sm:py-3 lg:py-3 px-5 sm:px-7"
              }`}
            >

              <div className="flex items-center justify-between gap-3">
                
                {/* Brand Logo: Always navigates to home page, or smoothly scrolls to top if already on home */}
                <Link
                  href="/"
                  onClick={(e) => {
                    if (pathname === "/") {
                      if (onLogoClick) {
                        e.preventDefault();
                        onLogoClick();
                      }
                    } else {
                      setMobileMenuOpen(false);
                    }
                  }}
                  className="group flex items-center gap-2.5 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] py-1 pr-2 cursor-pointer"
                >
                  {logoSrc ? (
                    <img
                      src={logoSrc}
                      alt={brandName}
                      className="h-8 sm:h-9 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
                    />
                  ) : (
                    <>
                      <span className="relative flex items-center justify-center w-5 h-5 rounded-full bg-white text-zinc-950 transition-transform duration-300 group-hover:scale-110 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)]" />
                      </span>
                      <span className="font-bold text-white text-[15px] sm:text-base tracking-tight group-hover:text-zinc-200 transition-colors">
                        {brandName}
                      </span>
                    </>
                  )}
                </Link>

                {/* DESKTOP NAV LINKS */}
                <div className="hidden lg:flex items-center gap-1 xl:gap-2">
                  {navItems.map((item) => (
                    <div
                      key={item.label}
                      className="relative"
                      onMouseEnter={() => {
                        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
                        if (item.hasDropdown) setDesktopDropdown(item.label);
                      }}
                      onMouseLeave={() => {
                        if (item.hasDropdown) {
                          closeTimeoutRef.current = setTimeout(() => {
                            setDesktopDropdown(null);
                          }, 120);
                        }
                      }}
                    >
                      <a
                        href={item.href}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-none text-xs xl:text-[13px] font-medium transition-all duration-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand-primary)] ${
                          desktopDropdown === item.label
                            ? "text-white bg-white/[0.08] dark:bg-white/[0.12]"
                            : "text-zinc-400 hover:text-white hover:bg-white/[0.06] dark:hover:bg-white/[0.1]"
                        }`}
                      >
                        <span>{item.label}</span>
                        {item.hasDropdown && (
                          <svg
                            className={`w-3 h-3 transition-transform duration-200 text-zinc-400 ${
                              desktopDropdown === item.label ? "rotate-180 text-white" : ""
                            }`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        )}
                      </a>

                      {/* Desktop Dropdown Menu with solid matching dark tone */}
                      <AnimatePresence>
                        {item.hasDropdown && item.children && desktopDropdown === item.label && (
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.98 }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                            className="absolute top-full left-0 mt-2 w-64 p-2 bg-[#050811] dark:bg-[#2d2022] border border-white/10 dark:border-white/15 rounded-none shadow-2xl shadow-black/90 dark:shadow-[0_20px_50px_rgba(0,0,0,0.95)] z-50 before:absolute before:-top-3 before:left-0 before:right-0 before:h-3 before:content-['']"
                          >
                            {item.children.map((subItem) => (
                              <a
                                key={subItem.label}
                                href={subItem.href}
                                className="block p-2.5 rounded-none hover:bg-white/[0.06] dark:hover:bg-white/[0.08] transition-colors group"
                              >
                                <div className="text-xs font-semibold text-white group-hover:text-[var(--brand-primary)] transition-colors">
                                  {subItem.label}
                                </div>
                                {subItem.description && (
                                  <div className="text-[11px] text-zinc-400 dark:text-zinc-300 mt-0.5 line-clamp-1">
                                    {subItem.description}
                                  </div>
                                )}
                              </a>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>

                {/* DESKTOP ACTIONS: Sign In & Split-Pill Sign Up */}
                <div className="hidden lg:flex items-center gap-4">
                  <a
                    href="https://app.xtrememobiletire.com/login"
                    className="text-xs xl:text-sm font-medium text-zinc-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand-primary)]"
                  >
                    Sign in
                  </a>

                  <SplitPillButton
                    label="Sign Up"
                    href={signUpHref}
                    theme="white-crimson"
                    arrowDirection="up-right"
                    size="sm"
                  />
                </div>

                {/* MOBILE HAMBURGER TOGGLE */}
                <div className="flex items-center lg:hidden">
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(true)}
                    aria-label="Open navigation menu"
                    className="p-1.5 rounded-none text-white hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] cursor-pointer"
                  >
                    <div className="w-6 flex flex-col gap-1.5 items-end py-1">
                      <span className="block h-[2px] w-6 bg-white rounded-full" />
                      <span className="block h-[2px] w-6 bg-white rounded-full" />
                    </div>
                  </button>
                </div>

              </div>
            </nav>

            {/* 
              MOBILE EXPANDED DRAWER (OVERLAY LAYER):
              - Animated smoothly with Framer Motion spring physics
              - Positioned absolute top-0 at z-50
              - DOES NOT push the hero down
              - Features staggered nav links and collapsible accordion animation
            */}
            <AnimatePresence>
              {mobileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -14, scale: 0.98 }}
                  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute top-0 left-0 right-0 z-50 lg:hidden bg-[#050811] dark:bg-[#2d2022] text-white rounded-t-none rounded-b-2xl sm:rounded-b-[28px] p-4 sm:p-5 shadow-2xl shadow-black/90 border-b border-x border-white/[0.06] dark:border-white/15"
                >
                  {/* Top Row: Logo on left, Close '✕' on right */}
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
                    <Link
                      href="/"
                      onClick={(e) => {
                        setMobileMenuOpen(false);
                        if (pathname === "/") {
                          if (onLogoClick) {
                            e.preventDefault();
                            onLogoClick();
                          }
                        }
                      }}
                      className="flex items-center gap-2.5 cursor-pointer"
                    >
                      {logoSrc ? (
                        <img
                          src={logoSrc}
                          alt={brandName}
                          className="h-8 w-auto object-contain"
                        />
                      ) : (
                        <>
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white text-zinc-950 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)]" />
                          </span>
                          <span className="font-bold text-white text-[15px] tracking-tight">
                            {brandName}
                          </span>
                        </>
                      )}
                    </Link>

                    <button
                      type="button"
                      onClick={() => setMobileMenuOpen(false)}
                      aria-label="Close navigation menu"
                      className="p-1.5 rounded-none text-white hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] cursor-pointer"
                    >
                      <svg
                        className="w-6 h-6 stroke-[2.2]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Staggered Vertical Nav Items */}
                  <div className="flex flex-col space-y-0.5 pt-1">
                    {navItems.map((item, idx) => {
                      const isExpanded = expandedDropdown === item.label;

                      return (
                        <motion.div
                          key={item.label}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.25, delay: 0.05 + idx * 0.04 }}
                          className="border-b border-white/[0.06] last:border-b-0"
                        >
                          <div className="flex items-center justify-between py-2.5">
                            <a
                              href={item.href}
                              onClick={() => !item.hasDropdown && setMobileMenuOpen(false)}
                              className="text-sm font-semibold text-zinc-100 hover:text-white transition-colors"
                            >
                              {item.label}
                            </a>

                            {item.hasDropdown && (
                              <button
                                type="button"
                                onClick={() => setExpandedDropdown(isExpanded ? null : item.label)}
                                className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                aria-label={`Toggle ${item.label} submenu`}
                              >
                                <svg
                                  className={`w-4 h-4 transition-transform duration-200 ${
                                    isExpanded ? "rotate-180 text-white" : ""
                                  }`}
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="m6 9 6 6 6-6" />
                                </svg>
                              </button>
                            )}
                          </div>

                          {/* Accordion Expand/Collapse Animation */}
                          <AnimatePresence>
                            {item.hasDropdown && isExpanded && item.children && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.22, ease: "easeInOut" }}
                                className="overflow-hidden"
                              >
                                <div className="pb-3 pl-3 space-y-2 border-l border-white/10 ml-1 mb-2">
                                  {item.children.map((sub) => (
                                    <a
                                      key={sub.label}
                                      href={sub.href}
                                      onClick={() => setMobileMenuOpen(false)}
                                      className="block text-xs text-zinc-400 hover:text-[var(--brand-primary)] transition-colors py-1"
                                    >
                                      {sub.label}
                                    </a>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Bottom Row matching Image 2 */}
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.25 }}
                    className="pt-4 flex items-center justify-between"
                  >
                    <a
                      href="https://app.xtrememobiletire.com/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
                    >
                      Sign in
                    </a>

                    <SplitPillButton
                      label="Sign Up"
                      href={signUpHref}
                      onClick={() => setMobileMenuOpen(false)}
                      theme="white-crimson"
                      arrowDirection="up-right"
                      size="sm"
                    />
                  </motion.div>

                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        </div>
      </header>
    </>
  );
}

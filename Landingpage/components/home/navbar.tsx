"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SplitPillButton from "./split-pill-button";

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
}

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "#home" },
  {
    label: "About Us",
    href: "#about",
    hasDropdown: true,
    children: [
      { label: "Our Story", href: "#story", description: "Learn how Xtreme Mobile Tire revolutionized fleet tire repair." },
      { label: "Operating Model", href: "#model", description: "Our 24/7 on-site rapid dispatch mechanics." },
      { label: "Certifications", href: "#certifications", description: "TIA certified technicians & fleet safety standards." },
    ],
  },
  {
    label: "Services",
    href: "#services",
    hasDropdown: true,
    children: [
      { label: "Commercial Fleet Support", href: "#fleet", description: "Custom maintenance plans for heavy trucks & vans." },
      { label: "24/7 Emergency Roadside", href: "#roadside", description: "On-demand mobile tire blowout repair." },
      { label: "On-Site Tire Installation", href: "#installation", description: "Mounting, balancing, and pressure calibration." },
      { label: "Fleet Tire Audits", href: "#audit", description: "Digital tread depth inspection & fleet reports." },
    ],
  },
  { label: "Our Team", href: "#team" },
  { label: "Booking", href: "#booking" },
  { label: "Contact Us", href: "#contact" },
];

export default function Navbar({
  brandName = "Xtreme Mobile Tire",
  logoSrc,
  navItems = DEFAULT_NAV_ITEMS,
  signInHref = "#signin",
  signUpHref = "#signup",
}: NavbarProps) {
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
            animate={{ y: 0, opacity: 1 }}
            transition={{
              duration: 1.2,
              delay: revealed ? 0 : 0.2,
              ease: [0.16, 1, 0.3, 1],
            }}
            onAnimationComplete={() => setRevealed(true)}
            className="relative mx-auto -top-[2px] isolate [transform:translateZ(0)] [backface-visibility:hidden]"
          >
            {/* Top 3px Continuous Black Bleed Strip (Covers any subpixel rounding gap) */}
            <div className="absolute -top-[2px] left-0 right-0 h-[4px] bg-[#050811] pointer-events-none z-10" />

            {/* Left Inverted Wing (Fillet) with G2 smooth curvature */}
            <div
              className="hidden lg:block absolute -top-[2px] -left-[40px] w-[42px] h-[44px] pointer-events-none z-10"
            >
              <svg
                className="w-full h-full fill-[#050811] text-[#050811]"
                viewBox="0 -2 42 44"
                preserveAspectRatio="none"
                shapeRendering="geometricPrecision"
              >
                <path d="M42,-2 L0,-2 L0,0 C26,0 42,16 42,42 Z" />
              </svg>
            </div>

            {/* Right Inverted Wing (Fillet) with G2 smooth curvature */}
            <div
              className="hidden lg:block absolute -top-[2px] -right-[40px] w-[42px] h-[44px] pointer-events-none z-10"
            >
              <svg
                className="w-full h-full fill-[#050811] text-[#050811]"
                viewBox="0 -2 42 44"
                preserveAspectRatio="none"
                shapeRendering="geometricPrecision"
              >
                <path d="M0,-2 L42,-2 L42,0 C16,0 0,16 0,42 Z" />
              </svg>
            </div>

            {/* 
              MAIN NAVBAR CONTAINER:
              - In its iconic curved notch form (rounded-b-[30px] sm:rounded-b-[36px] lg:rounded-b-[42px]).
              - Descends from above with the wings in 100% permanent geometric lockstep.
            */}
            <nav
              aria-label="Main Navigation"
              className={`relative bg-[#050811] text-white shadow-2xl shadow-black/40 rounded-b-[30px] sm:rounded-b-[36px] lg:rounded-b-[42px] ${
                scrolled
                  ? "py-2 sm:py-2.5 px-5 sm:px-7 shadow-black/60"
                  : "py-2.5 sm:py-3 lg:py-3.5 px-6 sm:px-8"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                
                {/* Brand Logo */}
                <a
                  href="#home"
                  className="group flex items-center gap-2.5 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] rounded-full py-1 pr-2"
                >
                  {logoSrc ? (
                    <img
                      src={logoSrc}
                      alt={brandName}
                      className="w-5 h-5 rounded-full object-contain"
                    />
                  ) : (
                    <span className="relative flex items-center justify-center w-5 h-5 rounded-full bg-white text-zinc-950 transition-transform duration-300 group-hover:scale-110 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)]" />
                    </span>
                  )}

                  <span className="font-bold text-white text-[15px] sm:text-base tracking-tight group-hover:text-zinc-200 transition-colors">
                    {brandName}
                  </span>
                </a>

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
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs xl:text-[13px] font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all duration-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand-primary)]"
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

                      {/* Desktop Dropdown Menu with Invisible Hover Bridge */}
                      <AnimatePresence>
                        {item.hasDropdown && item.children && desktopDropdown === item.label && (
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.98 }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                            className="absolute top-full left-0 mt-2 w-64 p-2 bg-[#050811] border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl z-50 before:absolute before:-top-3 before:left-0 before:right-0 before:h-3 before:content-['']"
                          >
                            {item.children.map((subItem) => (
                              <a
                                key={subItem.label}
                                href={subItem.href}
                                className="block p-2.5 rounded-xl hover:bg-white/[0.06] transition-colors group"
                              >
                                <div className="text-xs font-semibold text-white group-hover:text-[var(--brand-primary)] transition-colors">
                                  {subItem.label}
                                </div>
                                {subItem.description && (
                                  <div className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
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
                    href={signInHref}
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
                    className="p-1.5 rounded-md text-white hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] cursor-pointer"
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
                  className="absolute top-0 left-0 right-0 z-50 lg:hidden bg-[#050811]/98 backdrop-blur-2xl text-white rounded-b-[28px] sm:rounded-b-[32px] p-4 sm:p-5 shadow-2xl shadow-black/90 border-b border-x border-white/[0.06]"
                >
                  {/* Top Row: Logo on left, Close '✕' on right */}
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
                    <a
                      href="#home"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5"
                    >
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white text-zinc-950 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)]" />
                      </span>
                      <span className="font-bold text-white text-[15px] tracking-tight">
                        {brandName}
                      </span>
                    </a>

                    <button
                      type="button"
                      onClick={() => setMobileMenuOpen(false)}
                      aria-label="Close navigation menu"
                      className="p-1.5 rounded-md text-white hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] cursor-pointer"
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
                      href={signInHref}
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

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
  { label: "Home", href: "/" },
  { label: "About us", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Fleet Solutions", href: "/fleet-solutions" },
  { label: "Book now", href: "/booking" },
];

export default function Navbar({
  brandName = "Xtreme Mobile Tire",
  logoSrc = "https://res.cloudinary.com/ebjikx52/image/upload/v1792426904/xtreme/frontend/logo_webp.webp",
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
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Auto-close mobile drawer when navbar is commanded to hide
  useEffect(() => {
    if (hide) {
      setMobileMenuOpen(false);
    }
  }, [hide]);

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
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-50 w-full flex justify-center pointer-events-none pt-2 sm:pt-3.5 px-3 sm:px-6">
        {/* 
          Container Wrapper:
          Floating box navbar with crisp border across all screen sizes.
        */}
        <div className="w-full lg:max-w-5xl pointer-events-auto">
          {/* 
            NAVBAR ASSEMBLY:
            Moves as ONE unified piece.
          */}
          <motion.div
            initial={false}
            animate={{
              y: hide ? "-140%" : 0,
              opacity: hide ? 0 : 1,
            }}
            transition={{
              duration: 0.3,
              ease: [0.16, 1, 0.3, 1],
            }}
            className={`relative mx-auto isolate [transform:translateZ(0)] [backface-visibility:hidden] ${
              hide ? "pointer-events-none" : ""
            }`}
          >
            {/* 
              MAIN NAVBAR CONTAINER:
              - Floating box with 360-degree subtle border.
              - Rounded-2xl on all breakpoints.
              - Backdrop blur with dark glass texture.
            */}
            <nav
              aria-label="Main Navigation"
              className="relative bg-black/90 dark:bg-[#0c0c0e]/95 backdrop-blur-2xl text-white shadow-2xl shadow-black/70 border border-white/20 rounded-2xl py-2 sm:py-2.5 px-4 sm:px-6 lg:px-7"
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
                      className="h-10 sm:h-12 lg:h-14 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
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
                  {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href === "/" && pathname === "/");
                    return (
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
                        <Link
                          onClick={(e) => {
                            if (item.href === "/" && pathname === "/") {
                              if (onLogoClick) {
                                e.preventDefault();
                                onLogoClick();
                              }
                            }
                          }}
                          href={item.href}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm xl:text-[15px] transition-colors duration-200 focus:outline-none ${
                            isActive || desktopDropdown === item.label
                              ? "text-white font-semibold"
                              : "text-zinc-300 font-medium hover:text-white"
                          }`}
                        >
                          <span>{item.label}</span>
                          {item.hasDropdown && (
                            <svg
                              className={`w-3 h-3 transition-transform duration-200 text-zinc-400 ${
                                isActive || desktopDropdown === item.label ? "rotate-180 text-white" : ""
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
                        </Link>

                        {/* Desktop Dropdown Menu */}
                        <AnimatePresence>
                          {item.hasDropdown && item.children && desktopDropdown === item.label && (
                            <motion.div
                              initial={{ opacity: 0, y: 8, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 4, scale: 0.98 }}
                              transition={{ duration: 0.18, ease: "easeOut" }}
                              className="absolute top-full left-0 mt-2 w-64 p-2 bg-black dark:bg-[#0c0c0e] border border-white/10 dark:border-white/15 rounded-none shadow-2xl shadow-black/90 dark:shadow-[0_20px_50px_rgba(0,0,0,0.95)] z-50 before:absolute before:-top-3 before:left-0 before:right-0 before:h-3 before:content-['']"
                            >
                              {item.children.map((subItem) => (
                                <Link
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
                                </Link>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>

                {/* DESKTOP ACTIONS: Sign In */}
                <div className="hidden lg:flex items-center">
                  <SplitPillButton
                    label="Sign In"
                    href="https://app.xtrememobiletire.com/login"
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
                    className="p-2 rounded-none text-white hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] cursor-pointer"
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
              MOBILE EXPANDED DRAWER:
              - Opens smoothly from top with full responsiveness.
              - Staggered navigation links with active state indicator.
              - Clear touch targets and instant navigation.
            */}
            <AnimatePresence>
              {mobileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -14, scale: 0.98 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute top-0 left-0 right-0 z-50 lg:hidden bg-black/95 dark:bg-[#0c0c0e]/95 text-white rounded-2xl p-4 sm:p-6 shadow-2xl shadow-black/95 border border-white/20 backdrop-blur-2xl"
                >
                  {/* Top Row: Logo on left, Close '✕' on right */}
                  <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
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
                          className="h-10 sm:h-12 w-auto object-contain"
                        />
                      ) : (
                        <span className="font-bold text-white text-[15px] tracking-tight">
                          {brandName}
                        </span>
                      )}
                    </Link>

                    <button
                      type="button"
                      onClick={() => setMobileMenuOpen(false)}
                      aria-label="Close navigation menu"
                      className="p-2 rounded-none text-white hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] cursor-pointer"
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
                  <div className="flex flex-col space-y-0.5 pt-2">
                    {navItems.map((item, idx) => {
                      const isActive = pathname === item.href || (item.href === "/" && pathname === "/");
                      const isExpanded = expandedDropdown === item.label;

                      return (
                        <motion.div
                          key={item.label}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.22, delay: 0.04 + idx * 0.03 }}
                          className="border-b border-white/[0.06] last:border-b-0"
                        >
                          <div className="flex items-center justify-between py-3">
                            <Link
                              href={item.href}
                              onClick={(e) => {
                                if (!item.hasDropdown) setMobileMenuOpen(false);
                                if (item.href === "/" && pathname === "/") {
                                  if (onLogoClick) {
                                    e.preventDefault();
                                    onLogoClick();
                                  }
                                }
                              }}
                              className={`text-base font-semibold transition-colors flex items-center gap-2 ${
                                isActive ? "text-[var(--brand-primary)]" : "text-zinc-100 hover:text-white"
                              }`}
                            >
                              {isActive && (
                                <span className="w-1.5 h-1.5 rounded-none bg-[var(--brand-primary)] inline-block" />
                              )}
                              <span>{item.label}</span>
                            </Link>

                            {item.hasDropdown && (
                              <button
                                type="button"
                                onClick={() => setExpandedDropdown(isExpanded ? null : item.label)}
                                className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
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
                                    <Link
                                      key={sub.label}
                                      href={sub.href}
                                      onClick={() => setMobileMenuOpen(false)}
                                      className="block text-xs text-zinc-400 hover:text-[var(--brand-primary)] transition-colors py-1.5"
                                    >
                                      {sub.label}
                                    </Link>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Bottom Row */}
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.2 }}
                    className="pt-5 flex items-center justify-end border-t border-white/[0.08] mt-2"
                  >
                    <SplitPillButton
                      label="Sign In"
                      href="https://app.xtrememobiletire.com/login"
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

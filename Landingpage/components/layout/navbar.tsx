"use client";

import { useState, useEffect } from "react";
import SplitPillButton from "../home/split-pill-button";

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

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full flex justify-center pointer-events-none">
      {/* 
        Container Width:
        - Mobile: Full width of the card (px-0 on small screens)
        - Desktop: max-w-5xl (~1040px) with generous left & right shoulders
      */}
      <div className="w-full lg:max-w-5xl px-0 sm:px-4 lg:px-6 pointer-events-auto transition-all duration-300">
        <div className="relative mx-auto">
          
          {/* Left Inverted Wing (Fillet) for Desktop */}
          <div className="hidden lg:block absolute top-0 -left-[35px] w-[36px] h-[36px] pointer-events-none">
            <svg
              className="w-full h-full text-[#080c14] fill-current"
              viewBox="0 0 36 36"
              preserveAspectRatio="none"
            >
              <path d="M36,0 L0,0 C19.88,0 36,16.12 36,36 Z" />
            </svg>
          </div>

          {/* Right Inverted Wing (Fillet) for Desktop */}
          <div className="hidden lg:block absolute top-0 -right-[35px] w-[36px] h-[36px] pointer-events-none">
            <svg
              className="w-full h-full text-[#080c14] fill-current"
              viewBox="0 0 36 36"
              preserveAspectRatio="none"
            >
              <path d="M0,0 L36,0 C16.12,0 0,16.12 0,36 Z" />
            </svg>
          </div>

          {/* Main Black Navbar Container */}
          <nav
            aria-label="Main Navigation"
            className={`relative bg-[#080c14] text-white border-b border-x border-white/[0.06] shadow-2xl transition-all duration-300 ${
              mobileMenuOpen
                ? "rounded-b-[28px] sm:rounded-b-[32px] p-4 sm:p-5"
                : `rounded-b-[24px] sm:rounded-b-[28px] lg:rounded-b-[32px] ${
                    scrolled
                      ? "bg-[#080c14]/95 backdrop-blur-md py-2 sm:py-2.5 px-4 sm:px-6"
                      : "py-2.5 sm:py-3 px-4 sm:px-6"
                  }`
            }`}
          >
            {/* TOP BAR ROW: Brand on left, Nav / Actions on right */}
            <div className="flex items-center justify-between gap-3">
              
              {/* Brand Logo - Single clean line matching Image 1 '● Circular' */}
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

              {/* DESKTOP NAV LINKS (hidden on mobile) */}
              <div className="hidden lg:flex items-center gap-1 xl:gap-2">
                {navItems.map((item) => (
                  <div
                    key={item.label}
                    className="relative"
                    onMouseEnter={() => item.hasDropdown && setDesktopDropdown(item.label)}
                    onMouseLeave={() => item.hasDropdown && setDesktopDropdown(null)}
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

                    {/* Desktop Dropdown Menu */}
                    {item.hasDropdown && item.children && desktopDropdown === item.label && (
                      <div className="absolute top-full left-0 mt-2 w-64 p-2 bg-[#0c111a] border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150 z-50">
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
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* DESKTOP ACTIONS: Sign In & Split-Pill Sign Up (hidden on mobile) */}
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

              {/* 
                MOBILE TOGGLE:
                Shows only the 2-bar hamburger icon (matching Image 1) or Close icon (matching Image 2).
                NO cramped Sign Up button on mobile top bar!
              */}
              <div className="flex items-center lg:hidden">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-expanded={mobileMenuOpen}
                  aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                  className="p-1.5 rounded-md text-white hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] cursor-pointer"
                >
                  {mobileMenuOpen ? (
                    /* Close '✕' Icon matching Image 2 */
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
                  ) : (
                    /* 2-Bar Hamburger Icon matching Image 1 */
                    <div className="w-6 flex flex-col gap-1.5 items-end py-1">
                      <span className="block h-[2px] w-6 bg-white rounded-full" />
                      <span className="block h-[2px] w-6 bg-white rounded-full" />
                    </div>
                  )}
                </button>
              </div>

            </div>

            {/* 
              MOBILE OPEN DRAWER (Matching Image 2):
              Clean vertical list with thin dividers + single bottom row with 'Sign in' & 'Sign Up ↗'
            */}
            {mobileMenuOpen && (
              <div className="lg:hidden pt-3 mt-3 border-t border-white/[0.08] flex flex-col space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                {navItems.map((item) => {
                  const isExpanded = expandedDropdown === item.label;

                  return (
                    <div key={item.label} className="border-b border-white/[0.06] last:border-b-0">
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
                            className="p-1 text-zinc-400 hover:text-white transition-colors"
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

                      {/* Collapsible Mobile Submenu */}
                      {item.hasDropdown && isExpanded && item.children && (
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
                      )}
                    </div>
                  );
                })}

                {/* 
                  BOTTOM ROW (Matching Image 2):
                  Left: "Sign in" text link
                  Right: Signature Two-Tone Split-Pill Button "Sign Up ↗"
                */}
                <div className="pt-4 flex items-center justify-between">
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
                </div>

              </div>
            )}

          </nav>
        </div>
      </div>
    </header>
  );
}

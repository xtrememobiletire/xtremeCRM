"use client";

import { useRef, ReactNode, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Header from "@/components/home/header";
import HomeFooter from "@/components/home/home-footer";
import ThemeToggle from "@/components/home/theme-toggle";

interface PageShellProps {
  children?: ReactNode;
  onLogoClick?: () => void;
  hideNav?: boolean;
}

export default function PageShell({ children, onLogoClick, hideNav: externalHideNav }: PageShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [internalHideNav, setInternalHideNav] = useState(false);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const evaluateNavVisibility = () => {
      // Find form element or section marked with data-hide-navbar
      const formEl =
        document.getElementById("create-fleet-account") ||
        document.querySelector("[data-hide-navbar='true']");

      // If form doesn't exist on this page, ALWAYS keep navbar visible
      if (!formEl) {
        setInternalHideNav(false);
        return;
      }

      const formRect = formEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // Check if user is actively focused inside the form on mobile screens
      const isInputFocused = formEl.contains(document.activeElement);
      const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

      // On desktop & laptop viewports, the navbar stays permanently visible.
      // On mobile screens (<768px), hide only when virtual keyboard is active during input focus.
      if (isMobile && isInputFocused) {
        setInternalHideNav(true);
      } else {
        setInternalHideNav(false);
      }
    };

    // Evaluate immediately on mount / route change
    evaluateNavVisibility();
    const timer = setTimeout(evaluateNavVisibility, 100);

    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(evaluateNavVisibility);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    document.addEventListener("focusin", evaluateNavVisibility);
    document.addEventListener("focusout", () => {
      setTimeout(evaluateNavVisibility, 50);
    });

    // Dual-layer guarantee with IntersectionObserver
    let observer: IntersectionObserver | null = null;
    const formEl =
      document.getElementById("create-fleet-account") ||
      document.querySelector("[data-hide-navbar='true']");

    if (formEl && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        () => {
          evaluateNavVisibility();
        },
        {
          root: null,
          threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
        }
      );
      observer.observe(formEl);
    }

    return () => {
      clearTimeout(timer);
      if (rafId) cancelAnimationFrame(rafId);
      if (observer) observer.disconnect();
      container.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("focusin", evaluateNavVisibility);
    };
  }, [pathname]);

  const activeHideNav = externalHideNav ?? internalHideNav;

  const handleDefaultLogoClick = () => {
    if (onLogoClick) {
      onLogoClick();
    } else if (pathname === "/") {
      scrollContainerRef.current?.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } else {
      router.push("/");
    }
  };

  return (
    /* 
      OUTER FRAME VIEWPORT (FIXED BEZEL):
      - 100vh viewport with overflow-hidden preventing frame drift.
      - bg-black outer bezel matches the curved navbar notch background.
      - p-0 sm:p-3 lg:p-4 luxury canvas bezel.
    */
    <div className="relative h-screen w-full bg-black p-0 sm:p-3 lg:p-4 flex flex-col justify-start transition-colors selection:bg-[var(--brand-primary)] selection:text-white overflow-hidden">
      
      {/* INNER CANVAS CONTAINER (THE CARD: Pure Full Black in Dark Mode) */}
      <div className="relative z-10 w-full flex-1 h-full min-h-0 bg-[var(--neutral-light)] dark:bg-black text-[var(--neutral-dark)] sm:border sm:border-black/5 sm:dark:border-white/10 rounded-none sm:rounded-[36px] lg:rounded-[44px] overflow-hidden shadow-2xl flex flex-col">
        
        {/* CURVED-NOTCH NAVBAR (ANCHORED AT TOP - PERMANENTLY CONSISTENT ACROSS ALL PAGES) */}
        <div className="absolute top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <div className="w-full pointer-events-auto">
            <Header onLogoClick={handleDefaultLogoClick} hide={activeHideNav} />
          </div>
        </div>

        {/* SCROLLABLE CONTENT AREA */}
        <div
          ref={scrollContainerRef}
          className="relative z-20 flex-1 w-full h-full overflow-y-auto no-scrollbar scroll-smooth pt-24 sm:pt-28 lg:pt-32 flex flex-col"
        >
          <div className="w-full flex flex-col flex-1">
            {children}
            {/* Consistent Home Footer */}
            <HomeFooter />
          </div>
        </div>

        {/* THEME TOGGLE */}
        <ThemeToggle />

      </div>

    </div>
  );
}

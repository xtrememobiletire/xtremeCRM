"use client";

import { useRef, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Header from "@/components/home/header";
import HomeFooter from "@/components/home/home-footer";
import ThemeToggle from "@/components/home/theme-toggle";

interface PageShellProps {
  children?: ReactNode;
  onLogoClick?: () => void;
}

export default function PageShell({ children, onLogoClick }: PageShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
      - bg-[#050811] outer bezel matches the curved navbar notch background.
      - p-0 sm:p-3 lg:p-4 luxury canvas bezel.
    */
    <div className="relative h-screen w-full bg-[#050811] p-0 sm:p-3 lg:p-4 flex flex-col justify-start transition-colors selection:bg-[var(--brand-primary)] selection:text-white overflow-hidden">
      
      {/* INNER CANVAS CONTAINER (THE CARD: Pure Full Black in Dark Mode) */}
      <div className="relative z-10 w-full flex-1 h-full min-h-0 bg-[var(--neutral-light)] dark:bg-[#0c1222] text-[var(--neutral-dark)] sm:border sm:border-black/5 sm:dark:border-white/10 rounded-none sm:rounded-[36px] lg:rounded-[44px] overflow-hidden shadow-2xl flex flex-col">
        
        {/* CURVED-NOTCH NAVBAR (ANCHORED AT TOP - PERMANENTLY CONSISTENT ACROSS ALL PAGES) */}
        <div className="absolute top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <div className="w-full pointer-events-auto">
            <Header onLogoClick={handleDefaultLogoClick} hide={false} />
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

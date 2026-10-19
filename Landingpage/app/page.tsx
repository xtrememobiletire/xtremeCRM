"use client";

import { useRef, useState, useEffect } from "react";
import Header from "@/components/home/header";
import HeroSection from "@/components/home/hero-section";
import FleetMembersBar from "@/components/home/fleet-members-bar";
import ServicesCards from "@/components/home/services-cards";
import MobileTireShowcase from "@/components/home/mobile-tire-showcase";
import AccountTypeComparison from "@/components/home/account-type-comparison";
import FleetBanner from "@/components/home/fleet-banner";
import Testimonials from "@/components/home/testimonials";
import HomeFooter from "@/components/home/home-footer";
import ThemeToggle from "@/components/home/theme-toggle";

export default function HomePage() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hideNavbar, setHideNavbar] = useState(false);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const footer = document.getElementById("footer");
      if (!footer) return;
      const footerRect = footer.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // When the top of the footer enters into the visible container area
      // or user reaches near the bottom of scroll:
      const isFooterEntered =
        footerRect.top <= containerRect.top + containerRect.height * 0.6 ||
        container.scrollTop + container.clientHeight >= container.scrollHeight - 60;

      setHideNavbar(isFooterEntered);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    handleScroll();

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  const handleLogoClick = () => {
    scrollContainerRef.current?.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    /* 
      OUTER FRAME VIEWPORT (FIXED BEZEL):
      - Fixed to 100vh (h-screen) with overflow-hidden so the outer framing never scrolls.
      - bg-[#050811] provides the outer dark frame and matches the curved notch background.
      - p-0 sm:p-3 lg:p-4 creates the luxury framed canvas margin on desktop & tablet.
    */
    <div className="relative h-screen w-full bg-[#050811] p-0 sm:p-3 lg:p-4 flex flex-col justify-start transition-colors selection:bg-[var(--brand-primary)] selection:text-white overflow-hidden">
      
      {/* 
        INNER CANVAS CONTAINER (THE CARD):
        - Full edge-to-edge on mobile (rounded-none).
        - Smooth rounded card on tablet/desktop (sm:rounded-[36px] lg:rounded-[44px]).
        - overflow-hidden clips the scrollable content inside the curved corners.
        - Because the container card itself stays locked in the frame, its corner curves NEVER break or drift!
      */}
      <div className="relative z-10 w-full flex-1 h-full min-h-0 bg-[var(--neutral-light)] dark:bg-[#0c1222] text-[var(--neutral-dark)] sm:border sm:border-black/5 sm:dark:border-white/10 rounded-none sm:rounded-[36px] lg:rounded-[44px] overflow-hidden shadow-2xl flex flex-col">

        {/* 
          CURVED-NOTCH NAVBAR (ANCHORED AT TOP):
          - Positioned absolute top-0 at z-50 so it stays anchored at the top of the card.
          - Inverted wing fillets seamlessly align with the top edge and outer bezel.
          - Receives onLogoClick to smoothly scroll the inner container to the top.
          - Receives hide={hideNavbar} to smoothly slide out when user enters the footer section.
        */}
        <div className="absolute top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <div className="w-full pointer-events-auto">
            <Header onLogoClick={handleLogoClick} hide={hideNavbar} />
          </div>
        </div>

        {/* 
          SCROLLABLE CONTENT AREA:
          - flex-1 and overflow-y-auto no-scrollbar scroll-smooth.
          - Content smoothly flows underneath the curved navbar notch as the user scrolls.
          - The navbar notch and outer card curves stay permanently anchored without moving.
        */}
        <div
          ref={scrollContainerRef}
          className="relative z-20 flex-1 w-full h-full overflow-y-auto no-scrollbar scroll-smooth pt-24 sm:pt-28 lg:pt-32 flex flex-col"
        >
          <div id="home" className="w-full flex flex-col flex-1">
            {/* Section 1: Hero Section (Headline, CTA & 6-card Fleet Gallery Showcase) */}
            <HeroSection />

            {/* Flowing Bar: Fleet Members infinite marquee separator */}
            <FleetMembersBar />

            {/* Section 2: Services Cards (24/7 Mobile Service & Fleet Solutions) */}
            <ServicesCards />

            {/* Section 3: Wireframe Mobile Tire Showcase (XTREMEMOBILE TIRE SOLUTIONS + Box + Picture) */}
            <MobileTireShowcase />

            {/* Section 4: Choose Your Account Type (Fleet Manager vs Personal Membership) */}
            <AccountTypeComparison />

            {/* Section 5: Built For Fleet Managers Banner */}
            <FleetBanner />

            {/* Section 6: Testimonials & Trusted By Teams Worldwide */}
            <Testimonials />

            {/* Section 7: Footer (Quick Links & Contact) */}
            <HomeFooter />
          </div>
        </div>

        {/* THEME TOGGLE: Bottom right floating button */}
        <ThemeToggle />

      </div>

    </div>
  );
}

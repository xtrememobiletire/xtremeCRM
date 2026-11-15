"use client";

import PageShell from "@/components/layout/page-shell";
import HeroSection from "@/components/home/hero-section";
import DispatchContactBar from "@/components/home/dispatch-contact-bar";
import FleetMembersBar from "@/components/home/fleet-members-bar";
import ServicesCards from "@/components/home/services-cards";
import MobileTireShowcase from "@/components/home/mobile-tire-showcase";
import AccountTypeComparison from "@/components/home/account-type-comparison";
import FleetBanner from "@/components/home/fleet-banner";
import Testimonials from "@/components/home/testimonials";

export default function HomeView() {
  return (
    <PageShell>
      <div id="home" className="w-full flex flex-col flex-1">
        {/* Section 1: Hero Section (Headline, CTA & 6-card Fleet Gallery Showcase) */}
        <HeroSection />

        {/* 24/7 Fleet Dispatch Contact Bar (Directly beneath Hero) */}
        <DispatchContactBar />

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
      </div>
    </PageShell>
  );
}

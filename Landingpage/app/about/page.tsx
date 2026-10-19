"use client";

import PageShell from "@/components/layout/page-shell";
import AboutHero from "@/components/about/about-hero";
import AboutValuesCards from "@/components/about/about-values-cards";
import AboutMissionSection from "@/components/about/about-mission-section";
import AboutStorySection from "@/components/about/about-story-section";
import AboutBrandsMarquee from "@/components/about/about-brands-marquee";
import AboutServicesCta from "@/components/about/about-services-cta";
import AboutContactLocations from "@/components/about/about-contact-locations";

export default function AboutPage() {
  return (
    <PageShell>
      <div className="w-full flex-1 flex flex-col">
        {/* Dedicated About Hero Section */}
        <AboutHero />

        {/* Our Values 3-Card Grid with Hover Picture-Down Interaction */}
        <AboutValuesCards />

        {/* Our Mission: Scroll-Driven Speedometer & 4-Point Blueprint Specifications */}
        <AboutMissionSection />

        {/* Our Story: Pinned Co-Founders Portrait & Scrollable Narrative with Red Invitation Card */}
        <AboutStorySection />

        {/* Brands We Work With: 3-Row Continuous Infinite Marquee */}
        <AboutBrandsMarquee />

        {/* Services Transition CTA Card: 24/7 Mobile Tire & Roadside Service */}
        <AboutServicesCta />

        {/* Global Locations & Get In Touch Section with Circular Status Flags */}
        <AboutContactLocations />
      </div>
    </PageShell>
  );
}




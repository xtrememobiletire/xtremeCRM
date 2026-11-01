import type { Metadata } from "next";
import PageShell from "@/components/layout/page-shell";
import AboutHero from "@/components/about/about-hero";
import AboutValuesCards from "@/components/about/about-values-cards";
import AboutMissionSection from "@/components/about/about-mission-section";
import AboutStorySection from "@/components/about/about-story-section";
import AboutBrandsMarquee from "@/components/about/about-brands-marquee";
import AboutServicesCta from "@/components/about/about-services-cta";
import AboutContactLocations from "@/components/about/about-contact-locations";

export const metadata: Metadata = {
  title: "About Xtreme Mobile Tire | 24/7 On-Demand Tire Pros",
  description:
    "Learn how Xtreme Mobile Tire revolutionizes tire care. Certified mobile technicians delivering fast, transparent, and reliable roadside tire service.",
  alternates: {
    canonical: "/about",
  },
  keywords: [
    "about xtreme mobile tire",
    "how does mobile tire service work",
    "mobile tire repair vs tire shop",
    "benefits of on-site tire replacement",
    "reliable 24 hour mobile tire technician",
    "mobile tire service reviews",
    "on-demand tire technicians"
  ],
  openGraph: {
    title: "About Xtreme Mobile Tire | 24/7 On-Demand Tire Pros",
    description:
      "Learn how Xtreme Mobile Tire revolutionizes tire care. Certified mobile technicians delivering fast, transparent, and reliable roadside tire service.",
    url: "/about",
    type: "website",
    images: [
      {
        url: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426881/xtreme/landing/service-mobile-van_jpg.jpg",
        width: 1200,
        height: 630,
        alt: "About Xtreme Mobile Tire - 24/7 Roadside Tire Team",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Xtreme Mobile Tire | 24/7 On-Demand Tire Pros",
    description:
      "Learn how Xtreme Mobile Tire revolutionizes tire care. Certified mobile technicians delivering fast, transparent, and reliable roadside tire service.",
    images: [
      "https://res.cloudinary.com/ebjikx52/image/upload/v1792426881/xtreme/landing/service-mobile-van_jpg.jpg",
    ],
  },
};

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

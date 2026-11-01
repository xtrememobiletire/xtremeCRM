import type { Metadata } from "next";
import PageShell from "@/components/layout/page-shell";
import FleetHero from "@/components/fleet/fleet-hero";
import FleetOnboardingSteps from "@/components/fleet/fleet-onboarding-steps";
import FleetPortalFeatures from "@/components/fleet/fleet-portal-features";
import FleetDowntimeBanner from "@/components/fleet/fleet-downtime-banner";
import FleetCreateAccount from "@/components/fleet/fleet-create-account";

export const metadata: Metadata = {
  title: "Commercial Fleet Tire Management | Xtreme Mobile Tire",
  description:
    "Cut downtime with on-site commercial fleet tire maintenance, emergency roadside dispatch, and scheduled inspections. Tailored B2B fleet service plans.",
  alternates: {
    canonical: "/fleet-solutions",
  },
  keywords: [
    "commercial fleet tire services",
    "mobile fleet tire maintenance",
    "on-site commercial tire repair",
    "fleet tire management solutions",
    "commercial truck mobile tire service",
    "emergency fleet roadside tire service",
    "mobile tire replacement for business fleets",
    "fleet tire inspection"
  ],
  openGraph: {
    title: "Commercial Fleet Tire Management | Xtreme Mobile Tire",
    description:
      "Cut downtime with on-site commercial fleet tire maintenance, emergency roadside dispatch, and scheduled inspections. Tailored B2B fleet service plans.",
    url: "/fleet-solutions",
    type: "website",
    images: [
      {
        url: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426863/xtreme/landing/fleet-trucks_jpg.jpg",
        width: 1200,
        height: 630,
        alt: "Commercial Fleet Tire Management & On-Site Maintenance",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Commercial Fleet Tire Management | Xtreme Mobile Tire",
    description:
      "Cut downtime with on-site commercial fleet tire maintenance, emergency roadside dispatch, and scheduled inspections. Tailored B2B fleet service plans.",
    images: [
      "https://res.cloudinary.com/ebjikx52/image/upload/v1792426863/xtreme/landing/fleet-trucks_jpg.jpg",
    ],
  },
};

export default function FleetSolutionsPage() {
  return (
    <PageShell>
      <div className="w-full flex-1 flex flex-col">
        {/* Commercial Fleet Solutions Hero (Fanned Cards with Commercial Fleet Photography) */}
        <FleetHero />

        {/* Get Your Fleet Protected (Interactive 3-Step Onboarding with Picture Box) */}
        <FleetOnboardingSteps />

        {/* Everything Included in Your Fleet Manager Portal (2x2 Architectural Grid) */}
        <FleetPortalFeatures />

        {/* Ready to Eliminate Fleet Downtime Banner and 24/7 Dispatch Bar */}
        <FleetDowntimeBanner />

        {/* Create Your Fleet Account (Interactive 4-Step / 2-Fields Form matching Wireframe) */}
        <FleetCreateAccount />
      </div>
    </PageShell>
  );
}

import type { Metadata } from "next";
import PageShell from "@/components/layout/page-shell";
import ServicesHero from "@/components/services/services-hero";
import ServicesShowcase from "@/components/services/services-showcase";
import AboutContactLocations from "@/components/about/about-contact-locations";

export const metadata: Metadata = {
  title: "Mobile Tire Repair & Replacement | We Come To You",
  description:
    "On-site flat tire repair, new tire installation, mounting & balancing at your home, work, or roadside. 24/7 rapid mobile dispatch. View our services.",
  alternates: {
    canonical: "/services",
  },
  keywords: [
    "mobile tire replacement",
    "flat tire change service on site",
    "roadside tire replacement service",
    "on demand tire puncture repair",
    "mobile tire mounting and balancing near me",
    "tire change at my location",
    "cost of mobile tire replacement",
    "same day mobile tire installation"
  ],
  openGraph: {
    title: "Mobile Tire Repair & Replacement | We Come To You",
    description:
      "On-site flat tire repair, new tire installation, mounting & balancing at your home, work, or roadside. 24/7 rapid mobile dispatch.",
    url: "/services",
    type: "website",
    images: [
      {
        url: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426883/xtreme/landing/service-tire-change_jpg.jpg",
        width: 1200,
        height: 630,
        alt: "Mobile Tire Repair and Replacement Service",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mobile Tire Repair & Replacement | We Come To You",
    description:
      "On-site flat tire repair, new tire installation, mounting & balancing at your home, work, or roadside. 24/7 rapid mobile dispatch.",
    images: [
      "https://res.cloudinary.com/ebjikx52/image/upload/v1792426883/xtreme/landing/service-tire-change_jpg.jpg",
    ],
  },
};

export default function ServicesPage() {
  return (
    <PageShell>
      <div className="w-full flex-1 flex flex-col">
        {/* Services Hero: 3-Card Fanned Triptych with Half-Card Initial Landing and Full Scroll Reveal */}
        <ServicesHero />

        {/* Interactive 5-Category Services Showcase matching wireframe & inspiration */}
        <ServicesShowcase />

        {/* Direct Contact & Support Locations Section */}
        <AboutContactLocations />
      </div>
    </PageShell>
  );
}

import PageShell from "@/components/layout/page-shell";
import ServicesHero from "@/components/services/services-hero";
import ServicesShowcase from "@/components/services/services-showcase";
import AboutContactLocations from "@/components/about/about-contact-locations";

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

import PageShell from "@/components/layout/page-shell";
import ServicesHero from "@/components/services/services-hero";

export default function ServicesPage() {
  return (
    <PageShell>
      <div className="w-full flex-1 flex flex-col">
        {/* Services Hero: 3-Card Fanned Triptych with Half-Card Initial Landing and Full Scroll Reveal */}
        <ServicesHero />
      </div>
    </PageShell>
  );
}

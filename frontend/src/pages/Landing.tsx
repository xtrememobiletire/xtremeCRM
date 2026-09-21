import LandingNav from '../components/pages/landing/LandingNav';
import LandingHero from '../components/pages/landing/LandingHero';
import QuickBookWidget from '../components/pages/landing/QuickBookWidget';
import ServicesSection from '../components/pages/landing/ServicesSection';
import FleetBanner from '../components/pages/landing/FleetBanner';
import LandingFooter from '../components/pages/landing/LandingFooter';

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-red-600 selection:text-white">
      <LandingNav />
      <main className="flex-1">
        <LandingHero />
        <QuickBookWidget />
        <ServicesSection />
        <FleetBanner />
      </main>
      <LandingFooter />
    </div>
  );
}

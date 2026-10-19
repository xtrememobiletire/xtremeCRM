import PageShell from "@/components/layout/page-shell";
import FleetHero from "@/components/fleet/fleet-hero";
import FleetOnboardingSteps from "@/components/fleet/fleet-onboarding-steps";
import FleetPortalFeatures from "@/components/fleet/fleet-portal-features";
import FleetDowntimeBanner from "@/components/fleet/fleet-downtime-banner";
import FleetCreateAccount from "@/components/fleet/fleet-create-account";

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

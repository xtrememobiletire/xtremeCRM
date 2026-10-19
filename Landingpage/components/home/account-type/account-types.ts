export type AccountKey = "fleet" | "personal";

export interface AccountOption {
  key: AccountKey;
  title: string;
  badge: string;
  subtitle?: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  imageSrc: string;
  imageAlt: string;
  imageTag: string;
  summaryText: string;
}

export const ACCOUNT_OPTIONS: Record<AccountKey, AccountOption> = {
  fleet: {
    key: "fleet",
    title: "Fleet Manager Account",
    badge: "B2B Fleet Operations",
    subtitle: "Enterprise management for commercial vehicle operators",
    features: [
      "Dedicated fleet dashboard",
      "24/7 driver dispatch — no management calls",
      "Fixed pricing with long-term contracts",
      "Weekly consolidated invoices",
    ],
    ctaLabel: "Sign Up for Fleet",
    ctaHref: "/signup",
    imageSrc: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426861/xtreme/landing/fleet-manager_jpg.jpg",
    imageAlt: "Commercial Freight and Fleet Van Logistics",
    imageTag: "Active Fleet Telemetry",
    summaryText:
      "Manage your entire fleet with one account, dedicated support, maintenance alerts, and flexible weekly billing.",
  },
  personal: {
    key: "personal",
    title: "Personal Membership",
    badge: "Individual VIP Driver",
    subtitle:
      "Enjoy priority mobile tire service, exclusive rates, faster response times, and personalized service history wherever you are.",
    features: [
      "Priority dispatch & faster response",
      "Exclusive member pricing on all services",
      "Seasonal tire change reminders",
    ],
    ctaLabel: "Join Membership",
    ctaHref: "/booking",
    imageSrc: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426876/xtreme/landing/personal-membership_jpg.jpg",
    imageAlt: "Luxury Personal Car Mobile Tire Support",
    imageTag: "On-Demand Driver Assist",
    summaryText:
      "Enjoy priority mobile tire service, exclusive rates, faster response times, and personalized service history wherever you are.",
  },
};

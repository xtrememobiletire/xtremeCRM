import type { Metadata } from "next";
import HomeView from "@/components/home/home-view";

export const metadata: Metadata = {
  title: "24/7 Mobile Tire Service & Repair | Xtreme Mobile Tire",
  description:
    "Flat tire? We come to you 24/7. Fast on-demand mobile tire repair, replacement, and roadside assistance for cars & fleets. Call or book online now!",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "24/7 Mobile Tire Service & Repair | Xtreme Mobile Tire",
    description:
      "Flat tire? We come to you 24/7. Fast on-demand mobile tire repair, replacement, and roadside assistance for cars & fleets.",
    url: "/",
    type: "website",
    images: [
      {
        url: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426881/xtreme/landing/service-mobile-van_jpg.jpg",
        width: 1200,
        height: 630,
        alt: "24/7 Mobile Tire Service Van on Site",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "24/7 Mobile Tire Service & Repair | Xtreme Mobile Tire",
    description:
      "Flat tire? We come to you 24/7. Fast on-demand mobile tire repair, replacement, and roadside assistance for cars & fleets.",
    images: [
      "https://res.cloudinary.com/ebjikx52/image/upload/v1792426881/xtreme/landing/service-mobile-van_jpg.jpg",
    ],
  },
};

export default function HomePage() {
  return <HomeView />;
}

import type { Metadata } from "next";
import BookingView from "@/components/booking/booking-view";

export const metadata: Metadata = {
  title: "Book 24/7 Mobile Tire Service Online | Fast Dispatch",
  description:
    "Need tire help right now? Book on-demand mobile tire repair or replacement in minutes. Fast 24/7 dispatch directly to your exact location.",
  alternates: {
    canonical: "/booking",
  },
  keywords: [
    "emergency mobile tire repair",
    "same day mobile tire installation",
    "book mobile tire change online",
    "emergency tire service near me",
    "24/7 roadside tire dispatch",
    "mobile tire repair appointment",
    "on demand tire repair booking"
  ],
  openGraph: {
    title: "Book 24/7 Mobile Tire Service Online | Fast Dispatch",
    description:
      "Need tire help right now? Book on-demand mobile tire repair or replacement in minutes. Fast 24/7 dispatch directly to your exact location.",
    url: "/booking",
    type: "website",
    images: [
      {
        url: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426881/xtreme/landing/service-mobile-van_jpg.jpg",
        width: 1200,
        height: 630,
        alt: "Book 24/7 Mobile Tire Service",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Book 24/7 Mobile Tire Service Online | Fast Dispatch",
    description:
      "Need tire help right now? Book on-demand mobile tire repair or replacement in minutes. Fast 24/7 dispatch directly to your exact location.",
    images: [
      "https://res.cloudinary.com/ebjikx52/image/upload/v1792426881/xtreme/landing/service-mobile-van_jpg.jpg",
    ],
  },
};

export default function BookingPage() {
  return <BookingView />;
}

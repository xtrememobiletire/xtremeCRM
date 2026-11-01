import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";
import { OrganizationSchema } from "@/components/seo/json-ld";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://xtrememobiletire.com";

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "24/7 Mobile Tire Service & Repair | Xtreme Mobile Tire",
    template: "%s | Xtreme Mobile Tire",
  },
  description:
    "Flat tire? We come to you 24/7. Fast on-demand mobile tire repair, replacement, and roadside assistance for cars & fleets. Call or book online now!",
  applicationName: "Xtreme Mobile Tire",
  authors: [{ name: "Xtreme Mobile Tire", url: siteUrl }],
  generator: "Next.js",
  keywords: [
    "mobile tire repair",
    "mobile tire service near me",
    "emergency mobile tire repair",
    "24/7 mobile tire service",
    "flat tire change service on site",
    "mobile tire replacement at home",
    "roadside tire replacement service",
    "commercial fleet tire services",
    "on-site mobile tire installation",
    "mobile tire mounting and balancing",
    "tire change at my location",
    "emergency fleet roadside tire service"
  ],
  creator: "Xtreme Mobile Tire",
  publisher: "Xtreme Mobile Tire",
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Xtreme Mobile Tire",
    title: "24/7 Mobile Tire Service & Repair | Xtreme Mobile Tire",
    description:
      "Flat tire? We come to you 24/7. Fast on-demand mobile tire repair, replacement, and roadside assistance for cars & fleets.",
    images: [
      {
        url: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426881/xtreme/landing/service-mobile-van_jpg.jpg",
        width: 1200,
        height: 630,
        alt: "Xtreme Mobile Tire 24/7 Emergency Service Van",
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
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426897/xtreme/frontend/favicon_png.png",
    shortcut: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426897/xtreme/frontend/favicon_png.png",
    apple: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426897/xtreme/frontend/favicon_png.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", sans.variable, serif.variable)} suppressHydrationWarning>
      <head>
        <link rel="icon" href="https://res.cloudinary.com/ebjikx52/image/upload/v1792426897/xtreme/frontend/favicon_png.png" type="image/png" />
        <OrganizationSchema />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{sessionStorage.removeItem("theme");localStorage.removeItem("theme");var t=sessionStorage.getItem("xtreme_theme");if(t==="dark"){document.documentElement.classList.add("dark");}else{document.documentElement.classList.remove("dark");}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-white text-zinc-900 dark:bg-black dark:text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}

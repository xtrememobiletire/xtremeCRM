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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://calltire.net";

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "24/7 Mobile Tire Service & Repair | CALL TIRE Inc.",
    template: "%s | CALL TIRE Inc.",
  },
  description:
    "Flat tire? We come to you 24/7. Fast on-demand mobile tire repair, replacement, and roadside assistance for cars & fleets. Call or book online now!",
  applicationName: "CALL TIRE Inc.",
  authors: [{ name: "CALL TIRE Inc.", url: siteUrl }],
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
  creator: "CALL TIRE Inc.",
  publisher: "CALL TIRE Inc.",
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
    siteName: "CALL TIRE Inc.",
    title: "24/7 Mobile Tire Service & Repair | CALL TIRE Inc.",
    description:
      "Flat tire? We come to you 24/7. Fast on-demand mobile tire repair, replacement, and roadside assistance for cars & fleets.",
    images: [
      {
        url: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426881/xtreme/landing/service-mobile-van_jpg.jpg",
        width: 1200,
        height: 630,
        alt: "CALL TIRE Inc. 24/7 Emergency Service Van",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "24/7 Mobile Tire Service & Repair | CALL TIRE Inc.",
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
    icon: [
      { url: "/favicon.png?v=3", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png?v=3", type: "image/png", sizes: "16x16" },
      { url: "/favicon.ico?v=3", sizes: "any" },
    ],
    shortcut: "/favicon.png?v=3",
    apple: "/apple-touch-icon.png?v=3",
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
        <link rel="icon" href="/favicon.png?v=3" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon-16x16.png?v=3" type="image/png" sizes="16x16" />
        <link rel="icon" href="/favicon.ico?v=3" sizes="any" />
        <link rel="shortcut icon" href="/favicon.png?v=3" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=3" />
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

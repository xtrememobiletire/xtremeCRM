import type { Metadata } from "next";
import "./globals.css";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";

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

export const metadata: Metadata = {
  title: "Xtreme Mobile Tire | 24/7 Mobile Tire Service and Fleet Support",
  description: "On-demand mobile tire repair, replacement, and fleet management delivered directly to your location.",
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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=sessionStorage.getItem("theme");if(t==="dark"){document.documentElement.classList.add("dark");}else{document.documentElement.classList.remove("dark");}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-white text-zinc-900 dark:bg-black dark:text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}

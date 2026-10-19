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
  title: "XtremeCRM",
  description: "Next-generation CRM platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans dark", sans.variable, serif.variable)} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=sessionStorage.getItem("theme");if(t==="light"){document.documentElement.classList.remove("dark");}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-neutral-light text-neutral-dark dark:bg-neutral-dark dark:text-neutral-light antialiased">
        {children}
      </body>
    </html>
  );
}

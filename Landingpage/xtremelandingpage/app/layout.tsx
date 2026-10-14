import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="min-h-screen bg-neutral-light text-neutral-dark dark:bg-neutral-dark dark:text-neutral-light antialiased">
        {children}
      </body>
    </html>
  );
}

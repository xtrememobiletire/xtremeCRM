"use client";

import Navbar from "./navbar";

export interface HeaderProps {
  brandName?: string;
  logoSrc?: string;
}

export default function Header({
  brandName = "Xtreme Mobile Tire",
  logoSrc,
}: HeaderProps) {
  return (
    <div className="w-full flex justify-center">
      {/* Announcement bar temporarily excluded as requested */}
      <Navbar brandName={brandName} logoSrc={logoSrc} />
    </div>
  );
}

"use client";

import Navbar from "./navbar";

export interface HeaderProps {
  brandName?: string;
  logoSrc?: string;
  onLogoClick?: () => void;
  hide?: boolean;
}

export default function Header({
  brandName = "Xtreme Mobile Tire",
  logoSrc = "https://res.cloudinary.com/ebjikx52/image/upload/v1792426904/xtreme/frontend/logo_webp.webp",
  onLogoClick,
  hide = false,
}: HeaderProps) {
  return (
    <div className="w-full flex justify-center">
      {/* Announcement bar temporarily excluded as requested */}
      <Navbar brandName={brandName} logoSrc={logoSrc} onLogoClick={onLogoClick} hide={hide} />
    </div>
  );
}

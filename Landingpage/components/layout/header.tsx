"use client";

import Navbar from "../home/navbar";

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
      <Navbar brandName={brandName} logoSrc={logoSrc} />
    </div>
  );
}

"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";

interface SpecularButtonProps {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "crimson" | "white";
  className?: string;
}

export default function SpecularButton({
  label,
  href,
  onClick,
  variant = "crimson",
  className = "",
}: SpecularButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseLeave = () => {
    setMousePos(null);
  };

  const isCrimson = variant === "crimson";

  // Specular light colors
  const shineColor = isCrimson
    ? "rgba(220, 38, 38, 0.85)"
    : "rgba(255, 255, 255, 0.9)";
  const idleBorderColor = isCrimson
    ? "rgba(220, 38, 38, 0.35)"
    : "rgba(255, 255, 255, 0.2)";

  const content = (
    <div
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative inline-flex items-center justify-center w-48 sm:w-52 h-12 sm:h-13 rounded-none overflow-hidden select-none transition-transform duration-200 active:scale-95 cursor-pointer ${className}`}
      style={{
        backgroundColor: "rgba(10, 10, 10, 0.75)",
      }}
    >
      {/* Specular edge light layer (follows mouse around border) */}
      <div
        className="pointer-events-none absolute inset-0 rounded-none transition-opacity duration-300"
        style={{
          padding: "1.5px",
          background: mousePos
            ? `radial-gradient(130px circle at ${mousePos.x}px ${mousePos.y}px, ${shineColor}, ${idleBorderColor} 60%, transparent 100%)`
            : idleBorderColor,
          WebkitMask:
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />

      {/* Specular glass reflection pool inside button */}
      <div
        className="pointer-events-none absolute inset-0 rounded-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: mousePos
            ? `radial-gradient(100px circle at ${mousePos.x}px ${mousePos.y}px, ${
                isCrimson
                  ? "rgba(220, 38, 38, 0.18)"
                  : "rgba(255, 255, 255, 0.12)"
              }, transparent 80%)`
            : "transparent",
        }}
      />

      {/* Button Text: Consistent typography, NO arrows */}
      <span className="relative z-10 font-bold text-sm sm:text-base tracking-wide text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
        {label}
      </span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block group focus:outline-none">
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-block group focus:outline-none"
    >
      {content}
    </button>
  );
}

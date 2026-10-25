"use client";

import React, { useState, useRef, useEffect } from "react";
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
  const [autoPos, setAutoPos] = useState<{ x: number; y: number }>({ x: 50, y: 0 });

  // Continuous auto-animation: Specular light travels continuously along the rectangular perimeter
  useEffect(() => {
    let rafId: number;
    let startTime: number | null = null;
    const speed = 160; // pixels per second

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const elapsed = (time - startTime) / 1000;

      const W = buttonRef.current?.offsetWidth || 208;
      const H = buttonRef.current?.offsetHeight || 52;
      const P = 2 * (W + H);

      const d = (elapsed * speed) % P;
      let x = 0;
      let y = 0;

      if (d < W) {
        // Top edge: moving left to right
        x = d;
        y = 0;
      } else if (d < W + H) {
        // Right edge: moving top to bottom
        x = W;
        y = d - W;
      } else if (d < 2 * W + H) {
        // Bottom edge: moving right to left
        x = W - (d - (W + H));
        y = H;
      } else {
        // Left edge: moving bottom to top
        x = 0;
        y = H - (d - (2 * W + H));
      }

      setAutoPos({ x, y });
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, []);

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

  // When hovering, follow mouse; when not hovering (and on mobile/touch), continuously auto-glide!
  const activePos = mousePos || autoPos;

  // Specular light colors (vivid & always on)
  const shineColor = isCrimson
    ? "rgba(255, 75, 75, 1)"
    : "rgba(255, 255, 255, 1)";
  const ambientBorderColor = isCrimson
    ? "rgba(220, 38, 38, 0.45)"
    : "rgba(255, 255, 255, 0.35)";

  const content = (
    <div
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative inline-flex items-center justify-center w-48 sm:w-52 h-12 sm:h-13 rounded-none overflow-hidden select-none transition-transform duration-200 active:scale-95 cursor-pointer ${
        isCrimson
          ? "shadow-[0_0_20px_-3px_rgba(220,38,38,0.45)]"
          : "shadow-[0_0_20px_-3px_rgba(255,255,255,0.3)]"
      } ${className}`}
      style={{
        backgroundColor: "rgba(10, 10, 10, 0.85)",
      }}
    >
      {/* Specular edge light layer (ALWAYS active and gliding along the border perimeter) */}
      <div
        className="pointer-events-none absolute inset-0 rounded-none"
        style={{
          padding: "1.5px",
          background: `radial-gradient(130px circle at ${activePos.x}px ${activePos.y}px, ${shineColor}, ${ambientBorderColor} 55%, transparent 100%)`,
          WebkitMask:
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />

      {/* Specular glass reflection pool inside button (ALWAYS visibly shining) */}
      <div
        className="pointer-events-none absolute inset-0 rounded-none"
        style={{
          background: `radial-gradient(90px circle at ${activePos.x}px ${activePos.y}px, ${
            isCrimson
              ? "rgba(220, 38, 38, 0.25)"
              : "rgba(255, 255, 255, 0.18)"
          }, transparent 80%)`,
        }}
      />

      {/* Button Text: Consistent typography, bold and sharp */}
      <span className="relative z-10 font-bold text-sm sm:text-base tracking-wide text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">
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

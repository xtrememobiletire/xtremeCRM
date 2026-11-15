"use client";

import React, { useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface SpecularButtonProps {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "crimson" | "white";
  className?: string;
  showArrow?: boolean;
}

export default function SpecularButton({
  label,
  href,
  onClick,
  variant = "crimson",
  className = "",
  showArrow = true,
}: SpecularButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const isHoveredRef = useRef(false);

  // Continuous auto-animation: Specular light travels continuously along the rectangular perimeter
  // Uses CSS variables --spec-x and --spec-y directly on the DOM element with 0 React re-renders!
  useEffect(() => {
    let rafId: number;
    let startTime: number | null = null;
    const speed = 160; // pixels per second

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const elapsed = (time - startTime) / 1000;

      const el = buttonRef.current;
      if (el && !isHoveredRef.current) {
        const W = el.offsetWidth || 208;
        const H = el.offsetHeight || 52;
        const P = 2 * (W + H);

        const d = (elapsed * speed) % P;
        let x = 0;
        let y = 0;

        if (d < W) {
          x = d;
          y = 0;
        } else if (d < W + H) {
          x = W;
          y = d - W;
        } else if (d < 2 * W + H) {
          x = W - (d - (W + H));
          y = H;
        } else {
          x = 0;
          y = H - (d - (2 * W + H));
        }

        el.style.setProperty("--spec-x", `${x.toFixed(1)}px`);
        el.style.setProperty("--spec-y", `${y.toFixed(1)}px`);
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = buttonRef.current;
    if (!el) return;
    isHoveredRef.current = true;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty("--spec-x", `${x.toFixed(1)}px`);
    el.style.setProperty("--spec-y", `${y.toFixed(1)}px`);
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
  };

  const isCrimson = variant === "crimson";

  // Specular light colors (vivid & always on)
  const shineColor = isCrimson
    ? "rgba(255, 255, 255, 0.95)"
    : "rgba(255, 255, 255, 0.9)";
  const ambientBorderColor = isCrimson
    ? "rgba(255, 200, 200, 0.45)"
    : "rgba(255, 255, 255, 0.35)";

  const content = (
    <div
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative inline-flex items-center justify-center ${
        className.includes("w-") ? "" : "w-48 sm:w-52"
      } min-h-[44px] h-12 sm:h-13 rounded-none overflow-hidden select-none transition-all duration-200 active:scale-95 cursor-pointer ${
        isCrimson
          ? "bg-[var(--brand-primary)] hover:bg-[var(--brand-secondary)] text-white shadow-[0_0_24px_rgba(200,16,46,0.55)] border border-[var(--brand-primary)]/80"
          : "bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/25 text-white shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
      } ${className}`}
    >
      {/* Specular edge light layer (ALWAYS active and gliding along the border perimeter via CSS variables) */}
      <div
        className="pointer-events-none absolute inset-0 rounded-none"
        style={{
          padding: "1.5px",
          background: `radial-gradient(130px circle at var(--spec-x, 50px) var(--spec-y, 0px), ${shineColor}, ${ambientBorderColor} 55%, transparent 100%)`,
          WebkitMask:
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />

      {/* Specular glass reflection pool inside button */}
      <div
        className="pointer-events-none absolute inset-0 rounded-none"
        style={{
          background: `radial-gradient(90px circle at var(--spec-x, 50px) var(--spec-y, 0px), ${
            isCrimson
              ? "rgba(255, 255, 255, 0.25)"
              : "rgba(255, 255, 255, 0.18)"
          }, transparent 80%)`,
        }}
      />

      {/* Button Text & Arrow: Consistent typography, bold and sharp */}
      <div className="relative z-10 flex items-center justify-center gap-2 px-3 text-center">
        <span className="font-bold text-xs xs:text-sm sm:text-base tracking-wide text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
          {label}
        </span>
        {showArrow && (
          <ArrowUpRight className="w-4 h-4 text-white transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0 drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]" />
        )}
      </div>
    </div>
  );

  const wrapperClass = `${className.includes("w-full") ? "w-full xs:w-auto" : ""} inline-block group focus:outline-none`;

  if (href) {
    return (
      <Link href={href} className={wrapperClass}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={wrapperClass}
    >
      {content}
    </button>
  );
}

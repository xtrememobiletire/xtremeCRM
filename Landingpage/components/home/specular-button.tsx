"use client";

import React, { useRef, useEffect } from "react";
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
    ? "rgba(255, 75, 75, 1)"
    : "rgba(255, 255, 255, 1)";
  const ambientBorderColor = isCrimson
    ? "rgba(200, 16, 46, 0.45)"
    : "rgba(255, 255, 255, 0.35)";

  const content = (
    <div
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative inline-flex items-center justify-center ${
        className.includes("w-") ? "" : "w-48 sm:w-52"
      } min-h-[44px] h-12 sm:h-13 rounded-none overflow-hidden select-none transition-transform duration-200 active:scale-95 cursor-pointer ${
        isCrimson
          ? "bg-zinc-950/90 text-white shadow-[0_0_20px_-3px_rgba(200,16,46,0.45)]"
          : "bg-white hover:bg-zinc-100 dark:bg-zinc-900/90 text-zinc-950 dark:text-white border border-black/15 dark:border-white/20 shadow-[0_0_20px_-3px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_-3px_rgba(255,255,255,0.2)]"
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

      {/* Specular glass reflection pool inside button (ALWAYS visibly shining) */}
      <div
        className="pointer-events-none absolute inset-0 rounded-none"
        style={{
          background: `radial-gradient(90px circle at var(--spec-x, 50px) var(--spec-y, 0px), ${
            isCrimson
              ? "rgba(200, 16, 46, 0.25)"
              : "rgba(255, 255, 255, 0.18)"
          }, transparent 80%)`,
        }}
      />

      {/* Button Text: Consistent typography, bold and sharp */}
      <span
        className={`relative z-10 font-bold text-xs xs:text-sm sm:text-base tracking-wide px-3 text-center ${
          isCrimson
            ? "text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]"
            : "text-zinc-900 dark:text-white dark:drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]"
        }`}
      >
        {label}
      </span>
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

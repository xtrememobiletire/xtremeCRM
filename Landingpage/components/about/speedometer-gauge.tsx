"use client";

import { useMemo } from "react";

interface SpeedometerGaugeProps {
  progress: number; // 0 (idle / left) to 1 (max / right)
  currentSpeed: number; // 0 to 180 MPH
  className?: string;
}

export default function SpeedometerGauge({
  progress = 0,
  currentSpeed = 0,
  className = "",
}: SpeedometerGaugeProps) {
  // Center coordinates & dimensions matching ProTuners semi-circular inspiration
  const cx = 240;
  const cy = 250;

  // Sweep angle: -115° (idle, bottom-left) to +115° (max, bottom-right)
  const minAngle = -115;
  const maxAngle = 115;
  const totalSweep = maxAngle - minAngle; // 230°

  // Current needle angle based on progress (clamped between min and max)
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const currentAngle = minAngle + clampedProgress * totalSweep;

  // Helper to round coordinates to 2 decimal places, preventing server/client IEEE-754 precision hydration mismatches
  const round = (num: number) => Math.round(num * 100) / 100;

  // Polar to Cartesian helper (0° = 12 o'clock, clockwise)
  const polarToCartesian = (radius: number, angleDeg: number) => {
    const angleRad = ((angleDeg - 90) * Math.PI) / 180.0;
    return {
      x: round(cx + radius * Math.cos(angleRad)),
      y: round(cy + radius * Math.sin(angleRad)),
    };
  };

  // Generate outer fine radial ticks (fine gray lines radiating outward)
  const outerTicks = useMemo(() => {
    const ticks = [];
    const step = 2.5; // dense tick resolution
    for (let a = minAngle; a <= maxAngle; a += step) {
      const isMajor = Math.abs(a % 10) < 0.5;
      const isMedium = Math.abs(a % 5) < 0.5;
      const rInner = 188;
      const rOuter = isMajor ? 212 : isMedium ? 204 : 197;
      const p1 = polarToCartesian(rInner, a);
      const p2 = polarToCartesian(rOuter, a);
      ticks.push({
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        isMajor,
        angle: round(a),
      });
    }
    return ticks;
  }, []);

  // Generate inner chunky segmented glowing tick blocks (shifted close to outer tick line)
  const innerSegments = useMemo(() => {
    const segments = [];
    const step = 6.2; // chunky radial bars
    for (let a = -100; a <= 100; a += step) {
      const p1 = polarToCartesian(162, a);
      const p2 = polarToCartesian(186, a);
      segments.push({
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        angle: round(a),
      });
    }
    return segments;
  }, []);

  // Tapered aerodynamic racing needle (wide at center hub, razor thin at corner tip)
  const needleLength = 195;
  const rad = ((currentAngle - 90) * Math.PI) / 180.0;
  const ux = Math.cos(rad);
  const uy = Math.sin(rad);
  const nx = -uy;
  const ny = ux;

  const baseHalf = 2.2;
  const tipHalf = 0.5; // razor thin 1px at the corner

  const needlePath = `M ${round(cx - baseHalf * nx)} ${round(cy - baseHalf * ny)} ` +
    `L ${round(cx + baseHalf * nx)} ${round(cy + baseHalf * ny)} ` +
    `L ${round(cx + needleLength * ux + tipHalf * nx)} ${round(cy + needleLength * uy + tipHalf * ny)} ` +
    `L ${round(cx + (needleLength + 4) * ux)} ${round(cy + (needleLength + 4) * uy)} ` +
    `L ${round(cx + needleLength * ux - tipHalf * nx)} ${round(cy + needleLength * uy - tipHalf * ny)} Z`;

  return (
    <div className={`relative w-full max-w-[480px] mx-auto select-none ${className}`}>
      
      {/* Semi-Circular Instrument SVG */}
      <svg
        viewBox="0 0 480 355"
        className="w-full h-auto drop-shadow-[0_0_18px_rgba(200,16,46,0.12)]"
      >
        <defs>
          {/* Refined Crimson Red Soft Glow Filter */}
          <filter id="neonRedGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Elegant Needle Glow (Subtle & Refined, No Blinding Flare) */}
          <filter id="needleGlow" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Needle Gradient - Performance Crimson */}
          <linearGradient id="needleGradRed" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e63946" />
            <stop offset="45%" stopColor="#c8102e" />
            <stop offset="100%" stopColor="#800f2f" />
          </linearGradient>
        </defs>

        {/* 
          1. OUTER FINE RADIAL TICKS (Adaptive Contrast for Light & Dark)
        */}
        {outerTicks.map((tick, i) => {
          const isPassed = tick.angle <= currentAngle;
          return (
            <line
              key={`ot-${i}`}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke={isPassed ? "currentColor" : "currentColor"}
              strokeWidth={tick.isMajor ? 1.8 : 1}
              className={
                isPassed
                  ? "text-zinc-800 dark:text-zinc-300 opacity-80"
                  : "text-zinc-400 dark:text-zinc-700 opacity-40"
              }
            />
          );
        })}

        {/* 
          2. INNER CHUNKY SEGMENTED GLOWING TICKS (Refined Crimson Blocks with Decreased Opacity)
        */}
        {innerSegments.map((seg, i) => {
          const isIlluminated = seg.angle <= currentAngle;
          return (
            <line
              key={`is-${i}`}
              x1={seg.x1}
              y1={seg.y1}
              x2={seg.x2}
              y2={seg.y2}
              stroke={isIlluminated ? "var(--brand-primary)" : "currentColor"}
              strokeWidth="4.2"
              strokeLinecap="round"
              className={
                isIlluminated
                  ? "opacity-75"
                  : "text-zinc-300 dark:text-zinc-800 opacity-40"
              }
              filter={isIlluminated ? "url(#neonRedGlow)" : undefined}
            />
          );
        })}

        {/* 
          3. ILLUMINATED TAPERED CRIMSON NEEDLE
          - Tapers down to a razor-thin 1px corner point at the tip
          - Decreased opacity (0.85) for an elegant, non-blinding crimson finish
        */}
        <path
          d={needlePath}
          fill="#000000"
          opacity="0.25"
          transform="translate(1, 2)"
        />
        <path
          d={needlePath}
          fill="url(#needleGradRed)"
          filter="url(#needleGlow)"
          opacity="0.85"
        />

        {/* Center Pivot Ring (Refined Crimson Ring) */}
        <circle
          cx={cx}
          cy={cy}
          r="16"
          fill="currentColor"
          stroke="var(--brand-primary)"
          strokeWidth="2.8"
          strokeOpacity="0.85"
          className="text-white dark:text-black"
          filter="url(#neonRedGlow)"
        />
        <circle
          cx={cx}
          cy={cy}
          r="6"
          fill="var(--brand-primary)"
          fillOpacity="0.85"
        />

      </svg>

    </div>
  );
}

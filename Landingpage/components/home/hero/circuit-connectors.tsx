"use client";

import { motion } from "framer-motion";

export default function CircuitConnectors() {
  /* 
    Precision Orthogonal Dotted Circuit Tracks (viewBox: 0 0 1000 580):
    1. Left Column Vertical: Top-Left Card -> Bottom-Left Card (Direct border-to-border contact)
    2. Right Column Vertical: Top-Right Card -> Bottom-Right Card (Direct border-to-border contact)
    3. Center Left Line: Under Safety Protocol -> Laptop Screen Top
    4. Center Middle Line: Under Master Techs -> Laptop Screen Top
    5. Center Right Line: Under 100% Compliant -> Laptop Screen Top
    6. Top-Left Conduit: Top-Left Card -> Laptop Screen Top-Left
    7. Top-Right Conduit: Top-Right Card -> Laptop Screen Top-Right
    8. Bottom-Left Horizontal: Emergency Roadside -> Laptop Left Port
    9. Bottom-Right Horizontal: Fleet Portal Access -> Laptop Right Port

    HIGH CONTRAST IN BOTH LIGHT & DARK/BLACK THEMES:
    - Vivid neon-crimson telemetry gradient with boosted luminescence for dark/black backgrounds
    - Crisp high-visibility base dotted track in both themes
    - One-shot draw-to-freeze on page load (zero continuous looping)
  */
  const paths = [
    // 1. LEFT COLUMN VERTICAL: 24/7 Rapid Dispatch -> Emergency Roadside
    {
      id: "left-col-vertical",
      d: "M 131 144 L 131 436",
      start: { cx: 131, cy: 144 },
      end: { cx: 131, cy: 436 },
      delay: 0.1,
    },
    // 2. RIGHT COLUMN VERTICAL: On-Site Mounting -> Fleet Portal Access
    {
      id: "right-col-vertical",
      d: "M 869 144 L 869 436",
      start: { cx: 869, cy: 144 },
      end: { cx: 869, cy: 436 },
      delay: 0.15,
    },
    // 3. CENTER LEFT: TIA Safety Protocol -> Laptop Top Screen
    {
      id: "center-left",
      d: "M 375 144 L 375 344",
      start: { cx: 375, cy: 144 },
      end: { cx: 375, cy: 344 },
      delay: 0.2,
    },
    // 4. CENTER MIDDLE: TIA Master Techs -> Laptop Top Screen
    {
      id: "center-middle",
      d: "M 500 144 L 500 344",
      start: { cx: 500, cy: 144 },
      end: { cx: 500, cy: 344 },
      delay: 0.22,
    },
    // 5. CENTER RIGHT: TIA 100% Compliant -> Laptop Top Screen
    {
      id: "center-right",
      d: "M 625 144 L 625 344",
      start: { cx: 625, cy: 144 },
      end: { cx: 625, cy: 344 },
      delay: 0.24,
    },
    // 6. TOP-LEFT CARD: 24/7 Rapid Dispatch -> Laptop Top-Left Screen
    {
      id: "top-left-to-pc",
      d: "M 205 144 L 205 260 Q 205 270 215 270 L 350 270 Q 360 270 360 280 L 360 344",
      start: { cx: 205, cy: 144 },
      end: { cx: 360, cy: 344 },
      delay: 0.26,
    },
    // 7. TOP-RIGHT CARD: On-Site Mounting -> Laptop Top-Right Screen
    {
      id: "top-right-to-pc",
      d: "M 795 144 L 795 260 Q 795 270 785 270 L 650 270 Q 640 270 640 280 L 640 344",
      start: { cx: 795, cy: 144 },
      end: { cx: 640, cy: 344 },
      delay: 0.28,
    },
    // 8. BOTTOM-LEFT CARD: Emergency Roadside -> Laptop Left Port
    {
      id: "bottom-left-to-pc",
      d: "M 239 496 L 340 496",
      start: { cx: 239, cy: 496 },
      end: { cx: 340, cy: 496 },
      delay: 0.32,
    },
    // 9. BOTTOM-RIGHT CARD: Fleet Portal Access -> Laptop Right Port
    {
      id: "bottom-right-to-pc",
      d: "M 761 496 L 660 496",
      start: { cx: 761, cy: 496 },
      end: { cx: 660, cy: 496 },
      delay: 0.35,
    },
  ];

  return (
    <svg
      className="hidden lg:block absolute inset-0 w-full h-full pointer-events-none z-10"
      viewBox="0 0 1000 580"
      preserveAspectRatio="none"
      fill="none"
    >
      <defs>
        {/* High-Contrast Telemetry Gradient (Vibrant on both pure black and light backgrounds) */}
        <linearGradient id="dotted-circuit-glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff334b" stopOpacity="1" />
          <stop offset="50%" stopColor="#ef4444" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#dc2626" stopOpacity="0.85" />
        </linearGradient>

        {/* Telemetry Glow Filter */}
        <filter id="circuit-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* One-Shot Reveal Masks: Draws lines from card edge to target, then freezes completely */}
        {paths.map((item) => (
          <mask id={`mask-${item.id}`} key={`mask-${item.id}`}>
            <motion.path
              d={item.d}
              stroke="white"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: 1.0,
                delay: item.delay,
                ease: [0.16, 1, 0.3, 1],
              }}
            />
          </mask>
        ))}
      </defs>

      {paths.map((item) => (
        <g key={item.id}>
          {/* Base Inactive Dotted Track: Crisp & visible in both Light and Dark themes */}
          <path
            d={item.d}
            stroke="currentColor"
            className="text-slate-400/40 dark:text-slate-600/80"
            strokeWidth="1.5"
            strokeDasharray="5 5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Active High-Contrast Dotted Circuit Track */}
          <path
            d={item.d}
            stroke="url(#dotted-circuit-glow)"
            strokeWidth="2.5"
            strokeDasharray="5 5"
            strokeLinecap="round"
            fill="none"
            filter="url(#circuit-blur)"
            mask={`url(#mask-${item.id})`}
          />

          {/* Source Pin Terminal Node */}
          <motion.circle
            cx={item.start.cx}
            cy={item.start.cy}
            r="3.5"
            fill="#ff334b"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ duration: 0.3, delay: item.delay }}
            className="shadow-sm"
          />

          {/* Destination Pin Terminal Node */}
          <motion.circle
            cx={item.end.cx}
            cy={item.end.cy}
            r="3"
            fill="#ff334b"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.25, 1] }}
            transition={{ duration: 0.3, delay: item.delay + 0.8 }}
          />
        </g>
      ))}
    </svg>
  );
}

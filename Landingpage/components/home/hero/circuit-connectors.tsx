"use client";

import { motion } from "framer-motion";

export default function CircuitConnectors() {
  /* 
    Precision Orthogonal Circuit Lines connecting all boxes (viewBox: 0 0 1000 580):
    1. Left Column Vertical: Top-Left Card -> Bottom-Left Card (Direct border-to-border contact)
    2. Right Column Vertical: Top-Right Card -> Bottom-Right Card (Direct border-to-border contact)
    3. Center Left Line: Under Safety Protocol -> Laptop Screen Top
    4. Center Middle Line: Under Master Techs -> Laptop Screen Top
    5. Center Right Line: Under 100% Insured -> Laptop Screen Top
    6. Top-Left Conduit: Top-Left Card -> Laptop Screen Top-Left
    7. Top-Right Conduit: Top-Right Card -> Laptop Screen Top-Right
    8. Bottom-Left Horizontal: Emergency Roadside -> Laptop Left Port
    9. Bottom-Right Horizontal: Fleet Portal Access -> Laptop Right Port

    - Zero circular bulbs or terminal dots at the edges.
    - Pure white lines (no gray lines).
    - Clean edge-to-edge line connections directly touching the white box borders.
    - Smooth drawing transition on page load/refresh (pathLength: 0 -> 1).
  */
  const paths = [
    // 1. LEFT COLUMN VERTICAL: 24/7 Rapid Dispatch -> Emergency Roadside
    {
      id: "left-col-vertical",
      d: "M 131 144 L 131 436",
      delay: 0.1,
    },
    // 2. RIGHT COLUMN VERTICAL: On-Site Mounting -> Fleet Portal Access
    {
      id: "right-col-vertical",
      d: "M 869 144 L 869 436",
      delay: 0.15,
    },
    // 3. CENTER LEFT: Safety Protocol -> Laptop Top Screen
    {
      id: "center-left",
      d: "M 375 144 L 375 344",
      delay: 0.2,
    },
    // 4. CENTER MIDDLE: Master Techs -> Laptop Top Screen
    {
      id: "center-middle",
      d: "M 500 144 L 500 344",
      delay: 0.22,
    },
    // 5. CENTER RIGHT: 100% Insured -> Laptop Top Screen
    {
      id: "center-right",
      d: "M 625 144 L 625 344",
      delay: 0.24,
    },
    // 6. TOP-LEFT CARD: 24/7 Rapid Dispatch -> Laptop Top-Left Screen
    {
      id: "top-left-to-pc",
      d: "M 205 144 L 205 260 Q 205 270 215 270 L 350 270 Q 360 270 360 280 L 360 344",
      delay: 0.26,
    },
    // 7. TOP-RIGHT CARD: On-Site Mounting -> Laptop Top-Right Screen
    {
      id: "top-right-to-pc",
      d: "M 795 144 L 795 260 Q 795 270 785 270 L 650 270 Q 640 270 640 280 L 640 344",
      delay: 0.28,
    },
    // 8. BOTTOM-LEFT CARD: Emergency Roadside -> Laptop Left Port
    {
      id: "bottom-left-to-pc",
      d: "M 239 496 L 340 496",
      delay: 0.32,
    },
    // 9. BOTTOM-RIGHT CARD: Fleet Portal Access -> Laptop Right Port
    {
      id: "bottom-right-to-pc",
      d: "M 761 496 L 660 496",
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
        {/* Pure Brilliant White Line Glow */}
        <linearGradient id="circuit-line-glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="50%" stopColor="#f8fafc" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
        </linearGradient>

        {/* Telemetry Soft Glow Filter */}
        <filter id="circuit-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {paths.map((item) => (
        <g key={item.id}>
          {/* Base Neutral Guide Track: Clean semi-transparent white (zero gray) */}
          <path
            d={item.d}
            stroke="#ffffff"
            strokeOpacity="0.3"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Active Animated Telemetry Line: Pure solid white drawing smoothly across boxes */}
          <motion.path
            d={item.d}
            stroke="url(#circuit-line-glow)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            filter="url(#circuit-blur)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              pathLength: {
                duration: 1.1,
                delay: item.delay,
                ease: [0.16, 1, 0.3, 1],
              },
              opacity: {
                duration: 0.3,
                delay: item.delay,
              },
            }}
          />
        </g>
      ))}
    </svg>
  );
}
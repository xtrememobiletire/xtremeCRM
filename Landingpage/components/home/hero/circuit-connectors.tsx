"use client";

import { motion } from "framer-motion";

export default function CircuitConnectors() {
  /* 
    Precision Orthogonal Dotted Circuit Lines (viewBox: 0 0 1000 580):
    1. TWO RED CONDUITS:
       - Top-Left Card -> Laptop Top-Left Screen
       - Top-Right Card -> Laptop Top-Right Screen
       Vivid Crimson Red, dotted, animating and streaming directly into the center screen.

    2. CRISP DARK-WHITE CONDUITS (High Visibility on Gray Canvas):
       - Left Column Vertical: Top-Left Card -> Bottom-Left Card
       - Right Column Vertical: Top-Right Card -> Bottom-Right Card
       - Center Left: Safety Protocol -> Laptop Top Screen
       - Center Middle: Master Techs -> Laptop Top Screen
       - Center Right: 100% Insured -> Laptop Top Screen
       - Bottom-Left: Emergency Roadside -> Laptop Left Port
       - Bottom-Right: Fleet Portal Access -> Laptop Right Port
       Crisp White / Dark White, clearly visible and dotted, flowing into the center screen.
  */

  // 1. Two Main Red Conduit Lines (Connecting Top Cards to Laptop Screen)
  const redPaths = [
    {
      id: "top-left-to-pc",
      d: "M 205 144 L 205 230 Q 205 240 215 240 L 350 240 Q 360 240 360 250 L 360 280",
      delay: 0.15,
    },
    {
      id: "top-right-to-pc",
      d: "M 795 144 L 795 230 Q 795 240 785 240 L 650 240 Q 640 240 640 250 L 640 280",
      delay: 0.2,
    },
  ];

  // 2. Supporting Dark White Conduit Lines (Dotted, High Visibility)
  const darkWhitePaths = [
    // Left Column Vertical: 24/7 Rapid Dispatch -> Emergency Roadside
    {
      id: "left-col-vertical",
      d: "M 131 144 L 131 436",
      delay: 0.1,
    },
    // Right Column Vertical: On-Site Mounting -> Fleet Portal Access
    {
      id: "right-col-vertical",
      d: "M 869 144 L 869 436",
      delay: 0.12,
    },
    // Center Left: Safety Protocol -> Laptop Top Screen
    {
      id: "center-left",
      d: "M 375 144 L 375 280",
      delay: 0.22,
    },
    // Center Middle: Master Techs -> Laptop Top Screen
    {
      id: "center-middle",
      d: "M 500 144 L 500 280",
      delay: 0.24,
    },
    // Center Right: 100% Insured -> Laptop Top Screen
    {
      id: "center-right",
      d: "M 625 144 L 625 280",
      delay: 0.26,
    },
    // Bottom-Left: Emergency Roadside -> Laptop Left Port
    {
      id: "bottom-left-to-pc",
      d: "M 239 480 L 335 480",
      delay: 0.28,
    },
    // Bottom-Right: Fleet Portal Access -> Laptop Right Port
    {
      id: "bottom-right-to-pc",
      d: "M 761 480 L 665 480",
      delay: 0.3,
    },
  ];

  const allPaths = [...redPaths, ...darkWhitePaths];

  return (
    <svg
      className="hidden xl:block absolute inset-0 w-full h-full pointer-events-none z-10"
      viewBox="0 0 1000 580"
      preserveAspectRatio="none"
      fill="none"
    >
      <defs>
        {/* Vivid Automotive Crimson Red Gradient */}
        <linearGradient id="red-dotted-glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff3856" stopOpacity="1" />
          <stop offset="50%" stopColor="#ef4444" stopOpacity="1" />
          <stop offset="100%" stopColor="#dc2626" stopOpacity="0.95" />
        </linearGradient>

        {/* Soft Red Telemetry Glow Filter */}
        <filter id="red-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Crisp White Telemetry Filter */}
        <filter id="white-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* 
          One-Shot Draw-In Reveal Masks:
          Animates from card source and smoothly joins into the center laptop screen on load/refresh.
        */}
        {allPaths.map((item) => (
          <mask id={`mask-${item.id}`} key={`mask-${item.id}`}>
            <motion.path
              d={item.d}
              stroke="white"
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: 1.1,
                delay: item.delay,
                ease: [0.16, 1, 0.3, 1],
              }}
            />
          </mask>
        ))}
      </defs>

      {/* ================================================================= */}
      {/* 1. CRISP DARK-WHITE DOTTED CONDUITS                               */}
      {/* ================================================================= */}
      {darkWhitePaths.map((item) => (
        <g key={item.id}>
          {/* Static Clearly Visible Base Dotted Track */}
          <path
            d={item.d}
            stroke="rgba(255, 255, 255, 0.35)"
            strokeWidth="1.75"
            strokeDasharray="5 6"
            strokeLinecap="round"
            fill="none"
          />

          {/* Active Crisp White Dotted Stream (Flowing into Center Screen) */}
          <g mask={`url(#mask-${item.id})`}>
            <motion.path
              d={item.d}
              stroke="rgba(255, 255, 255, 0.88)"
              strokeWidth="2.5"
              strokeDasharray="5 6"
              strokeLinecap="round"
              fill="none"
              filter="url(#white-glow)"
              animate={{
                strokeDashoffset: [0, -22],
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </g>
        </g>
      ))}

      {/* ================================================================= */}
      {/* 2. TWO RED DOTTED CONDUITS (Top-Left & Top-Right into Laptop)      */}
      {/* ================================================================= */}
      {redPaths.map((item) => (
        <g key={item.id}>
          {/* Static Visible Red Base Dotted Track */}
          <path
            d={item.d}
            stroke="rgba(239, 68, 68, 0.32)"
            strokeWidth="1.75"
            strokeDasharray="5 6"
            strokeLinecap="round"
            fill="none"
          />

          {/* Active Vivid Red Dotted Stream (Flowing into Center Screen) */}
          <g mask={`url(#mask-${item.id})`}>
            <motion.path
              d={item.d}
              stroke="url(#red-dotted-glow)"
              strokeWidth="2.75"
              strokeDasharray="5 6"
              strokeLinecap="round"
              fill="none"
              filter="url(#red-glow)"
              animate={{
                strokeDashoffset: [0, -22],
              }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </g>
        </g>
      ))}
    </svg>
  );
}

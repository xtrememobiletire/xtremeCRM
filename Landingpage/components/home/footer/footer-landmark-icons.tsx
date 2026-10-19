"use client";

interface IconProps {
  className?: string;
}

/**
 * High-precision Black & White Line-Art Landmark Icons
 * Styled in the exact architectural line-art aesthetic of the London Eye and Minar-e-Pakistan.
 */

export function StatueOfLibertyIcon({ className = "w-12 h-12" }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Torch & Arm */}
      <path d="M46 6l2 4-4 2 2-6z" fill="currentColor" fillOpacity="0.2" />
      <path d="M46 12v6" />
      <path d="M43 18h6l-2 10h-2l-2-10z" />
      <path d="M44 28l-4 8" />

      {/* Radiant 7-Ray Crown */}
      <path d="M28 20l-4-4" />
      <path d="M30 18l-2-5" />
      <path d="M33 17l0-5" />
      <path d="M36 17l2-5" />
      <path d="M38 18l4-4" />
      <path d="M26 23l-5-1" />
      <path d="M40 23l5-1" />

      {/* Head & Crown Diadem */}
      <path d="M27 22c0-2 10-2 12 0" />
      <path d="M29 23v5c0 3 2 5 4 5s4-2 4-5v-5" />
      <path d="M31 26h1m2 0h1" />
      <path d="M33 28v1.5" />
      <path d="M32 31h2" />

      {/* Tablet of Law (Left Arm) */}
      <rect x="20" y="34" width="7" height="11" rx="0.5" />
      <path d="M22 37h3m-3 2h3m-3 2h3" />

      {/* Body & Draped Classical Robes */}
      <path d="M33 33c-3 3-5 8-6 15l-3 10h22l-3-10c-1-7-3-12-6-15" />
      <path d="M29 38c2 4 4 10 4 20" />
      <path d="M35 38c-1 5-2 12-2 20" />
      <path d="M38 42c1 4 2 10 2 16" />

      {/* Monument Base / Pedestal */}
      <path d="M18 58h28" strokeWidth="2" />
      <path d="M21 61h22" strokeWidth="1.5" />
    </svg>
  );
}

export function CanadaLandmarkIcon({ className = "w-12 h-12" }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* CN Tower Spire & Antenna */}
      <path d="M32 4v10" strokeWidth="1.5" />
      <circle cx="32" cy="7" r="1.5" fill="currentColor" fillOpacity="0.3" />

      {/* SkyPod / Observation Deck */}
      <path d="M29 14h6l2 4h-10l2-4z" fill="currentColor" fillOpacity="0.15" />
      <path d="M27 18h10l-1.5 3h-7L27 18z" />

      {/* Main Mast Shaft */}
      <path d="M30 21v14" />
      <path d="M34 21v14" />
      <path d="M32 21v14" strokeDasharray="1.5 1.5" />

      {/* Architectural Maple Leaf Emblem integrated in Tower Base */}
      <path
        d="M32 36l2 3 4-2-1 4 5 1-3 3 2 4-5-1-1 3-3-2-3 2-1-3-5 1 2-4-3-3 5-1-1-4 4 2 2-3z"
        fill="currentColor"
        fillOpacity="0.12"
      />

      {/* Tower Legs & Foundation */}
      <path d="M28 35l-7 23" strokeWidth="1.5" />
      <path d="M36 35l7 23" strokeWidth="1.5" />
      <path d="M32 40v18" strokeWidth="1.2" />

      {/* Horizontal Structural Struts */}
      <path d="M26 44h12" />
      <path d="M24 51h16" />

      {/* Base Line */}
      <path d="M17 58h30" strokeWidth="2" />
      <path d="M20 61h24" strokeWidth="1.5" />
    </svg>
  );
}

"use client";

interface IconProps {
  className?: string;
}

/**
 * High-precision Black & White Line-Art Landmark & Flag Icons
 * Styled in architectural line-art aesthetic.
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

/**
 * Official Canadian Flag 11-Point Maple Leaf Icon
 * Rendered in clean line-art with architectural leaf veins.
 * Inherits currentColor (gray text-zinc-400 normally, darkens/brightens on hover).
 */
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
      {/* 11-Point Canadian Flag Maple Leaf Silhouette */}
      <path
        d="M32 6 L33.8 17.5 L39.5 14.8 L37.2 22.8 L49.5 20.8 L45.5 28.5 L53.8 32.2 L44.2 37.8 L45.8 42.5 L35.5 41.2 L33.5 46.2 L33.5 58 L30.5 58 L30.5 46.2 L28.5 41.2 L18.2 42.5 L19.8 37.8 L10.2 32.2 L18.5 28.5 L14.5 20.8 L26.8 22.8 L24.5 14.8 L30.2 17.5 Z"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Central leaf vein extending from stem into upper lobe */}
      <path d="M32 46.2V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />

      {/* Major diagonal veins branching to left and right main lobes */}
      <path d="M32 37L45 25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M32 37L19 25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />

      {/* Secondary veins branching into upper side lobe points */}
      <path d="M32 28L38 18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M32 28L26 18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />

      {/* Lateral veins branching into middle points */}
      <path d="M38 31L48 33" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M26 31L16 33" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />

      {/* Lower veins branching into base lobe points */}
      <path d="M32 41L41 41" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M32 41L23 41" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />

      {/* Stem base line */}
      <path d="M27 58h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// Alias export so either name can be imported seamlessly
export const CanadaMapleLeafIcon = CanadaLandmarkIcon;

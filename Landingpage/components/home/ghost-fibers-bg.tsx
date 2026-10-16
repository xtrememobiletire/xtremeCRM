"use client";

import dynamic from "next/dynamic";

const GhostFibers = dynamic(() => import("@/components/GhostFibers"), {
  ssr: false,
});

export default function GhostFibersBackground() {
  return (
    <div
      className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0"
      aria-hidden="true"
    >
      <GhostFibers
        className="w-full h-full"
        glowColor="#d70808"
        lineColor="#7c3aed"
        secondaryColor="#d70808"
        gradient="depth"
        layers={3}
        waves={1}
        twist={0.7}
        volume={0.7}
        spread={1.95}
        scale={0.85}
        rotation={-19}
        perspective={0.65}
        fiberStyle="dots"
        threads={56}
        density={1}
        thickness={1}
        tips={0.25}
        foldGlow={1.45}
        speed={0.5}
        flow={0.4}
        rollSpeed={0.15}
        depthOfField={0.85}
        focusDepth={0}
        particles={0.5}
        sparkle={0.4}
        glow={1.05}
        brightness={1.3}
        vignette={0.3}
        grain={0.06}
        hoverEffect="focus"
        mouseStrength={0.65}
        mouseInteraction={true}
        pulseOnClick={false}
        intro={true}
        lightMode={false}
      />
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// Pool of 6 high-resolution commercial fleet pictures
const FLEET_IMAGES: string[] = [
  "/fleet-semi.jpg",
  "/service-mobile-van.jpg",
  "/fleet-electric.jpg",
  "/fleet-vans.jpg",
  "/fleet-manager.jpg",
  "/fleet-trucks.jpg",
];

interface CardConfig {
  id: string;
  initialIndex: number;
  rotation: string;
  marginClass: string;
  originClass: string;
  zIndex: string;
  isMiddle: boolean;
}

const CARDS_CONFIG: CardConfig[] = [
  {
    id: "card-left",
    initialIndex: 0,
    rotation: "-rotate-3 sm:-rotate-5 md:-rotate-[6deg]",
    marginClass: "-mr-6 sm:-mr-10 md:-mr-14 lg:-mr-16",
    originClass: "origin-bottom-right",
    zIndex: "z-10",
    isMiddle: false,
  },
  {
    id: "card-middle",
    initialIndex: 1,
    rotation: "rotate-0",
    marginClass: "z-20",
    originClass: "origin-center",
    zIndex: "z-20",
    isMiddle: true,
  },
  {
    id: "card-right",
    initialIndex: 2,
    rotation: "rotate-3 sm:rotate-5 md:rotate-[6deg]",
    marginClass: "-ml-6 sm:-ml-10 md:-ml-14 lg:-ml-16",
    originClass: "origin-bottom-left",
    zIndex: "z-10",
    isMiddle: false,
  },
];

function FleetPhotoCard({ config, currentImage }: { config: CardConfig; currentImage: string }) {
  return (
    <div
      className={`relative ${config.zIndex} ${config.marginClass} ${config.rotation} ${config.originClass}
        ${
          config.isMiddle
            ? "w-[290px] sm:w-[350px] md:w-[400px] lg:w-[450px] h-[450px] sm:h-[510px] md:h-[550px] lg:h-[590px]"
            : "w-[270px] sm:w-[330px] md:w-[370px] lg:w-[410px] h-[430px] sm:h-[490px] md:h-[530px] lg:h-[560px]"
        }
        rounded-none bg-zinc-950 border border-black/20 dark:border-white/15 
        transition-all duration-500 ease-out 
        shadow-2xl hover:rotate-0 hover:z-30 hover:scale-[1.02] shrink-0 overflow-hidden select-none cursor-pointer`}
    >
      {/* 
        CLEAN PICTURE ONLY (NO CAROUSEL CONTROLS, NO TEXT, NO LABELS)
        Smooth crossfade transition across 6 commercial fleet images
      */}
      <div className="absolute inset-0 w-full h-full bg-zinc-950">
        <AnimatePresence mode="popLayout">
          <motion.img
            key={`${config.id}-${currentImage}`}
            src={currentImage}
            alt="Commercial Fleet Vehicle"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.85, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
          />
        </AnimatePresence>
      </div>

      {/* Subtle Blueprint Crosshair Marks (+) at the 4 corners */}
      <span className="absolute top-3 left-3 font-mono text-xs text-white/50 select-none pointer-events-none z-20">+</span>
      <span className="absolute top-3 right-3 font-mono text-xs text-white/50 select-none pointer-events-none z-20">+</span>
      <span className="absolute bottom-3 left-3 font-mono text-xs text-white/50 select-none pointer-events-none z-20">+</span>
      <span className="absolute bottom-3 right-3 font-mono text-xs text-white/50 select-none pointer-events-none z-20">+</span>
    </div>
  );
}

export default function FleetHero() {
  const [photoStep, setPhotoStep] = useState(0);

  // Staggered auto-rotation cycling through the 6 fleet pictures
  useEffect(() => {
    const timer = setInterval(() => {
      setPhotoStep((prev) => (prev + 1) % FLEET_IMAGES.length);
    }, 4500);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative z-10 w-full bg-transparent text-zinc-950 dark:text-white pt-6 sm:pt-10 lg:pt-12 overflow-hidden">
      
      {/* ========================================================================
          FLEET HERO HEADER & CALL TO ACTION (Matching Wireframe)
          - Line 1 (Serif): "Free Your Operations From Roadside Stress."
          - Line 2 (Bold Sans): "Manage Your Entire Fleet From One Live Portal."
          - Buttons: "Register Fleet" and "SignIn to Fleet"
          ======================================================================== */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6 sm:space-y-7">
        
        {/* Main Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-[64px] font-normal tracking-tight text-zinc-950 dark:text-white leading-[1.12] select-none">
          <span
            className="block italic font-serif"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
            Free Your Operations From Roadside Stress.
          </span>
          <span className="block font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-2 sm:mt-3">
            Manage Your Entire Fleet From One Live Portal.
          </span>
        </h1>

        {/* Action Buttons matching Wireframe */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-4 sm:gap-5">
          <Link
            href="#create-fleet-account"
            className="inline-flex items-center justify-center px-8 sm:px-10 py-3 sm:py-3.5 rounded-none border border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-black hover:bg-[#DC2626] dark:hover:bg-[#DC2626] dark:hover:text-white dark:hover:border-[#DC2626] hover:border-[#DC2626] font-medium text-sm sm:text-base tracking-tight transition-all duration-300 shadow-sm active:scale-98 cursor-pointer"
          >
            Register Fleet
          </Link>
          <Link
            href="/signin"
            className="inline-flex items-center justify-center px-8 sm:px-10 py-3 sm:py-3.5 rounded-none border border-zinc-900/80 dark:border-white/80 bg-transparent text-zinc-950 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 font-medium text-sm sm:text-base tracking-tight transition-all duration-300 shadow-sm active:scale-98 cursor-pointer"
          >
            SignIn to Fleet
          </Link>
        </div>

      </div>


      {/* ========================================================================
          THREE FANNED CARDS (CLEAN COMMERCIAL FLEET PICTURES ONLY)
          - Reduced height for clean proportion (matches services hero)
          - Initial landing shows top ~half height of the cards
          - Scrolling reveals the full height of the cards
          - Rotates through 6 authentic commercial fleet pictures
          - Zero "Card 1, 2, 3" labels (pure clean photography)
          ======================================================================== */}
      <div className="relative w-full flex items-start justify-center mt-10 sm:mt-14 pb-24 sm:pb-36 lg:pb-44 px-2 sm:px-4 overflow-visible">
        <div className="relative flex items-start justify-center w-full max-w-[1440px] select-none">
          {CARDS_CONFIG.map((config) => {
            const currentImg = FLEET_IMAGES[(config.initialIndex + photoStep) % FLEET_IMAGES.length];
            return (
              <FleetPhotoCard
                key={config.id}
                config={config}
                currentImage={currentImg}
              />
            );
          })}
        </div>
      </div>

    </section>
  );
}

"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import gsap from "gsap";

interface BrandItem {
  id: string;
  name: string;
  logo: string;
}

const ROW_1: BrandItem[] = [
  { id: "audi", name: "Audi", logo: "/brands/audi.png" },
  { id: "bmw", name: "BMW", logo: "/brands/bmw.png" },
  { id: "mercedes", name: "Mercedes", logo: "/brands/mercedes.png" },
  { id: "volkswagen", name: "Volkswagen", logo: "/brands/volkswagen.png" },
  { id: "porsche", name: "Porsche", logo: "/brands/porsche.png" },
  { id: "mini", name: "Mini", logo: "/brands/mini.png" },
  { id: "volvo", name: "Volvo", logo: "/brands/volvo.png" },
];

const ROW_2: BrandItem[] = [
  { id: "alfa-romeo", name: "Alfa Romeo", logo: "/brands/alfa-romeo.png" },
  { id: "toyota", name: "Toyota", logo: "/brands/toyota.png" },
  { id: "lexus", name: "Lexus", logo: "/brands/lexus.png" },
  { id: "nissan", name: "Nissan", logo: "/brands/nissan.png" },
  { id: "mazda", name: "Mazda", logo: "/brands/mazda.png" },
  { id: "subaru", name: "Subaru", logo: "/brands/subaru.png" },
  { id: "honda", name: "Honda", logo: "/brands/honda.png" },
];

const ROW_3: BrandItem[] = [
  { id: "mitsubishi", name: "Mitsubishi", logo: "/brands/mitsubishi.png" },
  { id: "suzuki", name: "Suzuki", logo: "/brands/suzuki.png" },
  { id: "infiniti", name: "Infiniti", logo: "/brands/infiniti.png" },
  { id: "hyundai", name: "Hyundai", logo: "/brands/hyundai.png" },
  { id: "kia", name: "Kia", logo: "/brands/kia.png" },
  { id: "ford", name: "Ford", logo: "/brands/ford.png" },
  { id: "holden", name: "Holden", logo: "/brands/holden.png" },
];

function MarqueeRow({
  items,
  direction = "left",
  duration = 24,
}: {
  items: BrandItem[];
  direction?: "left" | "right";
  duration?: number;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  // Duplicate array 4 times for seamless non-breaking loop
  const duplicated = [...items, ...items, ...items, ...items];

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      if (direction === "left") {
        gsap.fromTo(
          el,
          { xPercent: 0 },
          {
            xPercent: -50,
            duration,
            ease: "none",
            repeat: -1,
          }
        );
      } else {
        gsap.fromTo(
          el,
          { xPercent: -50 },
          {
            xPercent: 0,
            duration,
            ease: "none",
            repeat: -1,
          }
        );
      }
    });

    return () => ctx.revert();
  }, [direction, duration]);

  return (
    <div className="relative w-full overflow-hidden py-2 sm:py-2.5">
      <div
        ref={rowRef}
        className="flex gap-4 sm:gap-6 w-max"
        style={{ willChange: "transform" }}
      >
        {duplicated.map((brand, idx) => (
          <div
            key={`${brand.id}-${idx}`}
            className="w-44 sm:w-52 lg:w-56 h-20 sm:h-22 lg:h-24 bg-[#0a0a0d] border border-white/10 hover:border-[var(--brand-primary)]/70 transition-colors duration-300 flex items-center justify-center px-6 py-3 select-none shrink-0 group rounded-none shadow-md"
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <Image
                src={brand.logo}
                alt={brand.name}
                width={200}
                height={100}
                className="max-h-12 sm:max-h-14 lg:max-h-16 w-auto max-w-[130px] sm:max-w-[155px] object-contain transition-transform duration-300 group-hover:scale-108 filter drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]"
                unoptimized
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


export default function AboutBrandsMarquee() {
  return (
    <section className="relative z-10 w-full bg-transparent text-zinc-950 dark:text-white py-12 sm:py-16 lg:py-20 border-t border-black/5 dark:border-white/5 overflow-hidden">
      {/* 
        ========================================================================
        HEADER SECTION (Matching Wireframe media_1792312468433_88856298.png)
        - Left: ■ Our Network + "Brands We work with"
        - Right: Two-tone mission text "At XtremeMobileTire, Expert mobile..."
        ========================================================================
      */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-8 sm:mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-black/10 dark:border-white/10">
          
          {/* Left: Tag + Headline */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[var(--brand-primary)]/85 inline-block shrink-0 rounded-none shadow-sm" />
              <span className="text-xs font-mono font-bold tracking-widest uppercase text-zinc-600 dark:text-zinc-400">
                Our Network
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[38px] font-bold tracking-tight uppercase text-zinc-950 dark:text-white font-sans select-none">
              Brands We Work With
            </h2>
          </div>

          {/* Right: Two-Tone Mission Text */}
          <div className="md:max-w-md lg:max-w-lg">
            <p className="text-sm sm:text-base md:text-lg leading-snug tracking-tight font-medium">
              <span className="text-zinc-950 dark:text-white font-extrabold">
                At XtremeMobileTire,{" "}
              </span>
              <span className="text-zinc-600 dark:text-zinc-400 font-normal">
                Expert mobile tire and wheel care for every major vehicle brand
              </span>
            </p>
          </div>

        </div>
      </div>


      {/* 
        ========================================================================
        3-ROW CONTINUOUS INFINITE MARQUEE BARS
        - Row 1: Leftward Flying Motion (22s)
        - Row 2: Rightward Flying Motion (26s)
        - Row 3: Leftward Flying Motion (20s)
        - POWERED BY GSAP ENGINE: Guaranteed non-stop 60FPS hardware-accelerated motion
        - Smooth Edge Masks: Dissolves into black at screen borders
        ========================================================================
      */}
      <div className="relative w-full [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        {/* Row 1: Leftward Flying Motion (48s - Gentle, Calmer Glide) */}
        <MarqueeRow items={ROW_1} direction="left" duration={48} />

        {/* Row 2: Rightward Flying Motion (56s - Gentle, Calmer Glide) */}
        <MarqueeRow items={ROW_2} direction="right" duration={56} />

        {/* Row 3: Leftward Flying Motion (44s - Gentle, Calmer Glide) */}
        <MarqueeRow items={ROW_3} direction="left" duration={44} />
      </div>
    </section>
  );
}

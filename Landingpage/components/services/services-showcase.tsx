"use client";

import React from "react";
import { SERVICE_CATEGORIES } from "./services-data";
import ServicesCategoryBlock from "./services-category-block";

export default function ServicesShowcase() {
  return (
    <section className="w-full py-16 sm:py-24 lg:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Top Eyebrow & Header Section (directly matching wireframe) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12 sm:pb-16 border-b border-zinc-300 dark:border-zinc-800 mb-12 sm:mb-16">
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <span className="w-3 h-3 bg-black dark:bg-[#DC2626] inline-block shrink-0 rounded-none shadow-sm" />
            <span className="text-xs sm:text-sm font-bold tracking-widest uppercase text-zinc-800 dark:text-zinc-200 font-sans">
              Services Portfolio
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
            What We Offer
          </h1>
        </div>
        <p className="text-sm sm:text-base md:text-lg text-zinc-600 dark:text-zinc-400 max-w-md font-normal leading-relaxed">
          At XtremeMobileTire, our mission is simple: to do what&apos;s best for our customers and their vehicles.
        </p>
      </div>

      {/* 5 Category Showcase Blocks Connected Directly With Zero Gap (Wireframe Continuous Grid) */}
      <div className="relative flex flex-col">
        {SERVICE_CATEGORIES.map((category, index) => (
          <div key={category.id} className={index > 0 ? "-mt-px relative" : "relative"}>
            <ServicesCategoryBlock category={category} />
          </div>
        ))}
      </div>
    </section>
  );
}

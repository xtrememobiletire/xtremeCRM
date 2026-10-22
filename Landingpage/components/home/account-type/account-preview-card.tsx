"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AccountOption } from "./account-types";

interface AccountPreviewCardProps {
  activeOption: AccountOption | null;
}

export default function AccountPreviewCard({
  activeOption,
}: AccountPreviewCardProps) {
  if (!activeOption) {
    return (
      <div className="w-full h-full min-h-[420px] rounded-none border-2 border-dashed border-black/10 dark:border-white/10 flex flex-col items-center justify-center p-8 text-center bg-zinc-50/50 dark:bg-white/[0.01]">
        <div className="w-12 h-12 rounded-none bg-black/5 dark:bg-white/5 flex items-center justify-center text-zinc-400 mb-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
        </div>
        <p className="font-serif text-base text-zinc-500 dark:text-zinc-400">
          Select an account type to view live details and vehicle previews.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-none overflow-hidden border border-black/15 dark:border-white/15 bg-white dark:bg-[#070b14] shadow-2xl flex flex-col">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeOption.key}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full h-full flex flex-col flex-1"
        >
          {/* Top Compartment: High-Resolution Photo (Clean, unobstructed) */}
          <div className="relative w-full h-64 sm:h-72 lg:h-80 overflow-hidden bg-zinc-950 shrink-0">
            <img
              src={activeOption.imageSrc}
              alt={activeOption.imageAlt}
              className="w-full h-full object-cover object-center transition-transform duration-700 ease-out hover:scale-105"
            />
          </div>

          {/* Bottom Compartment: Bordered Text Box matching Wireframe (Simple modern font) */}
          <div className="flex-1 p-6 sm:p-8 lg:p-9 border-t border-black/15 dark:border-white/15 bg-zinc-50/90 dark:bg-white/[0.03] flex items-center justify-center text-center">
            <p className="font-sans text-sm sm:text-base lg:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed font-normal max-w-lg">
              {activeOption.summaryText}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

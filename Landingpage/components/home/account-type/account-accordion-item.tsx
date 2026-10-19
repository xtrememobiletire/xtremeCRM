"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AccountOption } from "./account-types";

interface AccountAccordionItemProps {
  option: AccountOption;
  isOpen: boolean;
  onToggle: () => void;
}

export default function AccountAccordionItem({
  option,
  isOpen,
  onToggle,
}: AccountAccordionItemProps) {
  return (
    <div className="border-t border-black/15 dark:border-white/15 py-5 sm:py-6 first:border-t-0">
      {/* Clickable Header Row */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between text-left group focus:outline-none cursor-pointer py-1"
      >
        <div className="flex items-center gap-3">
          <motion.span
            animate={{
              backgroundColor: isOpen ? "var(--brand-primary)" : "rgb(113 113 122)",
            }}
            transition={{ duration: 0.3 }}
            className="w-2 h-2 rounded-none"
          />
          <h3
            className={`text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight transition-colors duration-300 ${
              isOpen
                ? "text-[var(--neutral-dark)]"
                : "text-zinc-600 dark:text-zinc-400 group-hover:text-[var(--neutral-dark)]"
            }`}
          >
            {option.title}
          </h3>
        </div>

        {/* Sharp Square Arrow Indicator with Smooth Rotation & Color Shift */}
        <motion.div
          animate={{
            rotate: isOpen ? 90 : 0,
            backgroundColor: isOpen ? "var(--brand-primary)" : "transparent",
            borderColor: isOpen ? "var(--brand-primary)" : "rgba(128, 128, 128, 0.25)",
            color: isOpen ? "#ffffff" : "currentColor",
          }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-none border flex items-center justify-center shrink-0 cursor-pointer"
        >
          <svg
            className="w-4 h-4 stroke-[2.2]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </motion.div>
      </button>

      {/* Expandable Content Container with High-Performance Spring/Bezier Curves */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
              opacity: { duration: 0.3, ease: "easeInOut" },
            }}
            className="overflow-hidden"
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
              className="pt-5 sm:pt-6 pl-4 sm:pl-5"
            >
              
              {/* Optional Subtitle / Membership Benefits Description */}
              {option.subtitle && option.key === "personal" && (
                <div className="mb-4">
                  <span className="block text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)] mb-1">
                    Membership Benefits
                  </span>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-md font-normal">
                    {option.subtitle}
                  </p>
                </div>
              )}

              {/* Bullet Features with Left Accent Line matching Wireframe */}
              <div className="border-l-2 border-black/15 dark:border-white/15 pl-4 sm:pl-5 my-4 space-y-3">
                {option.features.map((feature, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 font-medium"
                  >
                    <span className="w-1.5 h-1.5 rounded-none bg-[var(--brand-primary)] mt-1.5 shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              {/* Action Button: Sharp rounded-none */}
              <div className="pt-4">
                <Link
                  href={option.ctaHref}
                  className="inline-flex items-center justify-center px-6 py-2.5 rounded-none text-xs sm:text-sm font-bold tracking-wider uppercase bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-[var(--brand-primary)] dark:hover:bg-[var(--brand-primary)] dark:hover:text-white transition-colors duration-200 shadow-sm"
                >
                  {option.ctaLabel}
                </Link>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

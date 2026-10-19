"use client";

import { useState } from "react";

interface AnnouncementBarProps {
  message?: string;
  badgeText?: string;
  actionText?: string;
  actionHref?: string;
  onDismiss?: () => void;
}

export default function AnnouncementBar({
  message = "24/7 Mobile Tire Service & Commercial Fleet Support — Instant roadside dispatch available",
  badgeText = "24/7 DISPATCH",
  actionText = "Emergency Booking",
  actionHref = "#booking",
  onDismiss,
}: AnnouncementBarProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  return (
    <div
      role="region"
      aria-label="Announcement"
      className="relative z-50 w-full bg-[#080c14] border-b border-white/[0.08] text-white px-4 py-2 transition-all duration-300 ease-in-out"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm">
        {/* Left / Center content */}
        <div className="flex items-center gap-2.5 mx-auto overflow-hidden">
          {/* Pulsing live badge with Crimson Red brand accent */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--brand-primary)]/15 border border-[var(--brand-primary)]/40 text-[var(--brand-primary)] text-[11px] font-semibold tracking-wider uppercase shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] animate-pulse" />
            <span className="text-white font-bold">{badgeText}</span>
          </span>

          {/* Announcement text */}
          <p className="text-zinc-300 font-normal truncate">
            {message}
          </p>

          {/* Action link */}
          {actionText && (
            <a
              href={actionHref}
              className="inline-flex items-center gap-1 font-semibold text-[var(--brand-primary)] hover:text-white transition-colors underline-offset-4 hover:underline shrink-0 ml-1"
            >
              <span>{actionText}</span>
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </a>
          )}
        </div>

        {/* Dismiss button */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss announcement"
          className="shrink-0 p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

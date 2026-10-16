"use client";

import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("theme");
      if (saved === "light") {
        setIsDark(false);
        document.documentElement.classList.remove("dark");
      } else if (saved === "dark") {
        setIsDark(true);
        document.documentElement.classList.add("dark");
      }
    } catch {}
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    try {
      sessionStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", next);
    }
  };

  return (
    <div className="absolute bottom-5 right-5 sm:bottom-6 sm:right-6 z-20">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle display theme"
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/80 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80 shadow-md backdrop-blur-md flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] transition-all cursor-pointer"
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
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      </button>
    </div>
  );
}

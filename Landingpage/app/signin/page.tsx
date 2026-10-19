"use client";

import { useEffect } from "react";
import PageShell from "@/components/layout/page-shell";
import { ArrowRight } from "lucide-react";

export default function SignInPage() {
  const loginUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/login`
    : "http://localhost:5173/login";

  useEffect(() => {
    window.location.replace(loginUrl);
  }, [loginUrl]);

  return (
    <PageShell>
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28 flex-1 flex flex-col justify-center items-center text-center">
        <div className="flex items-center gap-2.5 mb-3.5">
          <span className="w-3 h-3 bg-black dark:bg-[var(--brand-primary)] inline-block shrink-0 rounded-none shadow-sm" />
          <span className="text-xs sm:text-sm font-bold tracking-widest uppercase text-zinc-800 dark:text-zinc-200 font-sans">
            Fleet and Member Portal
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[var(--neutral-dark)] mb-4">
          Redirecting to Portal...
        </h1>
        <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed font-normal mb-8">
          Access your fleet dashboard, track active service requests, and view consolidated billing.
        </p>

        <a
          href={loginUrl}
          className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-none bg-zinc-950 text-white dark:bg-white dark:text-black hover:bg-[#DC2626] dark:hover:bg-[#DC2626] dark:hover:text-white font-medium text-sm sm:text-base tracking-tight transition-all duration-200 shadow-sm cursor-pointer"
        >
          <span>Continue to Portal Login</span>
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </PageShell>
  );
}

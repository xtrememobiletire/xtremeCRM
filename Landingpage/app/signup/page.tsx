"use client";

import PageShell from "@/components/layout/page-shell";

export default function SignUpPage() {
  return (
    <PageShell>
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28 flex-1 flex flex-col justify-center items-center text-center">
        <div className="flex items-center gap-2.5 mb-3.5">
          <span className="w-3 h-3 bg-black dark:bg-[var(--brand-primary)] inline-block shrink-0 rounded-none shadow-sm" />
          <span className="text-xs sm:text-sm font-bold tracking-widest uppercase text-zinc-800 dark:text-zinc-200 font-sans">
            Get Started
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[var(--neutral-dark)] mb-4">
          Create an Account
        </h1>
        <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed font-normal">
          Register your commercial fleet or personal vehicle for on-demand 24/7 mobile tire coverage.
        </p>
      </div>
    </PageShell>
  );
}

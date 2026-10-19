"use client";

import Link from "next/link";
import PageShell from "@/components/layout/page-shell";
import { ArrowRight, Clock, ArrowLeft, ShieldCheck, Wrench } from "lucide-react";
import { LOGIN_URL } from "@/lib/config";

export default function SignUpPage() {
  return (
    <PageShell>
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-28 flex-1 flex flex-col justify-center items-center text-center">
        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-none bg-red-600/10 border border-red-600/20 text-[#DC2626] text-xs font-mono uppercase tracking-wider mb-6">
          <Clock className="w-3.5 h-3.5" />
          <span>Portal Access</span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-zinc-950 dark:text-white mb-6 uppercase font-sans">
          Sign Up Coming Soon
        </h1>

        {/* Descriptive Copy */}
        <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed font-normal mb-10">
          Direct self-serve member registration is currently in private onboarding. If you already have a corporate fleet or dispatch account, sign in directly below. For immediate roadside tire service or commercial dispatch, book directly without an account.
        </p>

        {/* Features / Assurance Points */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl w-full mb-10 text-left">
          <div className="p-4 rounded-none border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.03]">
            <div className="flex items-center gap-2 text-zinc-950 dark:text-white font-semibold text-sm mb-1">
              <ShieldCheck className="w-4 h-4 text-[#DC2626]" />
              <span>Existing Fleet Accounts</span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Access your active dashboard, vehicle list, and invoice ledger through your fleet portal.
            </p>
          </div>

          <div className="p-4 rounded-none border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.03]">
            <div className="flex items-center gap-2 text-zinc-950 dark:text-white font-semibold text-sm mb-1">
              <Wrench className="w-4 h-4 text-[#DC2626]" />
              <span>Need Tire Service Now?</span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Emergency roadside assistance and scheduled fleet tire replacement are operational 24/7.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
          <a
            href={LOGIN_URL}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-none bg-zinc-950 text-white dark:bg-white dark:text-black hover:bg-[#DC2626] dark:hover:bg-[#DC2626] dark:hover:text-white font-medium text-sm sm:text-base tracking-tight transition-all duration-200 shadow-sm cursor-pointer"
          >
            <span>Sign In to Portal</span>
            <ArrowRight className="w-4 h-4" />
          </a>

          <Link
            href="/booking"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-none border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium text-sm sm:text-base tracking-tight transition-all duration-200 cursor-pointer"
          >
            <span>Book Service Now</span>
          </Link>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-none text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white text-sm font-medium transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </PageShell>
  );
}

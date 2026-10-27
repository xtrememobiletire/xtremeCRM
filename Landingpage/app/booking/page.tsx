"use client";

import React, { Suspense, useState } from "react";
import PageShell from "@/components/layout/page-shell";
import BookingModal from "@/components/booking/booking-modal";
import SpecularButton from "@/components/home/specular-button";
import { Wrench, ShieldCheck, Clock } from "lucide-react";

function BookingContent() {
  const [isModalOpen, setIsModalOpen] = useState(true);

  return (
    <PageShell>
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 flex-1 flex flex-col justify-center items-center text-center">
        <div className="flex items-center gap-2.5 mb-3.5">
          <span className="w-3 h-3 bg-[#DC2626] inline-block shrink-0 rounded-none shadow-sm" />
          <span className="text-xs sm:text-sm font-bold tracking-widest uppercase text-zinc-800 dark:text-zinc-200 font-sans">
            Online Booking &amp; 24/7 Dispatch
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-950 dark:text-white mb-4">
          Book Your Mobile Tire Service
        </h1>
        <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed font-normal mb-8">
          Schedule scheduled tire installation at your location or request immediate 24/7 roadside emergency dispatch.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <SpecularButton
            label="Open 24/7 Booking Calendar"
            onClick={() => setIsModalOpen(true)}
            variant="crimson"
            className="w-64 sm:w-72"
          />
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-14 w-full max-w-3xl text-left">
          <div className="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 rounded-none">
            <Clock className="w-5 h-5 text-[#DC2626] mb-2" />
            <h4 className="font-bold text-sm text-zinc-900 dark:text-white">24/7 Availability</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Book anytime day or night. Emergency mobile units dispatched immediately.
            </p>
          </div>
          <div className="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 rounded-none">
            <Wrench className="w-5 h-5 text-[#DC2626] mb-2" />
            <h4 className="font-bold text-sm text-zinc-900 dark:text-white">On-Site Service</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              We arrive at your driveway, office parking, or highway shoulder fully equipped.
            </p>
          </div>
          <div className="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 rounded-none">
            <ShieldCheck className="w-5 h-5 text-[#DC2626] mb-2" />
            <h4 className="font-bold text-sm text-zinc-900 dark:text-white">Live Tracking</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Your request lands directly in dispatch triage with live technician coordination.
            </p>
          </div>
        </div>

        {/* Booking Dialog */}
        <BookingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialServiceTitle="Flat Tire Repair"
        />
      </div>
    </PageShell>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <BookingContent />
    </Suspense>
  );
}

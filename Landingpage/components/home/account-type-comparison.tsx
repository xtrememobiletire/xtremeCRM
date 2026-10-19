"use client";

import { useState } from "react";
import {
  AccountKey,
  ACCOUNT_OPTIONS,
} from "./account-type/account-types";
import AccountAccordionItem from "./account-type/account-accordion-item";
import AccountPreviewCard from "./account-type/account-preview-card";

export default function AccountTypeComparison() {
  // Single active state: initially "fleet" as drawn in the wireframe,
  // or toggles between "fleet", "personal", and null.
  const [activeAccount, setActiveAccount] = useState<AccountKey | null>("fleet");

  const handleToggle = (key: AccountKey) => {
    setActiveAccount((prev) => (prev === key ? null : key));
  };

  const activeOption = activeAccount ? ACCOUNT_OPTIONS[activeAccount] : null;

  return (
    <section className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      {/* 
        Section Header matching Wireframe:
        - "CHOOSE YOUR" in bold editorial serif
        - "ACCOUNT TYPE" in clean modern sans-serif
        - Subheading in balanced neutral tone
      */}
      <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
        <h2 className="text-2xl sm:text-3xl md:text-4xl tracking-tight text-[var(--neutral-dark)] mb-3">
          <span className="font-sans font-extrabold text-[var(--neutral-dark)]">
            Choose your{" "}
          </span>
          <span className="font-serif italic font-normal text-[var(--neutral-dark)]">
            account type
          </span>
        </h2>
        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 font-normal">
          Professional mobile tire services available around the clock.
        </p>
      </div>

      {/* Main Two-Column Interactive Layout matching Wireframe */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        
        {/* ======================================================== */}
        {/* LEFT COLUMN: Accordion Options (Fleet & Personal)        */}
        {/* ======================================================== */}
        <div className="lg:col-span-6 flex flex-col justify-start">
          <div className="border-b border-black/15 dark:border-white/15">
            {/* 1. Fleet Manager Account Accordion Item */}
            <AccountAccordionItem
              option={ACCOUNT_OPTIONS.fleet}
              isOpen={activeAccount === "fleet"}
              onToggle={() => handleToggle("fleet")}
            />

            {/* 2. Personal Membership Accordion Item */}
            <AccountAccordionItem
              option={ACCOUNT_OPTIONS.personal}
              isOpen={activeAccount === "personal"}
              onToggle={() => handleToggle("personal")}
            />
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: Picture & Bottom Summary Box               */}
        {/* ======================================================== */}
        <div className="lg:col-span-6 flex flex-col h-full min-h-[420px] sm:min-h-[460px]">
          <AccountPreviewCard activeOption={activeOption} />
        </div>

      </div>
    </section>
  );
}

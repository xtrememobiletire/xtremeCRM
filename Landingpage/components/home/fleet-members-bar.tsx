"use client";

interface FleetMember {
  id: string;
  name: string;
  icon: React.ReactNode;
}

const DUMMY_MEMBERS: FleetMember[] = [
  {
    id: "springfree",
    name: "SpringFree",
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: "zoefull",
    name: "zoefull",
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
      </svg>
    ),
  },
  {
    id: "nutradora",
    name: "nutradora",
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    id: "mahaekart",
    name: "Mahaekart",
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    id: "transit-apex",
    name: "TransitApex",
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    id: "clla-freight",
    name: "CllA Logistics",
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: "ppc-legend",
    name: "The Fleet Legend",
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    id: "jack2-media",
    name: "Jack2 Cargo",
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
];

export default function FleetMembersBar() {
  return (
    <section className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 my-6 sm:my-10">
      {/* 
        Substantially Enlarged Flowing Bar:
        - Taller padding (py-6 sm:py-7) for an authoritative enterprise look.
        - Pinned left label "Fleet Members" with prominent red status pulse.
        - High-visibility logos with larger typography and icons.
        - Smooth continuous infinite auto-scrolling with pause on hover.
      */}
      <div className="relative w-full border-y border-black/15 dark:border-white/15 py-5 sm:py-7 flex items-center overflow-hidden">
        
        {/* Left Pinned Label matching Reference Image 1 */}
        <div className="flex items-center gap-3 shrink-0 pr-5 sm:pr-8 mr-4 sm:mr-7 border-r-2 border-black/10 dark:border-white/10 z-10 bg-[var(--neutral-light)] dark:bg-[#0c1222]">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--brand-primary)] opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--brand-primary)]" />
          </span>
          <span className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-[var(--neutral-dark)] dark:text-zinc-100 whitespace-nowrap">
            Fleet Members
          </span>
        </div>

        {/* Continuous Flowing Marquee Track with edge fade masks */}
        <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_32px,white_calc(100%-32px),transparent)]">
          <div className="animate-marquee gap-10 sm:gap-14">
            {/* Render items twice to ensure unbroken, infinite marquee cycle */}
            {[...DUMMY_MEMBERS, ...DUMMY_MEMBERS].map((member, index) => (
              <div
                key={`${member.id}-${index}`}
                className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400 hover:text-[var(--neutral-dark)] dark:hover:text-white transition-all duration-200 cursor-pointer select-none group/item shrink-0"
              >
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-none bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 flex items-center justify-center text-zinc-500 dark:text-zinc-400 group-hover/item:text-[var(--brand-primary)] group-hover/item:scale-110 group-hover/item:border-[var(--brand-primary)]/40 transition-all shadow-sm">
                  {member.icon}
                </div>
                <span className="text-sm sm:text-base md:text-lg font-bold tracking-tight font-sans">
                  {member.name}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}

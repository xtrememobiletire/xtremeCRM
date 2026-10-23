"use client";

interface FooterLargeBrandingProps {
  brandText?: string;
}

export default function FooterLargeBranding({
  brandText = "XtremeMobileTire",
}: FooterLargeBrandingProps) {
  return (
    <div className="relative w-full overflow-hidden select-none pt-4 sm:pt-10 pb-0 flex items-end justify-center pointer-events-none px-1 sm:px-2">
      {/* 
        EDGE-TO-EDGE FULL-WIDTH TWO-TONE BRANDING TEXT:
        - Mobile: Shows ONLY "Xtreme" scaled dynamically
        - Desktop / Tablet (sm+): Shows full "XtremeMobileTire" edge-to-edge
        - Precision two-tone lighting: Pure crisp white (#FFFFFF) top, smoothly fading into steel silver
          and blending into the deep black footer background.
      */}
      {/* Mobile-only wordmark: ONLY "Xtreme" */}
      <span
        className="sm:hidden w-full text-center font-black tracking-[-0.04em] leading-none whitespace-nowrap block select-none translate-y-[10%]"
        style={{
          fontSize: "clamp(3.8rem, 21vw, 6.5rem)",
          backgroundImage:
            "linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 34%, #8E95A5 60%, #000000 95%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Xtreme
      </span>

      {/* Desktop & Tablet wordmark: Full "XtremeMobileTire" */}
      <span
        className="hidden sm:block w-full text-center font-black tracking-[-0.045em] leading-none whitespace-nowrap select-none translate-y-[16%]"
        style={{
          fontSize: "clamp(2.2rem, 11.4vw, 11rem)",
          backgroundImage:
            "linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 32%, #8E95A5 58%, #000000 95%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        {brandText}
      </span>
    </div>
  );
}

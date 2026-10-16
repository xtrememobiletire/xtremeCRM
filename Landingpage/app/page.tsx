import Header from "@/components/home/header";
import HeroSection from "@/components/home/hero-section";
import ThemeToggle from "@/components/home/theme-toggle";
import GhostFibersBackground from "@/components/home/ghost-fibers-bg";

export default function HomePage() {
  return (
    /* 
      Outer Frame Viewport:
      - bg-[#050811] matches the navbar background with 100% exact hex equality.
      - relative and overflow-hidden guarantees the GhostFibers WebGL canvas stays strictly contained.
      - px-2 pb-2 pt-0 ensures the navbar is flush at top: 0 on mobile while keeping a subtle frame revealing fiber glow.
    */
    <div className="relative min-h-screen bg-[#050811] p-0 sm:px-4 sm:pb-4 md:px-5 md:pb-5 lg:px-6 lg:pb-6 flex flex-col justify-start transition-colors selection:bg-[var(--brand-primary)] selection:text-white overflow-hidden">
      
      {/* 
        INNER CANVAS CONTAINER (THE MASK):
        - Full edge-to-edge on mobile (rounded-none, mt-0)
        - Elevated card with margins on tablet/desktop (sm:rounded-[36px] lg:rounded-[44px], sm:mt-3.5 lg:mt-4)
        - Light neutral background from globals.css
        - The black navbar notch cuts down from the top edge like an integrated mask.
      */}
      <div className="relative z-10 w-full min-h-screen sm:min-h-[calc(100vh-2.5rem)] mt-0 sm:mt-3.5 lg:mt-4 bg-[var(--neutral-light)] text-[var(--neutral-dark)] sm:dark:border sm:dark:border-white/10 rounded-none sm:rounded-[36px] lg:rounded-[44px] overflow-hidden shadow-2xl dark:shadow-none sm:dark:shadow-[0_0_50px_-5px_rgba(255,255,255,0.07)] flex flex-col">
        
        {/* 
          GHOST FIBERS BACKGROUND:
          Placed directly inside the hero container and strictly contained by overflow-hidden.
        */}
        <GhostFibersBackground />
        
        {/* Soft Ambient Texture inside canvas */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          {/* Subtle warm Crimson glow fading from the top */}
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-gradient-to-b from-[var(--brand-light)]/70 via-transparent to-transparent blur-3xl rounded-full" />
          {/* Fine horizontal scanline/dot matrix pattern from Image 1 */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        </div>

        {/* HEADER: Modular Curved-Notch Navbar flush at top */}
        <Header />

        {/* HERO SECTION: Modular component from components/home/ */}
        <HeroSection />

        {/* THEME TOGGLE: Bottom right floating button */}
        <ThemeToggle />

      </div>

    </div>
  );
}

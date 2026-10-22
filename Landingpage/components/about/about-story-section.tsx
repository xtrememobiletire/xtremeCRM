"use client";

import Image from "next/image";

interface StoryBlock {
  id: string;
  title: string;
  text: string;
}

const STORY_BLOCKS: StoryBlock[] = [
  {
    id: "founded-by-friends",
    title: "Founded by Two Friends",
    text: "Xtreme Mobile Tire was started by my friend and me out of a shared passion for vehicles and keeping people moving. After repeatedly experiencing slow tow trucks, surprise fees, and hours of wasted downtime at local tire shops, we knew drivers and commercial fleets deserved better.",
  },
  {
    id: "our-solution",
    title: "Our Solution",
    text: "Instead of accepting poor service, we built the exact solution we wished existed: bringing an honest, fully equipped tire shop directly to your location, 24/7.",
  },
  {
    id: "growing-across-borders",
    title: "Growing Across the USA, Canada and Toward the UK",
    text: "What started as a vision between two friends has grown into a cross-border mobile tire network serving the USA and Canada—with plans to expand into the UK next. Built on upfront pricing and zero wasted time, we’ve combined certified technicians, commercial-grade mobile units, and a live fleet portal to deliver service you can actually trust.",
  },
  {
    id: "our-promise",
    title: "Our Promise",
    text: "We reinvest everything into expanding our mobile vans, supporting our technicians, and delivering faster response times for our clients. Whether you’re a daily commuter or managing a commercial fleet, welcome to tire care the way it should be.",
  },
];

export default function AboutStorySection() {
  return (
    <section className="relative z-10 w-full bg-transparent text-zinc-950 dark:text-white pt-20 sm:pt-28 lg:pt-36 pb-10 sm:pb-14 lg:pb-16 border-t border-black/5 dark:border-white/5">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* 
          ========================================================================
          TWO-COLUMN PINNED LAYOUT:
          - Left Column (Sticky / Fixed): "OUR STORY" + High-Res Founders Photo
          - Right Column (Scrolling): Only right text moves while background page stays fixed
          ========================================================================
        */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start relative">
          
          {/* 
            LEFT COLUMN: FIXED / STICKY IN PLACE
            - Pinned at top-28 while ONLY the right side text scrolls
            - Full shoulders, arms & faces visible with zero side-cropping
          */}
          <div className="lg:col-span-5 lg:sticky lg:top-28 self-start flex flex-col items-center lg:items-start z-20">
            
            {/* Header Title: "OUR STORY" (Clean, simple, non-italic) */}
            <div className="w-full text-center lg:text-left mb-4">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[38px] font-bold tracking-tight uppercase text-zinc-950 dark:text-white font-sans select-none">
                Our Story
              </h2>
            </div>

            {/* High-Resolution Founders Photo: Full shoulders, arms & faces visible with zero side-cropping */}
            <div className="relative w-full max-w-[380px] sm:max-w-[420px] aspect-[16/10] bg-black border border-black/10 dark:border-none shadow-md overflow-hidden [mask-image:linear-gradient(to_bottom,black_85%,transparent_100%)]">
              <Image
                src="https://res.cloudinary.com/ebjikx52/image/upload/v1792426867/xtreme/landing/founders-story_jpg.jpg"
                alt="Xtreme Mobile Tire Co-Founders"
                fill
                className="object-contain object-top filter grayscale contrast-110 brightness-100"
                priority
              />
            </div>

          </div>

          {/* 
            RIGHT COLUMN: SCROLLING STORY CONTENT
            - Only this text section moves while the background page and left photo stay pinned
          */}
          <div className="lg:col-span-7 flex flex-col space-y-7">
            
            {/* Header Tag & Intro */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[var(--brand-primary)]/85 inline-block shrink-0 rounded-none shadow-sm" />
                <span className="text-xs font-mono font-bold tracking-widest uppercase text-zinc-600 dark:text-zinc-400">
                  About Us
                </span>
              </div>

              {/* Lead Intro: Theme adaptive font colors */}
              <p className="text-base sm:text-lg md:text-xl leading-snug tracking-tight font-medium">
                <span className="text-zinc-600 dark:text-zinc-400">
                  No driver or fleet owner should ever feel stranded or overcharged during a roadside emergency. Like you, we were frustrated by the hidden fees, long waits, and dishonest upsells common in the traditional tire industry.{" "}
                </span>
                <span className="text-zinc-950 dark:text-white font-bold">
                  Here is how we are changing that:
                </span>
              </p>
            </div>

            {/* Narrative Story Blocks: Smaller, clean, compact font size */}
            <div className="space-y-4 pt-1">
              {STORY_BLOCKS.map((block) => (
                <div
                  key={block.id}
                  className="border-t border-black/10 dark:border-white/10 pt-4 space-y-1.5 group transition-all duration-300"
                >
                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-zinc-950 dark:text-white group-hover:text-[var(--brand-primary)] transition-colors">
                    {block.title}
                  </h3>
                  <p className="text-xs sm:text-[13.5px] text-zinc-600 dark:text-zinc-400 font-normal leading-relaxed">
                    {block.text}
                  </p>
                </div>
              ))}
            </div>


            {/* 
              ========================================================================
              COMPACT & SIMPLE INVITATION BOX AT THE END (RED THEME)
              - Scaled down proportionally to keep the section compact & elegant
              - Corner blueprint crosshairs (+)
              - Signature line ("Harry King")
              ========================================================================
            */}
            <div className="relative p-5 sm:p-6 lg:p-7 rounded-none bg-[var(--brand-primary)] text-white shadow-xl overflow-hidden mt-3">
              
              {/* Blueprint Crosshair Marks at corners */}
              <span className="absolute -top-0.5 -left-0.5 font-mono text-[10px] text-white/50 select-none">+</span>
              <span className="absolute -top-0.5 -right-0.5 font-mono text-[10px] text-white/50 select-none">+</span>
              <span className="absolute -bottom-0.5 -left-0.5 font-mono text-[10px] text-white/50 select-none">+</span>
              <span className="absolute -bottom-0.5 -right-0.5 font-mono text-[10px] text-white/50 select-none">+</span>

              {/* Subtle High-Tech Grid Texture Overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0f_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0f_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] pointer-events-none" />

              {/* Main Invitation Headline: Scaled down, simple & impactful */}
              <h4 className="relative z-10 text-lg sm:text-xl md:text-2xl font-bold tracking-tight leading-snug mb-4 max-w-lg">
                We invite you to join our community and experience car care how it should be.
              </h4>

              {/* Clean White Divider Line */}
              <div className="relative z-10 w-full h-px bg-white/25 my-4" />

              {/* Signature Block matching wireframe */}
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] text-white/80 uppercase tracking-wider font-mono mb-0.5">
                    From the founders,
                  </p>
                  <p className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
                    Harry King
                  </p>
                </div>

                <div className="text-[10px] font-mono text-white/70 uppercase tracking-widest">
                  Xtreme Mobile Tire Network
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>
    </section>
  );
}



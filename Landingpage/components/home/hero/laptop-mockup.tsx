"use client";

import { useRef, useEffect } from "react";

interface LaptopMockupProps {
  videoSrc?: string;
  className?: string;
}

export default function LaptopMockup({
  videoSrc = "https://res.cloudinary.com/ebjikx52/video/upload/q_auto,w_720/v1792934439/car_for_laptop.mp4",
  className = "",
}: LaptopMockupProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Guarantee continuous auto-playback without freezing or breaking
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Direct DOM property enforcement required by Chromium/Safari autoplay policies
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");

    const playVideo = () => {
      video.muted = true;
      const promise = video.play();
      if (promise !== undefined) {
        promise.catch(() => {
          // Fallback retry on user touch / click / scroll if device has strict initial autoplay lock
          const resume = () => {
            video.muted = true;
            video.play().catch(() => {});
            window.removeEventListener("touchstart", resume);
            window.removeEventListener("click", resume);
            window.removeEventListener("scroll", resume);
          };
          window.addEventListener("touchstart", resume, { once: true, passive: true });
          window.addEventListener("click", resume, { once: true, passive: true });
          window.addEventListener("scroll", resume, { once: true, passive: true });
        });
      }
    };

    playVideo();
  }, [videoSrc]);

  return (
    <div className={`relative mx-auto w-full max-w-[310px] sm:max-w-[330px] select-none ${className}`}>
      {/* 
        ========================================================================
        LAPTOP DISPLAY SCREEN (SHARP RECTANGULAR CHASSIS - 0px RADIUS)
        ========================================================================
      */}
      <div className="relative mx-auto w-full rounded-none border-[1.5px] border-zinc-700/90 bg-zinc-950 p-1 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.9)]">
        
        {/* Top Bezel Center Webcam Dot */}
        <div className="absolute top-0.5 left-1/2 -translate-x-1/2 flex items-center gap-1 z-20 pointer-events-none">
          <span className="w-1 h-1 rounded-full bg-zinc-800 border border-zinc-600/60 inline-block" />
          <span className="w-0.5 h-0.5 rounded-full bg-emerald-500/80 inline-block shadow-sm" />
        </div>

        {/* Screen Bezel Frame (16:10 Ratio, Sharp Corners) */}
        <div className="relative w-full aspect-[16/10] overflow-hidden rounded-none bg-black border border-white/10 shadow-inner flex items-center justify-center">
          
          {/* Active Looping Video Display: ONLY video, no poster or picture */}
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onEnded={(e) => {
              const el = e.currentTarget;
              el.currentTime = 0;
              el.play().catch(() => {});
            }}
            onPause={(e) => {
              const el = e.currentTarget;
              if (!el.seeking) {
                el.play().catch(() => {});
              }
            }}
            className="w-full h-full object-cover object-center"
          >
            <source src={videoSrc} type="video/mp4" />
            <source src="https://res.cloudinary.com/ebjikx52/video/upload/v1792934439/car_for_laptop.mp4" type="video/mp4" />
          </video>

          {/* Subtle Crisp Screen Rim for Realism */}
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />

        </div>

      </div>

      {/* 
        ========================================================================
        LAPTOP HINGE & LOWER KEYBOARD BASE (FLAT SHARP EDGES)
        ========================================================================
      */}
      {/* Straight Hinge Bar */}
      <div className="relative mx-auto h-1.5 w-[92%] bg-gradient-to-b from-zinc-900 to-zinc-800 border-x border-zinc-700/60 shadow-sm" />

      {/* Sharp Flat Chassis Base */}
      <div className="relative mx-auto h-2.5 w-[104%] -ml-[2%] rounded-none bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-950 border-t border-white/25 shadow-2xl flex items-start justify-center">
        {/* Flat Center Notch */}
        <div className="w-12 h-0.5 bg-zinc-950/90 rounded-none border-t border-zinc-900" />
      </div>

      {/* Ambient Table Shadow */}
      <div className="pointer-events-none mx-auto w-[110%] -ml-[5%] h-5 bg-black/60 blur-lg -mt-0.5" />
    </div>
  );
}

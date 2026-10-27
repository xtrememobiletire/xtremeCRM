"use client";

import { useRef, useEffect } from "react";

interface LaptopMockupProps {
  videoSrc?: string;
  className?: string;
}

export default function LaptopMockup({
  videoSrc = "https://res.cloudinary.com/ebjikx52/video/upload/v1792934439/car_for_laptop.mp4",
  className = "",
}: LaptopMockupProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Force all HTML5 attributes strictly required by browser autoplay policies
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;
    video.autoplay = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("loop", "");
    video.setAttribute("autoplay", "");

    const playVideo = () => {
      if (!video) return;
      video.muted = true;
      const promise = video.play();
      if (promise !== undefined) {
        promise.catch(() => {
          // Autoplay was blocked, will resume on user gesture
        });
      }
    };

    // Immediate playback attempt
    playVideo();

    // Trigger playback as soon as browser has ready data
    video.addEventListener("loadedmetadata", playVideo);
    video.addEventListener("canplay", playVideo);
    video.addEventListener("loadeddata", playVideo);

    // If playback ends or stalls, immediately restart
    const handleEnded = () => {
      video.currentTime = 0;
      playVideo();
    };
    const handlePause = () => {
      // Prevent unwanted pausing
      playVideo();
    };
    video.addEventListener("ended", handleEnded);
    video.addEventListener("pause", handlePause);

    // Global interaction fallbacks (touch, click, scroll) to guarantee video starts
    const triggerEvents = ["click", "touchstart", "pointerdown", "scroll", "keydown"];
    const onInteraction = () => {
      playVideo();
    };

    triggerEvents.forEach((ev) => {
      window.addEventListener(ev, onInteraction, { passive: true });
      document.addEventListener(ev, onInteraction, { passive: true });
    });

    return () => {
      video.removeEventListener("loadedmetadata", playVideo);
      video.removeEventListener("canplay", playVideo);
      video.removeEventListener("loadeddata", playVideo);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("pause", handlePause);
      triggerEvents.forEach((ev) => {
        window.removeEventListener(ev, onInteraction);
        document.removeEventListener(ev, onInteraction);
      });
    };
  }, [videoSrc]);

  const handleVideoError = () => {
    // If CDN fails, automatically fall back to local bundled mp4
    const video = videoRef.current;
    if (video && video.src !== window.location.origin + "/car_for_laptop.mp4") {
      video.src = "/car_for_laptop.mp4";
      video.load();
      video.muted = true;
      video.play().catch(() => {});
    }
  };

  return (
    <div
      className={`relative mx-auto w-full max-w-[310px] sm:max-w-[330px] select-none ${className}`}
      onClick={() => {
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {});
        }
      }}
    >
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
          
          {/* Active Looping Video Display: Fast progressive streaming */}
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onError={handleVideoError}
            className="w-full h-full object-cover object-center cursor-pointer"
          >
            <source src={videoSrc} type="video/mp4" />
            <source src="/car_for_laptop.mp4" type="video/mp4" />
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

import { Wrench, ShieldCheck, Clock, ArrowRight, PhoneCall, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LandingHero() {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden bg-slate-950 text-white pt-16 pb-20 sm:pt-24 sm:pb-28">
      {/* Background glowing gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-red-600/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[400px] h-[300px] bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-red-500/30 text-xs font-semibold text-red-400 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <Sparkles size={13} className="text-red-400" />
            <span>24/7 Roadside Tire Breakdown Units Active Now</span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            Emergency Mobile Tire Service. <br />
            <span className="bg-gradient-to-r from-red-500 via-red-400 to-amber-400 bg-clip-text text-transparent">
              Delivered To Your Exact Location.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Stranded on the highway or in your driveway? Our fully equipped mobile tire vans come directly to you.
            Flat repairs, new tire mounting, rim service, and balancing on the spot — zero towing required.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <a
              href="#emergency-booking"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30 transition transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Wrench size={16} />
              <span>Book Emergency Roadside Dispatch</span>
            </a>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-slate-200 bg-slate-900/90 border border-slate-700 hover:bg-slate-800 hover:text-white transition"
            >
              <span>Dispatcher & Staff Console</span>
              <ArrowRight size={15} />
            </button>
          </div>

          {/* Hotline Callout */}
          <div className="pt-2">
            <a
              href="tel:+18005558473"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              <PhoneCall size={14} className="text-red-500 animate-pulse" />
              <span>Immediate phone dispatch available: <strong className="text-slate-200">1-800-555-TIRE (24/7)</strong></span>
            </a>
          </div>
        </div>

        {/* Operational Statistics Grid */}
        <div className="mt-14 pt-8 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60">
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">&lt;45 min</div>
            <div className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1">
              <Clock size={12} className="text-red-500" />
              <span>Average Arrival</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60">
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">14,200+</div>
            <div className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1">
              <ShieldCheck size={12} className="text-emerald-500" />
              <span>Motorists Rescued</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60">
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">16 Services</div>
            <div className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1">
              <Wrench size={12} className="text-amber-500" />
              <span>Full Mobile Shop</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60">
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">3 Countries</div>
            <div className="text-xs text-slate-400 mt-1">Canada • USA • UK</div>
          </div>
        </div>
      </div>
    </div>
  );
}

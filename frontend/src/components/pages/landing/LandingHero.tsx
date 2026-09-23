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

        {/* Mobile Tire Repair Visual Showcase */}
        <div className="mt-12 relative max-w-5xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900 group">
            <img
              src="https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=1200&q=85"
              alt="Roadside Mobile Tire Repair Technician"
              className="w-full h-64 sm:h-96 lg:h-[440px] object-cover object-center group-hover:scale-102 transition-transform duration-700 brightness-90"
            />
            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-transparent to-slate-950/60" />

            {/* Floating Telemetry Badges */}
            <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/90 border border-emerald-500/40 text-emerald-400 text-xs font-bold shadow-xl backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Mobile Tire Rig On Scene</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-950/90 border border-slate-700 text-slate-300 text-xs font-semibold shadow-xl backdrop-blur-md">
                <span>GPS Telemetry Active</span>
              </span>
            </div>

            {/* Bottom floating details card */}
            <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/90 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-2xl">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-red-600/20 border border-red-500/30 rounded-xl text-red-400">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Full-Service Mobile Workshop Rigs</h4>
                  <p className="text-xs text-slate-400">Industrial tire changers, nitrogen inflation & computerized wheel balancers mounted inside every van.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Arrival Guarantee</span>
                  <span className="text-sm font-mono font-black text-emerald-400">&lt; 45 Mins</span>
                </div>
              </div>
            </div>
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

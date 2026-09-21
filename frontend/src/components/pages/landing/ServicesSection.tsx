import { Wrench, Shield, Zap, RefreshCw, Disc, Fuel, CheckCircle, Clock } from 'lucide-react';
import { useTenant } from '../../../context/TenantContext';
import { formatCurrency, centsToDollars } from '../../../utils/currency';

const SERVICES = [
  {
    icon: Wrench,
    title: 'Emergency Puncture Repair',
    desc: 'Radial patch & plug completed on-site with full internal tire inspection and pressure verification.',
    priceCents: 9500,
    time: '25 mins',
  },
  {
    icon: Disc,
    title: 'New Tire Mobile Mount',
    desc: 'New high-performance or heavy-duty all-terrain tire mounted directly onto your rim at your vehicle.',
    priceCents: 18500,
    time: '35 mins',
  },
  {
    icon: RefreshCw,
    title: 'Seasonal Tire Swap',
    desc: 'Full 4-wheel seasonal exchange (winter to summer / all-season) with bead cleaning and torque spec.',
    priceCents: 12000,
    time: '45 mins',
  },
  {
    icon: Shield,
    title: 'Rim Bead Leak Service',
    desc: 'Removes corrosion and oxidization from aluminum/steel rim beads to stop slow bead loss permanently.',
    priceCents: 8500,
    time: '30 mins',
  },
  {
    icon: Zap,
    title: 'TPMS Sensor Calibration',
    desc: 'Diagnostics, OEM sensor replacement, and ECU OBD-II relearn for tire pressure monitoring sensors.',
    priceCents: 8900,
    time: '20 mins',
  },
  {
    icon: Fuel,
    title: 'Battery Boost & Emergency Fuel',
    desc: 'High-amperage jump start and rapid emergency fuel delivery directly to stranded highway motorists.',
    priceCents: 7500,
    time: '15 mins',
  },
];

export default function ServicesSection() {
  const { currencySymbol } = useTenant();

  return (
    <section id="services" className="py-16 sm:py-24 bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold text-red-500 uppercase tracking-widest">
            Mobile Workshop Rigs
          </span>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            16 Certified Mobile Tire & Roadside Services
          </h2>
          <p className="text-sm text-slate-400">
            Our heavy-duty mobile vans carry commercial compressors, computerized wheel balancers, and top-tier hydraulic jacks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES.map((srv, idx) => {
            const Icon = srv.icon;
            return (
              <div
                key={idx}
                className="bg-slate-900/60 border border-slate-800 hover:border-red-500/50 rounded-2xl p-6 transition transform hover:-translate-y-1 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 text-red-500 flex items-center justify-center">
                    <Icon size={20} />
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-1 rounded-full">
                    from {formatCurrency(centsToDollars(srv.priceCents), currencySymbol)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-white">{srv.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{srv.desc}</p>
                </div>

                <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-slate-400" />
                    <span>Est. Service: {srv.time}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400">
                    <CheckCircle size={12} className="text-red-500" />
                    <span>Certified Technicians</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

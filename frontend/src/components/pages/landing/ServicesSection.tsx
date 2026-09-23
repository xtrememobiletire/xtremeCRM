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
    imageUrl: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=600&q=80',
  },
  {
    icon: Disc,
    title: 'New Tire Mobile Mount',
    desc: 'New high-performance or heavy-duty all-terrain tire mounted directly onto your rim at your vehicle.',
    priceCents: 18500,
    time: '35 mins',
    imageUrl: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80',
  },
  {
    icon: RefreshCw,
    title: 'Seasonal Tire Swap',
    desc: 'Full 4-wheel seasonal exchange (winter to summer / all-season) with bead cleaning and torque spec.',
    priceCents: 12000,
    time: '45 mins',
    imageUrl: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=600&q=80',
  },
  {
    icon: Shield,
    title: 'Rim Bead Leak Service',
    desc: 'Removes corrosion and oxidization from aluminum/steel rim beads to stop slow bead loss permanently.',
    priceCents: 8500,
    time: '30 mins',
    imageUrl: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80',
  },
  {
    icon: Zap,
    title: 'TPMS Sensor Calibration',
    desc: 'Diagnostics, OEM sensor replacement, and ECU OBD-II relearn for tire pressure monitoring sensors.',
    priceCents: 8900,
    time: '20 mins',
    imageUrl: 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?auto=format&fit=crop&w=600&q=80',
  },
  {
    icon: Fuel,
    title: 'Battery Boost & Emergency Fuel',
    desc: 'High-amperage jump start and rapid emergency fuel delivery directly to stranded highway motorists.',
    priceCents: 7500,
    time: '15 mins',
    imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
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
                className="bg-slate-900/60 border border-slate-800 hover:border-red-500/50 rounded-2xl overflow-hidden transition transform hover:-translate-y-1 space-y-0 shadow-xl group"
              >
                {/* Service Real Photo */}
                <div className="relative h-44 overflow-hidden bg-slate-950">
                  <img
                    src={srv.imageUrl}
                    alt={srv.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-90"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                  
                  <div className="absolute top-3 left-3 w-9 h-9 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-700 text-red-400 flex items-center justify-center shadow-md">
                    <Icon size={18} />
                  </div>
                  
                  <div className="absolute top-3 right-3">
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-slate-950/90 backdrop-blur-md border border-emerald-800/40 px-2.5 py-1 rounded-full shadow-md">
                      from {formatCurrency(centsToDollars(srv.priceCents), currencySymbol)}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white group-hover:text-red-400 transition-colors">{srv.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{srv.desc}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-slate-400" />
                      <span>Est. Service: {srv.time}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <CheckCircle size={12} className="text-red-500" />
                      <span>Certified Tech</span>
                    </div>
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

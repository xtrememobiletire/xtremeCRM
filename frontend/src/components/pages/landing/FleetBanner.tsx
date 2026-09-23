import { Truck, ShieldCheck, FileText, ArrowRight, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function FleetBanner() {
  const navigate = useNavigate();

  return (
    <section id="fleets" className="py-16 sm:py-20 bg-gradient-to-b from-slate-900 to-slate-950 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-900 border border-red-500/20 rounded-3xl p-6 sm:p-10 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-red-600/20 border border-red-500/30 text-xs font-bold text-red-400">
                <Truck size={14} />
                <span>Commercial Fleet Partnerships</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                Keep Your Entire Fleet Moving. <br />
                <span className="text-red-500">Zero Shop Downtime.</span>
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                We service delivery sprinter vans, corporate transport fleets, and commercial contractor trucks directly on your yard or on the highway.
                Enjoy 24/7 emergency dispatch priority, weekly consolidated invoicing, and real-time fleet telematics reporting.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                  <span>24/7 Driver Call-in Verification</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <FileText size={16} className="text-amber-500 shrink-0" />
                  <span>Weekly Itemized Invoicing & Net terms</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-600/30 transition cursor-pointer"
                >
                  <span>Access Fleet Portal / Login</span>
                  <ArrowRight size={15} />
                </button>

                <a
                  href="tel:+18005558473"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm text-slate-300 bg-slate-900 border border-slate-700 hover:bg-slate-800 transition"
                >
                  <Phone size={14} className="text-red-500" />
                  <span>Fleet Inquiries (1-800-555-8473)</span>
                </a>
              </div>
            </div>

            <div className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
              <img
                src="https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80"
                alt="Commercial Mobile Tire Service Fleet"
                className="w-full h-64 lg:h-80 object-cover brightness-90 hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 p-3 bg-slate-950/90 backdrop-blur-md rounded-xl border border-slate-800 text-xs text-slate-300">
                <span className="font-bold text-white block">Commercial Fleet Support</span>
                Dedicated sprinter vans & industrial mobile tire presses on standby.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

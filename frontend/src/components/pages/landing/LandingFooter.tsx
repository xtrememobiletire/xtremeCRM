import { Phone, Mail, MapPin, LogIn, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LandingFooter() {
  const navigate = useNavigate();

  return (
    <footer id="coverage" className="bg-slate-950 text-slate-400 border-t border-slate-800/80 pt-16 pb-12 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Col 1: Brand */}
          <div className="space-y-3">
            <div className="flex items-center">
              <img 
                src="/logo.webp" 
                alt="Xtreme Mobile Tire" 
                className="h-16 sm:h-20 w-auto object-contain drop-shadow" 
              />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Leading emergency roadside mobile tire dispatch network across North America and the United Kingdom.
            </p>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-[11px] font-semibold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span>Dispatch Systems Online</span>
            </div>
          </div>

          {/* Col 2: Regional Silos */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Regional Hubs</h4>
            <ul className="space-y-1.5 text-xs">
              <li className="flex items-center gap-2">
                <MapPin size={12} className="text-red-500 shrink-0" />
                <span>Canada: Greater Toronto Area (CAD $)</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={12} className="text-red-500 shrink-0" />
                <span>United States: NY / East Coast (USD $)</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={12} className="text-red-500 shrink-0" />
                <span>United Kingdom: London & SE (GBP £)</span>
              </li>
            </ul>
          </div>

          {/* Col 3: 24/7 Hotline */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">24/7 Emergency Dispatch</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2 text-white font-bold">
                <Phone size={13} className="text-red-500" />
                <a href="tel:+18005558473" className="hover:text-red-400 transition">1-800-555-TIRE (Toll Free)</a>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={13} className="text-slate-500" />
                <span>dispatch@xtremetiregarage.com</span>
              </div>
            </div>
          </div>

          {/* Col 4: Staff & Portal Login */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Operations Console</h4>
            <p className="text-xs text-slate-400">
              Authorized access for Call Agents, Technicians, Dispatchers, and Accountants.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700 transition shadow-sm cursor-pointer"
            >
              <LogIn size={13} />
              <span>Staff / Dispatcher Login</span>
            </button>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            &copy; {new Date().getFullYear()} Xtreme Mobile Tire Services &amp; CRM. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => navigate('/login')} className="hover:text-white transition flex items-center gap-1">
              <span>Employee Portal</span>
              <ExternalLink size={10} />
            </button>
            <a href="#services" className="hover:text-white transition">Services</a>
            <a href="#emergency-booking" className="hover:text-white transition">Self-Dispatch</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

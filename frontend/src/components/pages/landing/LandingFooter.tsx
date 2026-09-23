import { Phone, Mail, MapPin, LogIn, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LandingFooter() {
  const navigate = useNavigate();

  return (
    <footer id="coverage" className="bg-slate-950 text-slate-400 border-t border-slate-800/80 pt-16 pb-12 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Col 1: Brand */}
          <div className="space-y-4">
            <div className="flex items-center">
              <img 
                src="/logo.webp" 
                alt="Xtreme Mobile Tire" 
                className="h-16 sm:h-20 w-auto object-contain drop-shadow" 
              />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Xtreme Mobile Tire provides professional mobile tire installation, replacement, and repair services — coming directly to you across Canada and the USA.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-[11px] font-semibold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>Dispatch Online</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700 transition shadow-xs text-xs cursor-pointer"
              >
                <LogIn size={12} />
                <span>Staff Login</span>
              </button>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a 
                  href="https://www.xtrememobiletire.com/about" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-white transition inline-flex items-center gap-1.5 text-slate-300"
                >
                  <span>About</span>
                  <ExternalLink size={11} className="text-slate-500" />
                </a>
              </li>
              <li>
                <a 
                  href="https://www.xtrememobiletire.com/services" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-white transition inline-flex items-center gap-1.5 text-slate-300"
                >
                  <span>Services</span>
                  <ExternalLink size={11} className="text-slate-500" />
                </a>
              </li>
              <li>
                <a 
                  href="https://www.xtrememobiletire.com/shop" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-white transition inline-flex items-center gap-1.5 text-slate-300"
                >
                  <span>Shop</span>
                  <ExternalLink size={11} className="text-slate-500" />
                </a>
              </li>
              <li>
                <a 
                  href="https://www.xtrememobiletire.com/blog" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-white transition inline-flex items-center gap-1.5 text-slate-300"
                >
                  <span>Blog</span>
                  <ExternalLink size={11} className="text-slate-500" />
                </a>
              </li>
              <li>
                <a 
                  href="https://www.xtrememobiletire.com/contact" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-white transition inline-flex items-center gap-1.5 text-slate-300"
                >
                  <span>Contact</span>
                  <ExternalLink size={11} className="text-slate-500" />
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: USA Warehouse */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">USA (Warehouse)</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2 text-slate-300">
                <MapPin size={14} className="text-red-500 shrink-0 mt-0.5" />
                <span>11815 Medway Church Loop, Manassas, VA 20109</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={13} className="text-red-500 shrink-0" />
                <a href="tel:+18043265442" className="text-slate-300 hover:text-white font-semibold transition">
                  (804) 326-5442
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={13} className="text-slate-500 shrink-0" />
                <a href="mailto:Info@Xtrememobiletire.com" className="text-slate-300 hover:text-white transition">
                  Info@Xtrememobiletire.com
                </a>
              </div>
            </div>
          </div>

          {/* Col 4: Canada Warehouse */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Canada (Warehouse)</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2 text-slate-300">
                <MapPin size={14} className="text-red-500 shrink-0 mt-0.5" />
                <span>857 Winterton Way, Mississauga, ON L5V 1Z5, Canada</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={13} className="text-red-500 shrink-0" />
                <a href="tel:+14373755674" className="text-slate-300 hover:text-white font-semibold transition">
                  (437) 375-5674
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={13} className="text-slate-500 shrink-0" />
                <a href="mailto:Info@Xtrememobiletire.com" className="text-slate-300 hover:text-white transition">
                  Info@Xtrememobiletire.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            &copy; {new Date().getFullYear()} Xtreme Mobile Tire Services. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => navigate('/login')} className="hover:text-white transition flex items-center gap-1 cursor-pointer">
              <span>Staff / Operations Console</span>
              <ExternalLink size={10} />
            </button>
            <a href="#services" className="hover:text-white transition">Services</a>
            <a href="#emergency-booking" className="hover:text-white transition">Emergency Dispatch</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

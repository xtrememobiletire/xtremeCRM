import { Phone, LogIn, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../../context/TenantContext';
import { COUNTRY_REGIONS, type CountryCode } from '../../../constants/regions';

export default function LandingNav() {
  const navigate = useNavigate();
  const { country, setCountry } = useTenant();

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-2 sm:py-2.5 transition">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <img 
            src="/logo.webp" 
            alt="Xtreme Mobile Tire" 
            className="h-16 sm:h-20 w-auto object-contain drop-shadow-lg hover:scale-105 transition-transform" 
          />
        </div>

        {/* Center Links (Desktop) */}
        <div className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
          <a href="#services" className="hover:text-white transition">Services</a>
          <a href="#emergency-booking" className="hover:text-white transition">Instant Booking</a>
          <a href="#fleets" className="hover:text-white transition">Fleet Solutions</a>
          <a href="#coverage" className="hover:text-white transition">Regional Coverage</a>
        </div>

        {/* Right side: Region Selector, Emergency Call, and Sign In */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Country Selector */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300">
            <Globe size={13} className="text-red-500" />
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value as CountryCode)}
              aria-label="Select service region"
              className="bg-transparent border-none text-xs text-slate-200 focus:ring-0 cursor-pointer font-semibold py-0 pl-1 pr-4"
            >
              {Object.entries(COUNTRY_REGIONS).map(([code, def]) => (
                <option key={code} value={code} className="bg-slate-900 text-white">
                  {def.flag} {def.name} ({def.currency})
                </option>
              ))}
            </select>
          </div>

          {/* Emergency Phone CTA */}
          <a
            href="tel:+18005558473"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 bg-red-950/60 border border-red-800/60 hover:bg-red-900/40 transition"
          >
            <Phone size={13} className="text-red-400 animate-pulse" />
            <span>1-800-555-TIRE</span>
          </a>

          {/* Login / Sign In Button */}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm shadow-red-600/30 transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <LogIn size={14} />
            <span>Sign In</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

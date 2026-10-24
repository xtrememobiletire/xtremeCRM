import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useTenant } from '../../../context/TenantContext';
import { COUNTRY_REGIONS, type CountryCode, type RegionConfig } from '../../../constants/regions';
import { toast } from 'sonner';

export default function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { country, setCountry } = useTenant();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Logged in successfully');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-black text-white py-6 px-6 sm:px-8 shadow-2xl rounded-none border border-zinc-800 space-y-4">
      {/* Brand Logo Included Inside Black Card */}
      <div className="flex justify-center pt-1 pb-1">
        <img 
          src="https://res.cloudinary.com/ebjikx52/image/upload/v1792426903/xtreme/frontend/logo-signin_png.png" 
          alt="Xtreme Mobile Tire" 
          className="h-14 sm:h-16 w-auto object-contain drop-shadow-md" 
        />
      </div>

      {/* Heading */}
      <div className="text-center pb-3 border-b border-zinc-800">
        <h2 className="text-xl font-bold text-white tracking-tight">Account Login</h2>
        <p className="text-xs text-zinc-400 mt-1">Sign in to manage vehicles, drivers, service requests and invoices</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Regional Silo Selection - Clear & High-Contrast */}
        <div>
          <label className="text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
            Operating Region
          </label>
          <div className="grid grid-cols-3 gap-2 mt-1.5">
            {Object.entries(COUNTRY_REGIONS).map(([code, reg]: [string, RegionConfig]) => (
              <button
                key={code}
                type="button"
                onClick={() => setCountry(code as CountryCode)}
                className={`py-2 px-2 rounded-none border text-xs font-bold transition flex flex-col items-center cursor-pointer ${
                  country === code
                    ? 'border-red-600 bg-red-50 text-red-700 shadow-sm ring-1 ring-red-600'
                    : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100 hover:border-slate-400'
                }`}
              >
                <span className="font-extrabold">{code}</span>
                <span className={`text-[10px] font-medium ${country === code ? 'text-red-600' : 'text-slate-500'}`}>
                  {reg.currency}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Email Address - Clear White Field */}
        <div>
          <label className="text-xs font-semibold text-zinc-200">Email Address</label>
          <div className="relative mt-1.5">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-none focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition"
              placeholder="name@company.com"
            />
          </div>
        </div>

        {/* Password - Clear White Field with Eye Toggle */}
        <div>
          <label className="text-xs font-semibold text-zinc-200">Password</label>
          <div className="relative mt-1.5">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-xs bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-none focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition"
              placeholder="••••••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 focus:outline-none cursor-pointer p-0.5"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/30 cursor-pointer rounded-none flex items-center justify-center gap-2 transition"
        >
          <span>{loading ? 'Authenticating...' : 'Sign In to Account'}</span>
          <ArrowRight size={13} />
        </button>
      </form>
    </div>
  );
}

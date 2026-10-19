import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react';
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
    <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200/80 sm:px-10 space-y-5">
      {/* Heading */}
      <div className="text-center pb-3 border-b border-slate-100">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 text-[11px] font-bold mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Fleet and Dispatch Portal</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Account Login</h2>
        <p className="text-xs text-slate-500 mt-1">Sign in to manage vehicles, drivers, service requests and invoices</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Regional Silo Selection */}
        <div>
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Operating Region
          </label>
          <div className="grid grid-cols-3 gap-2 mt-1.5">
            {Object.entries(COUNTRY_REGIONS).map(([code, reg]: [string, RegionConfig]) => (
              <button
                key={code}
                type="button"
                onClick={() => setCountry(code as CountryCode)}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition flex flex-col items-center cursor-pointer ${
                  country === code
                    ? 'border-red-600 bg-red-50 text-red-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{code}</span>
                <span className="text-[10px] font-normal text-slate-400">{reg.currency}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700">Email Address</label>
          <div className="relative mt-1">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-base pl-9 py-2 text-xs"
              placeholder="name@company.com"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700">Password</label>
          <div className="relative mt-1">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-base pl-9 py-2 text-xs"
              placeholder="••••••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-2.5 text-xs font-bold shadow-md shadow-red-600/20 cursor-pointer"
        >
          <span>{loading ? 'Authenticating...' : 'Sign In to Account'}</span>
          <ArrowRight size={14} />
        </button>
      </form>

      {/* Return to Landing Page Link */}
      <div className="pt-3 border-t border-slate-100 flex justify-center">
        <a
          href={
            import.meta.env.VITE_LANDING_PAGE_URL ||
            (import.meta.env.PROD || (typeof window !== 'undefined' && !window.location.hostname.includes('localhost'))
              ? 'https://xtrememobiletire.com'
              : 'http://localhost:4000')
          }
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Landing Page</span>
        </a>
      </div>
    </div>
  );
}

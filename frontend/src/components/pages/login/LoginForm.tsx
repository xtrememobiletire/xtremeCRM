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
    <div className="bg-white py-5 px-5 sm:px-7 shadow-xl rounded-none border border-slate-200/80 space-y-3.5">
      {/* Heading */}
      <div className="text-center pb-2.5 border-b border-slate-100">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none bg-red-50 text-red-700 text-[10px] font-bold mb-1.5">
          <ShieldCheck className="w-3 h-3" />
          <span>Fleet and Dispatch Portal</span>
        </div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Account Login</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">Sign in to manage vehicles, drivers, service requests and invoices</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Regional Silo Selection */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            Operating Region
          </label>
          <div className="grid grid-cols-3 gap-1.5 mt-1">
            {Object.entries(COUNTRY_REGIONS).map(([code, reg]: [string, RegionConfig]) => (
              <button
                key={code}
                type="button"
                onClick={() => setCountry(code as CountryCode)}
                className={`py-1.5 px-2 rounded-none border text-xs font-bold transition flex flex-col items-center cursor-pointer ${
                  country === code
                    ? 'border-red-600 bg-red-50 text-red-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{code}</span>
                <span className="text-[9px] font-normal text-slate-400">{reg.currency}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-700">Email Address</label>
          <div className="relative mt-1">
            <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-base pl-8 py-1.5 text-xs rounded-none"
              placeholder="name@company.com"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-700">Password</label>
          <div className="relative mt-1">
            <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-base pl-8 py-1.5 text-xs rounded-none"
              placeholder="••••••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-2 text-xs font-bold shadow-md shadow-red-600/20 cursor-pointer rounded-none"
        >
          <span>{loading ? 'Authenticating...' : 'Sign In to Account'}</span>
          <ArrowRight size={13} />
        </button>
      </form>

      {/* Return to Landing Page Link */}
      <div className="pt-2 border-t border-slate-100 flex justify-center">
        <a
          href={
            import.meta.env.VITE_LANDING_PAGE_URL ||
            (import.meta.env.PROD || (typeof window !== 'undefined' && !window.location.hostname.includes('localhost'))
              ? 'https://xtrememobiletire.com'
              : 'http://localhost:4000')
          }
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer py-0.5"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>Return to Landing Page</span>
        </a>
      </div>
    </div>
  );
}

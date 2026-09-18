import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useTenant } from '../../../context/TenantContext';
import { COUNTRY_REGIONS, type CountryCode, type RegionConfig } from '../../../constants/regions';
import { toast } from 'sonner';

export default function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { country, setCountry } = useTenant();

  const [email, setEmail] = useState('dispatcher@xtrememobiletire.com');
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Logged into XtremeCRM Dispatch Portal');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (role: string) => {
    if (role === 'admin') {
      setEmail('admin@xtrememobiletire.com');
    } else if (role === 'dispatcher') {
      setEmail('dispatcher@xtrememobiletire.com');
    } else {
      setEmail('driver@xtrememobiletire.com');
    }
    setPassword('Password123!');
  };

  return (
    <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200/80 sm:px-10 space-y-6">
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
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition flex flex-col items-center ${
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
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-2.5 text-xs font-bold shadow-md shadow-red-600/20"
        >
          <span>{loading ? 'Authenticating...' : 'Sign In to Dispatch'}</span>
          <ArrowRight size={14} />
        </button>
      </form>

      {/* Quick Demo Logins */}
      <div className="pt-4 border-t border-slate-100">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2">
          Fast Demo Accounts
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleQuickFill('dispatcher')}
            className="flex-1 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 transition"
          >
            Dispatcher
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('admin')}
            className="flex-1 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 transition"
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('driver')}
            className="flex-1 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 transition"
          >
            Technician
          </button>
        </div>
      </div>
    </div>
  );
}

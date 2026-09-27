import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, ShieldCheck, Truck } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useTenant } from '../../../context/TenantContext';
import { COUNTRY_REGIONS, type CountryCode, type RegionConfig } from '../../../constants/regions';
import { toast } from 'sonner';

export default function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { country, setCountry } = useTenant();

  const [email, setEmail] = useState('fleet.manager@xtremecrm.com');
  const [password, setPassword] = useState('AdminPassword123!');
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

  const handleQuickFill = (role: string) => {
    if (role === 'fleet') {
      setEmail('fleet.manager@xtremecrm.com');
    } else if (role === 'admin') {
      setEmail('admin@xtremecrm.com');
    } else if (role === 'agent') {
      setEmail('agent@xtremecrm.com');
    } else if (role === 'dispatcher') {
      setEmail('dispatcher@xtremecrm.com');
    } else if (role === 'va') {
      setEmail('va@xtremecrm.com');
    } else {
      setEmail('driver@xtremecrm.com');
    }
    setPassword('AdminPassword123!');
  };

  const handleQuickLogin = async (emailVal: string) => {
    const pw = 'AdminPassword123!';
    setEmail(emailVal);
    setPassword(pw);
    setLoading(true);
    try {
      await login(emailVal, pw);
      toast.success('Logged into Fleet Manager Portal');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200/80 sm:px-10 space-y-5">
      {/* Heading requested by user */}
      <div className="text-center pb-3 border-b border-slate-100">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 text-[11px] font-bold mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Fleet & Dispatch Portal</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Fleet Manager Account</h2>
        <p className="text-xs text-slate-500 mt-1">Sign in to manage vehicles, drivers, service requests & invoices</p>
      </div>

      {/* Prominent One-Click Fleet Manager Login Button */}
      <button
        type="button"
        disabled={loading}
        onClick={() => handleQuickLogin('fleet.manager@xtremecrm.com')}
        className="w-full py-2.5 px-3 rounded-xl border-2 border-red-500 bg-red-50 hover:bg-red-100 text-xs font-bold text-red-700 transition flex items-center justify-center gap-2 cursor-pointer shadow-xs group"
      >
        <Truck className="w-4 h-4 text-red-600 group-hover:scale-110 transition-transform" />
        <span>Sign In as Fleet Manager (KT Group)</span>
        <ArrowRight className="w-3.5 h-3.5 ml-auto text-red-500" />
      </button>

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
              placeholder="fleet.manager@xtremecrm.com"
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
          className="w-full btn-primary py-2.5 text-xs font-bold shadow-md shadow-red-600/20"
        >
          <span>{loading ? 'Authenticating...' : 'Sign In to Account'}</span>
          <ArrowRight size={14} />
        </button>
      </form>

      {/* Quick Demo Logins */}
      <div className="pt-4 border-t border-slate-100">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2">
          Fast Demo Accounts
        </p>
        <div className="grid grid-cols-3 gap-1.5 mb-1.5">
          <button
            type="button"
            onClick={() => handleQuickFill('fleet')}
            className="py-1.5 px-2 rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 text-[11px] font-bold text-red-700 transition text-center cursor-pointer shadow-xs"
          >
            Fleet Manager
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('admin')}
            className="py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 transition text-center cursor-pointer"
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('dispatcher')}
            className="py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 transition text-center cursor-pointer"
          >
            Dispatcher
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => handleQuickFill('agent')}
            className="py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 transition text-center cursor-pointer"
          >
            Agent
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('va')}
            className="py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 transition text-center cursor-pointer"
          >
            VA Agent
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('driver')}
            className="py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 transition text-center cursor-pointer"
          >
            Technician
          </button>
        </div>

        {/* Accountant quick-logins */}
        <div className="grid grid-cols-2 gap-1.5 mt-1.5">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleQuickLogin('senior.accountant@xtremecrm.com')}
            className="py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-[11px] font-semibold text-emerald-700 transition text-center cursor-pointer disabled:opacity-50"
          >
            Senior Accountant
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleQuickLogin('junior.accountant@xtremecrm.com')}
            className="py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-[11px] font-semibold text-amber-700 transition text-center cursor-pointer disabled:opacity-50"
          >
            Junior Accountant
          </button>
        </div>
      </div>
    </div>
  );
}

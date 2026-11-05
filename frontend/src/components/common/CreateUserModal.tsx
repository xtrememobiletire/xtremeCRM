import { useState } from 'react';
import { 
  X, 
  UserPlus, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Copy, 
  Check, 
  User, 
  Phone, 
  Globe2, 
  ShieldCheck, 
  Loader2 
} from 'lucide-react';
import { toast } from 'sonner';
import { userService, type UserItem } from '../../services/userService';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserItem) => void;
  defaultRegion?: 'CA' | 'US' | 'UK';
}

const ALL_ROLES = [
  { value: 'CALL_AGENT', label: 'Call Agent (Internal)' },
  { value: 'DISPATCHER', label: 'Dispatcher (Internal)' },
  { value: 'DRIVER', label: 'Technician / Driver (Internal)' },
  { value: 'ADMIN', label: 'Administrator (Internal)' },
  { value: 'GENERAL_MANAGER', label: 'General Manager (Internal)' },
  { value: 'ACCOUNTANT', label: 'Accountant (Internal)' },
  { value: 'VIRTUAL_ASSISTANT', label: 'Virtual Assistant (Internal)' },
  { value: 'DEVELOPER', label: 'Developer (Internal)' },
  { value: 'FLEET_MANAGER', label: 'Fleet Manager (Client Portal)' },
  { value: 'CUSTOMER_MEMBER', label: 'Customer Member (Client Portal)' },
];

export default function CreateUserModal({
  isOpen,
  onClose,
  onSuccess,
  defaultRegion = 'CA',
}: CreateUserModalProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CALL_AGENT');
  const [countryCode, setCountryCode] = useState<'CA' | 'US' | 'UK'>(defaultRegion);
  const [phone, setPhone] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPassword('');
    setRole('CALL_AGENT');
    setCountryCode(defaultRegion);
    setPhone('');
    setShowPassword(false);
    setCopied(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const generateSecurePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let result = '';
    const randomValues = new Uint32Array(14);
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < 14; i++) {
      result += chars[randomValues[i] % chars.length];
    }
    setPassword(result);
    setShowPassword(true);
    toast.info('Secure temporary password generated');
  };

  const copyToClipboard = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast.success('Password copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedName) {
      toast.error('Full name is required');
      return;
    }

    if (!trimmedEmail) {
      toast.error('Email address is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!trimmedPassword || trimmedPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await userService.createUser({
        fullName: trimmedName,
        email: trimmedEmail,
        password: trimmedPassword,
        role,
        countryCode,
        phone: phone.trim() || undefined,
      });

      toast.success(`User ${created.fullName || trimmedName} created successfully!`);
      resetForm();
      onSuccess(created);
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to create user account';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Create User Account</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  DEVELOPER ONLY
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Provision a new staff member or portal client across regional silos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <User size={13} className="text-slate-400" />
              <span>Full Name</span>
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-white font-medium"
            />
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Mail size={13} className="text-slate-400" />
              <span>Account Email Address</span>
              <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. john.doe@xtremetire.com"
              className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
            />
          </div>

          {/* Role and Region in Two Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Role */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-slate-400" />
                <span>Assigned Role</span>
                <span className="text-red-500">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xl bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
              >
                {ALL_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Region Silo */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Globe2 size={13} className="text-slate-400" />
                <span>Operating Region</span>
                <span className="text-red-500">*</span>
              </label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value as 'CA' | 'US' | 'UK')}
                className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xl bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
              >
                <option value="CA">Canada (CA)</option>
                <option value="US">United States (US)</option>
                <option value="UK">United Kingdom (UK)</option>
              </select>
            </div>
          </div>

          {/* Phone (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Phone size={13} className="text-slate-400" />
              <span>Contact Phone</span>
              <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +1 416-555-0199"
              className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
            />
          </div>

          {/* Password with Generator & Visibility Toggle */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Lock size={13} className="text-slate-400" />
                <span>Temporary Password</span>
                <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={generateSecurePassword}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100/80 px-2 py-0.5 rounded-md transition cursor-pointer"
              >
                <Sparkles size={11} className="text-purple-600" />
                <span>Auto-Generate</span>
              </button>
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter at least 6 characters..."
                className="w-full pl-3 pr-20 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {password && (
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                    title="Copy password"
                  >
                    {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              Minimum 6 characters. The user can log in immediately with these credentials.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <UserPlus size={13} />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

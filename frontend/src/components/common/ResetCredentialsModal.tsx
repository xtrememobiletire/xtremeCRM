import { useState, useEffect } from 'react';
import { 
  X, 
  KeyRound, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Copy, 
  Check, 
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { userService, type UserItem } from '../../services/userService';

interface ResetCredentialsModalProps {
  user: UserItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: UserItem) => void;
}

export default function ResetCredentialsModal({
  user,
  isOpen,
  onClose,
  onSuccess,
}: ResetCredentialsModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setPassword('');
      setShowPassword(false);
      setCopied(false);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

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

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    const emailChanged = trimmedEmail !== user.email;
    const hasPassword = Boolean(trimmedPassword);

    if (!emailChanged && !hasPassword) {
      toast.error('Please enter a new password or change the email address');
      return;
    }

    if (hasPassword && trimmedPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: { email?: string; password?: string } = {};
      if (emailChanged) payload.email = trimmedEmail;
      if (hasPassword) payload.password = trimmedPassword;

      const updated = await userService.resetUserCredentials(user.id, payload);
      toast.success(`Credentials updated for ${user.fullName}`);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to update credentials';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-headline"
    >
      <div 
        className="w-full max-w-md bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden transition-all transform scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Gestalt Common Region) */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
              <KeyRound className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 id="modal-headline" className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                Change Credentials
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Developer Console • Override account login
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Identity Context Card */}
        <div className="px-5 pt-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
            <div className="min-w-0">
              <p className="font-bold text-slate-800 truncate">{user.fullName}</p>
              <p className="text-[11px] text-slate-500 font-mono truncate">{user.email}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                {user.countryCode}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                {user.role}
              </span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Email Field */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
              <span>Account Email Address</span>
              {email.trim() !== user.email && (
                <span className="text-[10px] text-amber-600 font-semibold normal-case">
                  Will be updated
                </span>
              )}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                disabled={isSubmitting}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 font-medium text-slate-800 transition disabled:bg-slate-50"
              />
            </div>
          </div>

          {/* New Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                New Password
              </label>
              <button
                type="button"
                onClick={generateSecurePassword}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 cursor-pointer transition hover:underline"
              >
                <Sparkles size={12} />
                <span>Generate Random</span>
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep unchanged"
                disabled={isSubmitting}
                className="w-full pl-9 pr-20 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono text-slate-800 transition disabled:bg-slate-50"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {password && (
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    title="Copy password"
                    className="p-1 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                  >
                    {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              Direct override: No prior password required. Minimum 6 characters.
            </p>
          </div>

          {/* Security Notice Warning Banner */}
          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-[11px] leading-relaxed">
              <p className="font-bold text-amber-950">Active Session Invalidation</p>
              <p className="text-amber-800">
                Updating credentials will invalidate the target user's cached authentication session immediately.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (email.trim() === user.email && !password.trim())}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-98 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <KeyRound size={13} />
                  <span>Save Credentials</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

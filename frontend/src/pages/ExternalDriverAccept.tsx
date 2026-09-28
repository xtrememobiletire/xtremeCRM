import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Truck, MapPin, Wrench, CheckCircle2, AlertCircle, Building2, Phone, User, ShieldCheck } from 'lucide-react';
import { api } from '../utils/api';

export default function ExternalDriverAccept() {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<any>(null);
  const [error, setError] = useState<string>('');

  // Form State
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedSuccess, setAcceptedSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;
    api
      .get(`/jobs/external/${token}`)
      .then((res) => {
        setJob(res.data?.data);
        if (res.data?.data?.externalDriverAcceptedAt) {
          setAcceptedSuccess(true);
        }
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Invalid or expired dispatch invitation link');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName || !driverPhone || !companyName) {
      alert('Please fill in your name, contact phone number, and company name');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/jobs/external/${token}/accept`, {
        name: driverName,
        phone: driverPhone,
        companyName,
      });
      setAcceptedSuccess(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to accept dispatch job');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedPayout = job?.externalDriverValueCents
    ? `$${(job.externalDriverValueCents / 100).toFixed(2)} ${job.currency || 'CAD'}`
    : '$0.00';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-xl">
          <div className="w-12 h-12 rounded-full bg-red-950 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-800">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Invitation Unavailable</h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">{error || 'This job link is no longer valid or has expired.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <img src="/logo.webp" alt="Xtreme Mobile Tire" className="h-12 w-auto mx-auto mb-3 drop-shadow" />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/80 border border-red-800 text-red-400 text-xs font-semibold">
            <Truck size={12} />
            <span>Third-Party Dispatch Work Order</span>
          </div>
          <h1 className="mt-3 text-xl sm:text-2xl font-black tracking-tight text-white">
            Job #{job.jobCode}
          </h1>
        </div>

        {acceptedSuccess ? (
          <div className="bg-slate-900 border border-emerald-900/60 rounded-3xl p-6 sm:p-8 text-center shadow-2xl">
            <div className="w-14 h-14 bg-emerald-950/80 border border-emerald-700 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Dispatch Accepted!</h2>
            <p className="text-xs text-slate-400 mb-6">
              You are assigned to this roadside work order. Our operations dispatch team has been notified.
            </p>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-left space-y-2 mb-6">
              <div className="text-xs text-slate-400">
                Service Address: <strong className="text-white block mt-0.5">{job.serviceAddress}</strong>
              </div>
              <div className="text-xs text-slate-400">
                Agreed Payout: <strong className="text-emerald-400 block mt-0.5">{formattedPayout}</strong>
              </div>
              {job.vehicle && (
                <div className="text-xs text-slate-400">
                  Vehicle / Tire: <strong className="text-white block mt-0.5">{job.vehicle.year || ''} {job.vehicle.make} {job.vehicle.model} ({job.vehicle.tireSize || 'N/A'})</strong>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-500">
              Please head directly to the service location. For support, contact Xtreme Dispatch Operations.
            </p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            {/* Payout Banner (Locked) */}
            <div className="bg-amber-950/40 border border-amber-800/80 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-amber-400 block">Agreed Sub-Contractor Payout</span>
                <span className="text-xs text-slate-400">Pre-authorized rate for this dispatch</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black font-mono text-amber-300">{formattedPayout}</span>
                <span className="text-[10px] text-slate-400 block">Non-negotiable</span>
              </div>
            </div>

            {/* Service & Location Details */}
            <div className="space-y-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 text-xs">
              <div className="flex items-start gap-2.5">
                <MapPin size={16} className="text-red-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 font-semibold block text-[11px]">Breakdown Location</span>
                  <span className="text-white font-medium">{job.serviceAddress}</span>
                </div>
              </div>

              {job.vehicle && (
                <div className="flex items-start gap-2.5 border-t border-slate-800/60 pt-2.5">
                  <Truck size={16} className="text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 font-semibold block text-[11px]">Vehicle & Tire Spec</span>
                    <span className="text-white font-medium">
                      {job.vehicle.year || ''} {job.vehicle.make} {job.vehicle.model} • Tire: <span className="font-mono text-amber-400 font-bold">{job.vehicle.tireSize || 'Standard'}</span>
                    </span>
                  </div>
                </div>
              )}

              {job.serviceItems && job.serviceItems.length > 0 && (
                <div className="flex items-start gap-2.5 border-t border-slate-800/60 pt-2.5">
                  <Wrench size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 font-semibold block text-[11px]">Required Services</span>
                    <span className="text-white font-medium">
                      {job.serviceItems.map((s: any) => s.serviceName).join(', ')}
                    </span>
                  </div>
                </div>
              )}

              {job.problemNotes && (
                <div className="border-t border-slate-800/60 pt-2.5 text-slate-300">
                  <span className="text-slate-400 font-semibold block text-[11px] mb-0.5">Technician Problem Notes</span>
                  <p className="italic text-slate-300 leading-relaxed bg-slate-900/60 p-2 rounded-xl">{job.problemNotes}</p>
                </div>
              )}
            </div>

            {/* Acceptance Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-red-500" />
                <span>Sub-Contractor Driver Details</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <User size={13} className="text-slate-500" />
                  <span>Your Full Name <span className="text-red-400">*</span></span>
                </label>
                <input
                  type="text"
                  required
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g. Johnathan Smith"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Phone size={13} className="text-slate-500" />
                  <span>Direct Mobile Phone <span className="text-red-400">*</span></span>
                </label>
                <input
                  type="tel"
                  required
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="e.g. +1 (416) 555-0199"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Building2 size={13} className="text-slate-500" />
                  <span>Company / Service Provider Name <span className="text-red-400">*</span></span>
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Metro Roadside & Towing Ltd."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 active:scale-98 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-red-950 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
              >
                <CheckCircle2 size={16} />
                <span>{isSubmitting ? 'Confirming Dispatch...' : `Accept & Confirm Job (${formattedPayout})`}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

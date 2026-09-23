import { useState } from 'react';
import { AlertTriangle, Send, CheckCircle2, Car, MapPin, Phone, User, Clock, Shield } from 'lucide-react';
import { useTenant } from '../../../context/TenantContext';
import { jobService } from '../../../services/jobService';
import { formatCurrency, centsToDollars } from '../../../utils/currency';
import { toast } from 'sonner';

const SERVICES_OPTIONS = [
  { id: 'flat-repair', name: 'Flat Tire Mobile Repair & Patch', priceCents: 9500 },
  { id: 'emergency-tire', name: 'Emergency Roadside New Tire Mount', priceCents: 18500 },
  { id: 'rim-repair', name: 'Rim Bead Leak & Valve Stem Service', priceCents: 8500 },
  { id: 'seasonal-swap', name: 'Mobile Seasonal Tire Swap & Balancing', priceCents: 12000 },
  { id: 'battery-boost', name: 'Roadside Battery Jump & Alternator Test', priceCents: 7500 },
  { id: 'tpms-service', name: 'TPMS Sensor Diagnostic & Replacement', priceCents: 8900 },
];

export default function QuickBookWidget() {
  const { country, currencySymbol } = useTenant();
  const [loading, setLoading] = useState(false);
  const [successJob, setSuccessJob] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    serviceAddress: '',
    make: '',
    model: '',
    year: new Date().getFullYear().toString(),
    tireSize: '',
    serviceId: 'flat-repair',
    urgency: 'EMERGENCY' as 'EMERGENCY' | 'STANDARD',
    problemNotes: '',
  });

  const selectedService = SERVICES_OPTIONS.find((s) => s.id === formData.serviceId) || SERVICES_OPTIONS[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.serviceAddress.trim()) {
      toast.error('Please enter your name, phone number, and breakdown location');
      return;
    }

    try {
      setLoading(true);
      const created = await jobService.createPublicBooking({
        countryCode: country,
        urgency: formData.urgency,
        recipientName: formData.fullName,
        recipientPhone: formData.phone,
        serviceAddress: formData.serviceAddress,
        locationAddress: formData.serviceAddress,
        problemNotes: formData.problemNotes || `${selectedService.name} requested at roadside location`,
        paymentMethod: 'POS',
        customer: {
          fullName: formData.fullName,
          phone: formData.phone,
        },
        vehicle: {
          make: formData.make || 'Passenger',
          model: formData.model || 'Vehicle',
          year: parseInt(formData.year) || undefined,
          tireSize: formData.tireSize || undefined,
        },
        lineItems: [
          {
            serviceName: selectedService.name,
            price: selectedService.priceCents,
            quantity: 1,
          },
        ],
        makeUserAccount: true,
      });

      setSuccessJob(created);
      toast.success('Emergency roadside dispatch ticket created!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to dispatch request. Please call 1-800-555-TIRE.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="emergency-booking" className="py-16 sm:py-24 bg-slate-900 border-t border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Explainer */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-red-950/80 border border-red-800/80 text-xs font-bold text-red-400">
              <AlertTriangle size={14} className="animate-pulse" />
              <span>Instant Self-Dispatch Portal</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">
              Request Rapid Roadside Assistance Now
            </h2>

            <p className="text-sm text-slate-300 leading-relaxed">
              No subscription or membership required. Submit your exact roadside address or highway marker,
              and our nearest mobile service van will be instantly routed with the right equipment and tire sizes.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-slate-800 text-red-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Live ETA Tracking</h4>
                  <p className="text-xs text-slate-400">Technician dispatched directly upon submission with live SMS tracking.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-slate-800 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Shield size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Transparent Upfront Pricing</h4>
                  <p className="text-xs text-slate-400">Zero hidden fees or forced towing costs. Card, cash, or fleet account accepted on-site.</p>
                </div>
              </div>
            </div>

            {/* Region notice */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
              Active Region: <strong className="text-white">{country} Operations Silo</strong>.
              Estimated mobile unit arrival: <strong className="text-emerald-400">30 - 45 mins</strong>.
            </div>
          </div>

          {/* Right Form or Success Card */}
          <div className="lg:col-span-7">
            {successJob ? (
              <div className="bg-slate-950 border border-emerald-500/50 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl shadow-emerald-500/10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Technician Dispatched!</h3>
                    <p className="text-xs text-slate-400">Your roadside request has been entered into the live dispatch board.</p>
                  </div>
                </div>

                <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 space-y-3 font-mono text-xs">
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">TICKET NUMBER:</span>
                    <span className="font-bold text-red-400">{successJob.jobNumber || successJob.jobCode || 'JOB-ACTIVE'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">CUSTOMER:</span>
                    <span className="text-white">{formData.fullName} ({formData.phone})</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">LOCATION:</span>
                    <span className="text-white truncate max-w-[260px]">{formData.serviceAddress}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">SERVICE:</span>
                    <span className="text-emerald-400 font-bold">{selectedService.name}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSuccessJob(null);
                      setFormData({
                        fullName: '',
                        phone: '',
                        serviceAddress: '',
                        make: '',
                        model: '',
                        year: new Date().getFullYear().toString(),
                        tireSize: '',
                        serviceId: 'flat-repair',
                        urgency: 'EMERGENCY',
                        problemNotes: '',
                      });
                    }}
                    className="w-full sm:w-auto btn-secondary text-xs py-2.5 px-4"
                  >
                    Submit Another Request
                  </button>
                  <a
                    href="tel:+18005558473"
                    className="w-full sm:w-auto btn-primary text-xs py-2.5 px-4 justify-center"
                  >
                    <Phone size={13} />
                    <span>Call Live Dispatcher (1-800-555-TIRE)</span>
                  </a>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <img 
                      src="/logo.webp" 
                      alt="Xtreme Mobile Tire" 
                      className="h-10 sm:h-12 w-auto object-contain drop-shadow" 
                    />
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-white">Emergency Roadside Request</h3>
                      <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Fast Mobile Tire Dispatch</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1 border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, urgency: 'EMERGENCY' })}
                      className={`px-2.5 py-1 rounded-md font-bold transition ${
                        formData.urgency === 'EMERGENCY'
                          ? 'bg-red-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Immediate Breakdown
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, urgency: 'STANDARD' })}
                      className={`px-2.5 py-1 rounded-md font-bold transition ${
                        formData.urgency === 'STANDARD'
                          ? 'bg-slate-700 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Scheduled
                    </button>
                  </div>
                </div>

                {/* Contact fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <User size={13} className="text-red-500" />
                      <span>Your Name *</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Morgan"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Phone size={13} className="text-red-500" />
                      <span>Mobile Phone *</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+1 (416) 555-0199"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Service Address */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <MapPin size={13} className="text-red-500" />
                    <span>Exact Breakdown Location or Address *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hwy 401 Eastbound shoulder near Exit 342, Toronto"
                    value={formData.serviceAddress}
                    onChange={(e) => setFormData({ ...formData, serviceAddress: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Vehicle & Tire Info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                      <Car size={11} />
                      <span>Year</span>
                    </label>
                    <input
                      type="number"
                      placeholder="2022"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400">Make</label>
                    <input
                      type="text"
                      placeholder="e.g. Ford"
                      value={formData.make}
                      onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400">Model</label>
                    <input
                      type="text"
                      placeholder="e.g. F-150"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400">Tire Size</label>
                    <input
                      type="text"
                      placeholder="275/55R20"
                      value={formData.tireSize}
                      onChange={(e) => setFormData({ ...formData, tireSize: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Service Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Required Service</label>
                  <select
                    value={formData.serviceId}
                    onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    {SERVICES_OPTIONS.map((srv) => (
                      <option key={srv.id} value={srv.id}>
                        {srv.name} — from {formatCurrency(centsToDollars(srv.priceCents), currencySymbol)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send size={15} />
                  <span>{loading ? 'Dispatching Nearest Unit...' : 'Confirm & Dispatch Roadside Technician'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

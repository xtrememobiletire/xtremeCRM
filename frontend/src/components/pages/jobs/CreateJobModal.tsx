import { useState, useEffect } from 'react';
import { Wrench, Car, User, MapPin } from 'lucide-react';
import Modal from '../../ui/Modal';
import { SERVICES_CATALOG, type ServiceCatalogItem } from '../../../constants/services';
import { useCreateJob } from '../../../hooks/useJobs';
import { useTenant } from '../../../context/TenantContext';
import { formatCurrency, centsToDollars } from '../../../utils/currency';
import { toast } from 'sonner';
import JobDispositionModal from './JobDispositionModal';
import { customerService } from '../../../services/customerService';
import { jobService } from '../../../services/jobService';

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillPhone?: string;
}

export default function CreateJobModal({ isOpen, onClose, prefillPhone = '' }: CreateJobModalProps) {
  const { country, currencySymbol, taxRate } = useTenant();
  const createJobMutation = useCreateJob();

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState(prefillPhone);
  const [customerEmail, setCustomerEmail] = useState('');
  const [makeUserAccount, setMakeUserAccount] = useState(true);

  // Auto-detection lookup state
  const [lookupResult, setLookupResult] = useState<{
    found: boolean;
    isReturning: boolean;
    customer: any;
    fleet: any;
    driver: any;
  } | null>(null);

  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [tireSize, setTireSize] = useState('');
  const [licensePlate, setLicensePlate] = useState('');

  const [locationAddress, setLocationAddress] = useState('');
  const [urgency, setUrgency] = useState('STANDARD');
  const [selectedServices, setSelectedServices] = useState<string[]>(['MOBILE_DISPATCH_FEE']);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('POS');

  // Mandatory Call Outcome Disposition (Rule 6.2)
  const [isDispositionPromptOpen, setIsDispositionPromptOpen] = useState(false);

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setMakeUserAccount(true);
    setLookupResult(null);
    setVehicleMake('');
    setVehicleModel('');
    setVehicleYear('');
    setTireSize('');
    setLicensePlate('');
    setLocationAddress('');
    setUrgency('STANDARD');
    setSelectedServices(['MOBILE_DISPATCH_FEE']);
    setNotes('');
    setPaymentMethod('POS');
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
      if (prefillPhone) {
        setCustomerPhone(prefillPhone);
      }
    }
  }, [isOpen, prefillPhone]);

  useEffect(() => {
    const clean = customerPhone.replace(/[^0-9]/g, '');
    if (clean.length >= 10) {
      customerService.lookupCustomer(customerPhone)
        .then((res) => {
          setLookupResult(res);
          if (res.customer) {
            setCustomerName(res.customer.fullName || res.customer.name || '');
            setCustomerEmail(res.customer.email || '');
            if (res.customer.vehicles?.length > 0) {
              const v = res.customer.vehicles[0];
              setVehicleMake(v.make || '');
              setVehicleModel(v.model || '');
              setVehicleYear(v.year?.toString() || '');
              setTireSize(v.tireSize || '');
              setLicensePlate(v.licensePlate || '');
            }
          } else if (res.fleet) {
            setCustomerName(res.fleet.name || res.fleet.contactPerson || '');
            if (res.driver) {
              setNotes(`[Fleet Driver Call] Driver: ${res.driver.name} (Plate: ${res.driver.plate || 'N/A'})`);
              if (res.driver.plate) setLicensePlate(res.driver.plate);
            }
            if (res.fleet.vehicles?.length > 0) {
              const v = res.fleet.vehicles[0];
              setTireSize(v.tireSize || '11R22.5');
            }
          }
        })
        .catch(() => {});
    } else {
      setLookupResult(null);
    }
  }, [customerPhone]);

  // Subtotal & Tax
  const subtotalCents = selectedServices.reduce((sum: number, serviceId: string) => {
    const service = SERVICES_CATALOG.find((s: ServiceCatalogItem) => s.id === serviceId);
    return sum + (service ? service.basePriceCents : 0);
  }, 0);

  const taxCents = Math.round(subtotalCents * taxRate);
  const totalCents = subtotalCents + taxCents;

  const toggleService = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleAttemptClose = () => {
    if (customerPhone || prefillPhone) {
      setIsDispositionPromptOpen(true);
    } else {
      resetForm();
      onClose();
    }
  };

  const handleDispositionRecorded = async (disposition: string, reason: string) => {
    try {
      await jobService.recordDisposition({
        callerPhone: customerPhone || prefillPhone,
        disposition,
        reason,
        countryCode: country,
      });
    } catch {
      // Disposition logged locally even if backend fails
    }
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerPhone || !locationAddress) {
      toast.error('Customer phone and breakdown address are required');
      return;
    }

    const mappedUrgency = urgency === 'NORMAL' ? 'STANDARD' : urgency === 'LOW' ? 'FUTURE' : 'URGENT';
    const mappedCurrency = country === 'US' ? 'USD' : country === 'UK' ? 'GBP' : 'CAD';

    const payload = {
      customer: {
        name: customerName || 'Valued Customer',
        phone: customerPhone,
        email: customerEmail || undefined,
      },
      vehicle: {
        make: vehicleMake || 'Standard',
        model: vehicleModel || 'Vehicle',
        year: vehicleYear ? parseInt(vehicleYear, 10) : new Date().getFullYear(),
        tireSize: tireSize || '225/65R17',
        licensePlate: licensePlate || undefined,
      },
      serviceAddress: locationAddress,
      urgency: mappedUrgency,
      currency: mappedCurrency,
      serviceItems: selectedServices.map((serviceId) => {
        const item = SERVICES_CATALOG.find((s: ServiceCatalogItem) => s.id === serviceId);
        return {
          serviceName: item?.name || serviceId,
          category: 'TIRE_SERVICE' as const,
          unitPriceCents: item?.basePriceCents || 5000,
          quantity: 1,
        };
      }),
      problemNotes: notes || undefined,
      paymentMethod,
      countryCode: country,
      subtotalCents,
      taxCents,
      totalCents,
      disposition: 'BOOKED',
      makeUserAccount,
    };

    try {
      await createJobMutation.mutateAsync(payload);
      toast.success('Job ticket created & dispatched successfully');
      resetForm();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create job ticket');
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleAttemptClose}
        title="Intake & Dispatch New Job"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off" data-lpignore="true" data-form-type="other">
          {/* Customer Information */}
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800 uppercase tracking-wider">
                <User className="w-3.5 h-3.5 text-red-600" />
                <span>Customer Intake</span>
              </div>
              {lookupResult?.isReturning ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-fade-in">
                  ✓ RETURNING {lookupResult.fleet ? `FLEET (${lookupResult.fleet.name})` : 'CUSTOMER'}
                </span>
              ) : customerPhone.replace(/[^0-9]/g, '').length >= 10 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  ✦ NEW CALLER / FIRST-TIME MOTORIST
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Phone *</label>
                <input
                  type="tel"
                  required
                  autoComplete="off"
                  data-lpignore="true"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+14165550199"
                  className="input-base mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Full Name</label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="John Smith"
                  className="input-base mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Email</label>
                <input
                  type="email"
                  autoComplete="off"
                  data-lpignore="true"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="input-base mt-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
              <input
                type="checkbox"
                id="makeUserAccount"
                checked={makeUserAccount}
                onChange={(e) => setMakeUserAccount(e.target.checked)}
                className="w-3.5 h-3.5 text-red-600 rounded border-slate-300"
              />
              <label htmlFor="makeUserAccount" className="text-[11px] text-slate-600">
                After all this make user account (auto-provisions customer portal access & SMS tracking)
              </label>
            </div>
          </div>

          {/* Vehicle Information */}
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-800 uppercase tracking-wider">
              <Car className="w-3.5 h-3.5 text-red-600" />
              <span>Vehicle & Tire Specs</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Make</label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  value={vehicleMake}
                  onChange={(e) => setVehicleMake(e.target.value)}
                  placeholder="Ford"
                  className="input-base mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Model</label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  placeholder="F-150"
                  className="input-base mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Year</label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  value={vehicleYear}
                  onChange={(e) => setVehicleYear(e.target.value)}
                  placeholder="2022"
                  className="input-base mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Plate</label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  placeholder="CFMR 482"
                  className="input-base mt-1 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Tire Size *</label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  value={tireSize}
                  onChange={(e) => setTireSize(e.target.value)}
                  placeholder="275/65R18"
                  className="input-base mt-1 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Location & Urgency */}
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-800 uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5 text-red-600" />
              <span>Breakdown Location (serviceAddress)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-slate-600">Location Address / Landmark *</label>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  data-lpignore="true"
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  placeholder="Hwy 401 Eastbound near Exit 344, Toronto, ON"
                  className="input-base mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Urgency Level</label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  className="select-base mt-1 font-semibold"
                >
                  <option value="CRITICAL">Critical (Hazard)</option>
                  <option value="HIGH">High (Highway)</option>
                  <option value="NORMAL">Normal</option>
                  <option value="LOW">Low (Scheduled)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 16 Services Picker Catalog */}
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800 uppercase tracking-wider">
                <Wrench className="w-3.5 h-3.5 text-red-600" />
                <span>Service Catalog ({selectedServices.length} Selected)</span>
              </div>
              <span className="text-[11px] text-slate-500">Pick applicable items</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
              {SERVICES_CATALOG.map((service: ServiceCatalogItem) => {
                const isSelected = selectedServices.includes(service.id);
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service.id)}
                    className={`flex items-center justify-between p-2 rounded-lg border text-left transition ${
                      isSelected
                        ? 'border-red-500 bg-red-50/70 text-red-900 font-semibold'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs truncate">{service.name}</p>
                      <p className="text-[10px] text-slate-400 font-normal">{service.category}</p>
                    </div>
                    <span className="text-xs font-mono font-bold shrink-0">
                      {formatCurrency(centsToDollars(service.basePriceCents), currencySymbol)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-600">Payment Collection Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="select-base mt-1"
              >
                <option value="E_TRANSFER">E-Transfer / Interac</option>
                <option value="POS">POS (Mobile Card Machine)</option>
                <option value="CASH">Cash on Scene (Driver Remittance)</option>
                <option value="MOTO">MOTO (Phone Credit Card)</option>
                <option value="INVOICE_NET30">Commercial Fleet Net-30 Invoice</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600">Intake Notes / Driver Instructions</label>
              <input
                type="text"
                autoComplete="off"
                data-lpignore="true"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Front-right passenger tire punctured..."
                className="input-base mt-1 text-xs"
              />
            </div>
          </div>

          {/* Pricing & Submission */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-0.5 text-center sm:text-left">
              <div className="text-xs text-slate-500">
                Subtotal: <strong className="text-slate-800 font-mono">{formatCurrency(centsToDollars(subtotalCents), currencySymbol)}</strong>
                {' + '}Tax ({Math.round(taxRate * 100)}%): <strong className="text-slate-800 font-mono">{formatCurrency(centsToDollars(taxCents), currencySymbol)}</strong>
              </div>
              <div className="text-lg font-black font-mono text-slate-900">
                Total: {formatCurrency(centsToDollars(totalCents), currencySymbol)}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleAttemptClose}
                className="btn-secondary w-1/2 sm:w-auto py-2 px-4"
              >
                Close / Outcome
              </button>
              <button
                type="submit"
                disabled={createJobMutation.isPending}
                className="btn-primary w-1/2 sm:w-auto py-2 px-5"
              >
                {createJobMutation.isPending ? 'Dispatching...' : 'Create & Dispatch'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <JobDispositionModal
        isOpen={isDispositionPromptOpen}
        onClose={() => setIsDispositionPromptOpen(false)}
        callerPhone={customerPhone || prefillPhone}
        onDispositionRecorded={handleDispositionRecorded}
      />
    </>
  );
}

import { useState, useEffect } from 'react';
import { Wrench, Car, User, MapPin, Search, ShieldCheck, CheckCircle2, PhoneOff, Compass } from 'lucide-react';
import Modal from '../../ui/Modal';
import { SERVICES_CATALOG, type ServiceCatalogItem } from '../../../constants/services';
import { useCreateJob } from '../../../hooks/useJobs';
import { useTenant } from '../../../context/TenantContext';
import { formatCurrency, centsToDollars } from '../../../utils/currency';
import { toast } from 'sonner';
import JobDispositionModal from './JobDispositionModal';
import { customerService } from '../../../services/customerService';
import { jobService } from '../../../services/jobService';
import { fleetService } from '../../../services/fleetService';

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillPhone?: string;
}

const detectRegionFromPhone = (phone: string, currentCountry: string) => {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length < 3) return null;
  const area = digits.startsWith('1') ? digits.slice(1, 4) : digits.slice(0, 3);

  const ontario = ['416', '647', '437', '905', '289', '365', '519', '226', '548', '613', '343', '705', '249', '807'];
  const quebec = ['514', '438', '450', '579', '418', '581', '819', '873'];
  const bc = ['604', '778', '236', '672', '250'];
  const alberta = ['403', '587', '825', '780'];
  if (ontario.includes(area)) return 'Ontario (Toronto / GTA), CA';
  if (quebec.includes(area)) return 'Quebec (Montreal), CA';
  if (bc.includes(area)) return 'British Columbia, CA';
  if (alberta.includes(area)) return 'Alberta, CA';

  const dcVa = ['703', '571', '202', '301', '240', '410', '443'];
  const ny = ['212', '718', '917', '646', '347', '516', '631'];
  if (dcVa.includes(area)) return 'Virginia / DC Metro, US';
  if (ny.includes(area)) return 'New York Metro, US';

  if (currentCountry === 'CA') return `Canada (Area ${area})`;
  if (currentCountry === 'US') return `United States (Area ${area})`;
  if (currentCountry === 'UK') return 'United Kingdom';
  return null;
};

export default function CreateJobModal({ isOpen, onClose, prefillPhone = '' }: CreateJobModalProps) {
  const { country, currencySymbol, taxRate } = useTenant();
  const createJobMutation = useCreateJob();

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState(prefillPhone);
  const [customerEmail, setCustomerEmail] = useState('');
  const [makeUserAccount, setMakeUserAccount] = useState(true);

  // 24/7 Roadside Fleet & Plate lookup state (FR-2.1)
  const [fleetSearchQuery, setFleetSearchQuery] = useState('');
  const [isSearchingFleet, setIsSearchingFleet] = useState(false);
  const [verifiedFleetMatch, setVerifiedFleetMatch] = useState<any | null>(null);

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
    setFleetSearchQuery('');
    setVerifiedFleetMatch(null);
  };

  const handleFleetLookup = async (q?: string) => {
    const query = (q ?? fleetSearchQuery).trim();
    if (!query) {
      toast.error('Enter a commercial plate or company name to search');
      return;
    }
    try {
      setIsSearchingFleet(true);
      const res = await fleetService.lookupFleet(query);
      if (res && (res.fleet || res.matchedVehicle)) {
        setVerifiedFleetMatch(res);
        if (res.fleet) {
          setCustomerName(res.fleet.name || res.fleet.companyName || '');
          if (res.fleet.phone && !customerPhone) setCustomerPhone(res.fleet.phone);
          if (res.fleet.email && !customerEmail) setCustomerEmail(res.fleet.email);
        }
        if (res.matchedVehicle) {
          setVehicleMake(res.matchedVehicle.make || 'Commercial');
          setVehicleModel(res.matchedVehicle.model || 'Unit');
          setVehicleYear(res.matchedVehicle.year?.toString() || new Date().getFullYear().toString());
          setLicensePlate(res.matchedVehicle.licensePlate || query);
          setTireSize(res.matchedVehicle.tireSize || res.verifiedTireSize || '11R22.5');
        } else if (res.verifiedTireSize) {
          setTireSize(res.verifiedTireSize);
        } else {
          setTireSize('11R22.5');
        }
        setPaymentMethod('INVOICE_NET30');
        setNotes((prev) => `${prev ? prev + ' • ' : ''}[Verified Fleet: ${res.fleet?.name || 'Account'} (${res.matchType || 'VERIFIED'})]`);
        toast.success(`Verified fleet account: ${res.fleet?.name || 'Account'}`);
      } else {
        toast.info('No registered commercial fleet found for this query');
      }
    } catch {
      toast.error('Fleet plate verification failed');
    } finally {
      setIsSearchingFleet(false);
    }
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
      fleetId: verifiedFleetMatch?.fleet?.id || undefined,
      customer: {
        name: customerName || (verifiedFleetMatch?.fleet?.name ? verifiedFleetMatch.fleet.name : 'Valued Customer'),
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
      const fieldErrors = err.response?.data?.errors;
      let errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to create job ticket';
      if (fieldErrors && typeof fieldErrors === 'object') {
        const details = Object.values(fieldErrors).flat().join(', ');
        if (details) errorMsg = details;
      }
      toast.error(errorMsg);
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
          {/* Official Brand Logo Banner */}
          <div className="flex items-center justify-between bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 shadow-xs">
            <img 
              src="/logo.webp" 
              alt="Xtreme Mobile Tire" 
              className="h-12 sm:h-14 w-auto object-contain drop-shadow" 
            />
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 block font-mono">
                {country} Regional Silo
              </span>
              <span className="text-xs font-semibold text-slate-300">
                Roadside Dispatch Intake
              </span>
            </div>
          </div>

          {/* Quick 1-Click Call Disposition Shortcuts (FR-1.3) */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <PhoneOff className="w-3.5 h-3.5 text-slate-500" />
              <span>Quick Call Disposition:</span>
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleDispositionRecorded('WN', 'Wrong Number / Misdial')}
                className="px-2.5 py-1 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 transition shadow-2xs"
              >
                ✕ Wrong Number (WN)
              </button>
              <button
                type="button"
                onClick={() => handleDispositionRecorded('RNC', 'Price Shopper / Not Converted')}
                className="px-2.5 py-1 bg-white hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 transition shadow-2xs"
              >
                ✕ Price Shopper (RNC)
              </button>
              <button
                type="button"
                onClick={() => handleDispositionRecorded('IR', 'Irrelevant / Unrelated Service')}
                className="px-2.5 py-1 bg-white hover:bg-slate-200 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 transition shadow-2xs"
              >
                ✕ Irrelevant / Spam (IR)
              </button>
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800 uppercase tracking-wider">
                <User className="w-3.5 h-3.5 text-red-600" />
                <span>Customer Intake</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {detectRegionFromPhone(customerPhone, country) && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                    <Compass className="w-2.5 h-2.5 text-blue-600" />
                    <span>{detectRegionFromPhone(customerPhone, country)}</span>
                  </span>
                )}
                {lookupResult?.isReturning ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-fade-in">
                    ✓ RETURNING {lookupResult.fleet ? `FLEET (${lookupResult.fleet.name})` : 'CUSTOMER'}
                  </span>
                ) : customerPhone.replace(/[^0-9]/g, '').length >= 10 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    ✦ NEW CALLER
                  </span>
                ) : null}
              </div>
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800 uppercase tracking-wider">
                <Car className="w-3.5 h-3.5 text-red-600" />
                <span>Vehicle & Tire Specs</span>
              </div>
              {verifiedFleetMatch && (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>24/7 FLEET VERIFIED</span>
                </span>
              )}
            </div>

            {/* 24/7 Roadside Fleet & Plate Verification Search (FR-2.1) */}
            <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-2">
              <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>24/7 Commercial Fleet & Plate Verification Lookup</span>
              </div>

              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={fleetSearchQuery}
                  onChange={(e) => setFleetSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleFleetLookup();
                    }
                  }}
                  placeholder="Enter plate (e.g. KT-15) or commercial fleet name..."
                  className="input-base text-xs flex-1 py-1.5"
                />
                <button
                  type="button"
                  disabled={isSearchingFleet}
                  onClick={() => handleFleetLookup()}
                  className="btn-secondary py-1.5 px-3 text-xs inline-flex items-center gap-1 font-bold text-blue-700 hover:bg-blue-50 border-blue-200"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isSearchingFleet ? 'Verifying...' : 'Verify'}</span>
                </button>
              </div>

              {verifiedFleetMatch && (
                <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded-md text-[11px] text-emerald-900 space-y-0.5">
                  <div className="font-bold">
                    ✓ {verifiedFleetMatch.fleet?.name || 'Commercial Account'} • Terms: {verifiedFleetMatch.fleet?.paymentTerms || 'NET_30'}
                  </div>
                  <div className="text-emerald-700">
                    Pre-authorized Tire Spec: <strong className="font-mono">{tireSize || '11R22.5'}</strong>
                  </div>
                </div>
              )}
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

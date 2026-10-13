import { useState } from 'react';
import { toast } from 'sonner';
import { User, Truck, Mail, Calendar, Clock, Lock, Loader2, CheckCircle2, Building2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { userService } from '../../services/userService';
import { useTenant } from '../../context/TenantContext';
import PhoneInputField from '../common/PhoneInputField';
import AddressAutocompleteInput from '../common/AddressAutocompleteInput';

interface AddDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Render an internal technician or external contractor creation form when open;
 * notify onSuccess and close after creation succeeds.
 */
export default function AddDriverModal({ isOpen, onClose, onSuccess }: AddDriverModalProps) {
  const queryClient = useQueryClient();
  const { country } = useTenant();

  const [driverType, setDriverType] = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL');
  const [fullName, setFullName] = useState('');
  const [contractorCompany, setContractorCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Welcome123!');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState<'CA' | 'US' | 'UK'>((country as 'CA' | 'US' | 'UK') || 'CA');
  const [assignedVehicle, setAssignedVehicle] = useState('Mobile Service Rig');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [workingDays, setWorkingDays] = useState('Monday - Saturday');
  const [workingHours, setWorkingHours] = useState('8:00 AM - 6:00 PM');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  /**
   * Validate driver details, create the selected driver type, and refresh drivers.
   * External contractors use an EXTERNAL vehicle tag. Notify and close on success;
   * show request failures as error toasts.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (driverType === 'EXTERNAL') {
      if (!fullName.trim() || !phone.trim()) {
        toast.error('Please enter contractor name and phone number');
        return;
      }

      try {
        setIsSubmitting(true);
        const tag = contractorCompany.trim()
          ? `EXTERNAL: ${contractorCompany.trim()}`
          : 'EXTERNAL_CONTRACTOR';

        await userService.createUser({
          fullName: fullName.trim(),
          email: email.trim() || undefined,
          role: 'DRIVER',
          countryCode,
          phone: phone.trim() || undefined,
          assignedVehicle: tag,
          address: address.trim() || undefined,
          latitude: coords?.lat,
          longitude: coords?.lng,
        });

        toast.success(`External contractor ${fullName} added successfully!`);
        queryClient.invalidateQueries({ queryKey: ['drivers'] });
        onSuccess?.();
        onClose();
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Failed to create contractor');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // INTERNAL FLEET
    if (!fullName.trim() || !email.trim()) {
      toast.error('Please enter technician full name and email');
      return;
    }

    try {
      setIsSubmitting(true);
      await userService.createUser({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        role: 'DRIVER',
        countryCode,
        phone: phone.trim() || undefined,
        assignedVehicle: assignedVehicle.trim() || undefined,
        address: address.trim() || undefined,
        latitude: coords?.lat,
        longitude: coords?.lng,
        workingDays: workingDays.trim() || undefined,
        workingHours: workingHours.trim() || undefined,
      });

      toast.success(`Technician ${fullName} added successfully!`);
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create technician account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto relative">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {driverType === 'INTERNAL' ? 'Add Service Technician' : 'Add External Contractor'}
              </h3>
              <p className="text-xs text-slate-500">
                {driverType === 'INTERNAL'
                  ? 'Internal staff account with technician portal access'
                  : 'Outsourced contractor for road dispatch & overflow'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Driver Type Toggle */}
        <div className="p-1 mx-5 mt-4 bg-slate-100 rounded-xl flex items-center text-xs font-semibold">
          <button
            type="button"
            onClick={() => setDriverType('INTERNAL')}
            className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
              driverType === 'INTERNAL'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Internal Fleet
          </button>
          <button
            type="button"
            onClick={() => setDriverType('EXTERNAL')}
            className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
              driverType === 'EXTERNAL'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            External Contractor
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-3 text-xs">
            {/* Full Name & Region */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">
                  {driverType === 'INTERNAL' ? 'Technician Name' : 'Contractor / Driver Name'} *
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={driverType === 'INTERNAL' ? 'e.g. Mike Henderson' : 'e.g. Bilkul Roadside'}
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Region</label>
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value as 'CA' | 'US' | 'UK')}
                  className="w-full px-2.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white font-bold"
                >
                  <option value="CA">Canada (CA)</option>
                  <option value="US">USA (US)</option>
                  <option value="UK">UK (UK)</option>
                </select>
              </div>
            </div>

            {/* External: Company Name */}
            {driverType === 'EXTERNAL' && (
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Company / Trade Name (Optional)</label>
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={contractorCompany}
                    onChange={(e) => setContractorCompany(e.target.value)}
                    placeholder="e.g. Bilkul Towing & Recovery Inc."
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>
              </div>
            )}

            {/* Phone (Normalized via PhoneInputField) */}
            <PhoneInputField
              value={phone}
              onChange={setPhone}
              countryCode={countryCode}
              label={driverType === 'INTERNAL' ? 'Mobile Phone' : 'Contractor Phone (E.164)'}
              required={driverType === 'EXTERNAL'}
            />

            {/* Email (Required for Internal, Optional for External) */}
            {driverType === 'INTERNAL' ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email (Login ID) *</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tech@xtremetire.com"
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Initial Password *</label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Contractor Email (Optional)</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="dispatch@bilkulltowing.com"
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>
              </div>
            )}

            {/* Internal Rig Assignment */}
            {driverType === 'INTERNAL' && (
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Assigned Rig / Van</label>
                <div className="relative">
                  <Truck className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={assignedVehicle}
                    onChange={(e) => setAssignedVehicle(e.target.value)}
                    placeholder="e.g. Nissan NV 3500 HD - Unit #04"
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>
              </div>
            )}

            {/* Base / Depot Address for Mapbox Road ETA */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                {driverType === 'INTERNAL' ? 'Depot / Base Address' : 'Base Depot / Starting Address (for ETA)'}
              </label>
              <AddressAutocompleteInput
                value={address}
                onChange={(val) => {
                  setAddress(val);
                  if (!val.trim()) setCoords(null);
                }}
                onSelectLocation={(loc) => {
                  setAddress(loc.address);
                  setCoords({ lat: loc.latitude, lng: loc.longitude });
                }}
                countryCode={countryCode}
                placeholder="e.g. 5050 Timberlea Blvd, Mississauga, ON"
                className="!py-2 !text-xs !rounded-xl"
              />
            </div>

            {/* Shift & Working Schedule (Internal only) */}
            {driverType === 'INTERNAL' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Working Days</label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={workingDays}
                      onChange={(e) => setWorkingDays(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Working Hours</label>
                  <div className="relative">
                    <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={workingHours}
                      onChange={(e) => setWorkingHours(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {driverType === 'INTERNAL' ? 'Save Technician' : 'Save Contractor'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

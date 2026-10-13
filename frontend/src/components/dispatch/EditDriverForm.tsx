import { useState } from 'react';
import { toast } from 'sonner';
import { User, Truck, Calendar, Clock, Loader2, CheckCircle2, Building2 } from 'lucide-react';
import { userService, type UserItem } from '../../services/userService';
import PhoneInputField from '../common/PhoneInputField';
import AddressAutocompleteInput from '../common/AddressAutocompleteInput';

interface EditDriverFormProps {
  driver: UserItem;
  onSuccess: (updatedDriver: UserItem) => void;
  onCancel: () => void;
}

/**
 * Inline edit form for driver and contractor profiles.
 * Normalizes phone numbers with PhoneInputField and resolves street addresses with Mapbox autocomplete.
 */
export default function EditDriverForm({
  driver,
  onSuccess,
  onCancel,
}: EditDriverFormProps) {
  const isExternal =
    driver.assignedVehicle === 'EXTERNAL_CONTRACTOR' ||
    driver.assignedVehicle?.startsWith('EXTERNAL');

  // Extract company name if external
  const initialCompany = isExternal
    ? driver.assignedVehicle?.replace(/^EXTERNAL:\s*/, '') || ''
    : '';

  const [fullName, setFullName] = useState(driver.fullName || '');
  const [phone, setPhone] = useState(driver.phone || '');
  const [contractorCompany, setContractorCompany] = useState(
    initialCompany === 'EXTERNAL_CONTRACTOR' ? '' : initialCompany
  );
  const [assignedVehicle, setAssignedVehicle] = useState(
    isExternal ? '' : (driver.assignedVehicle || 'Mobile Service Rig')
  );
  const [address, setAddress] = useState(driver.address || '');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    driver.latitude && driver.longitude
      ? { lat: driver.latitude, lng: driver.longitude }
      : null
  );
  const [workingDays, setWorkingDays] = useState(driver.workingDays || 'Monday - Saturday');
  const [workingHours, setWorkingHours] = useState(driver.workingHours || '8:00 AM - 6:00 PM');
  const [countryCode, setCountryCode] = useState<'CA' | 'US' | 'UK'>(
    (driver.countryCode as 'CA' | 'US' | 'UK') || 'CA'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error('Driver name is required');
      return;
    }

    try {
      setIsSubmitting(true);

      let finalVehicle = assignedVehicle.trim();
      if (isExternal) {
        finalVehicle = contractorCompany.trim()
          ? `EXTERNAL: ${contractorCompany.trim()}`
          : 'EXTERNAL_CONTRACTOR';
      }

      const payload: Partial<UserItem> = {
        fullName: fullName.trim(),
        countryCode,
        phone: phone.trim() || undefined,
        assignedVehicle: finalVehicle || undefined,
        address: address.trim() || undefined,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        workingDays: !isExternal ? (workingDays.trim() || undefined) : undefined,
        workingHours: !isExternal ? (workingHours.trim() || undefined) : undefined,
      };

      const updated = await userService.updateUser(driver.id, payload);
      toast.success(`Profile for ${fullName} updated successfully!`);
      onSuccess(updated);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update driver details');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Header Badge */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            {isExternal ? 'Editing External Contractor' : 'Editing Internal Technician'}
          </span>
          <span className="text-xs font-semibold text-slate-700">{driver.email}</span>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200 bg-slate-50 text-slate-600">
          ID: {driver.id.slice(0, 8)}
        </span>
      </div>

      {/* Full Name & Region */}
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <label className="font-semibold text-slate-700 block mb-1 text-xs">
            {isExternal ? 'Contractor / Driver Name' : 'Technician Name'} *
          </label>
          <div className="relative">
            <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Mike Henderson"
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white font-medium"
            />
          </div>
        </div>
        <div>
          <label className="font-semibold text-slate-700 block mb-1 text-xs">Region</label>
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value as 'CA' | 'US' | 'UK')}
            className="w-full px-2.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white font-bold text-slate-800"
          >
            <option value="CA">Canada (CA)</option>
            <option value="US">USA (US)</option>
            <option value="UK">UK (UK)</option>
          </select>
        </div>
      </div>

      {/* External: Trade / Company Name */}
      {isExternal && (
        <div>
          <label className="font-semibold text-slate-700 block mb-1 text-xs">
            Company / Trade Name (Optional)
          </label>
          <div className="relative">
            <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={contractorCompany}
              onChange={(e) => setContractorCompany(e.target.value)}
              placeholder="e.g. Bilkul Towing & Recovery Inc."
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white"
            />
          </div>
        </div>
      )}

      {/* Phone Number with Normalization */}
      <PhoneInputField
        value={phone}
        onChange={setPhone}
        countryCode={countryCode}
        label={isExternal ? 'Contractor Phone (E.164)' : 'Mobile Phone'}
        required={isExternal}
      />

      {/* Internal Rig Assignment */}
      {!isExternal && (
        <div>
          <label className="font-semibold text-slate-700 block mb-1 text-xs">Assigned Rig / Van</label>
          <div className="relative">
            <Truck className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={assignedVehicle}
              onChange={(e) => setAssignedVehicle(e.target.value)}
              placeholder="e.g. Nissan NV 3500 HD - Unit #04"
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white"
            />
          </div>
        </div>
      )}

      {/* Depot / Base Address with Mapbox Autocomplete */}
      <div>
        <label className="font-semibold text-slate-700 block mb-1 text-xs">
          {isExternal ? 'Base / Starting Address (for ETA)' : 'Depot / Base Address'}
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
          placeholder="Type street, intersection, or postal code..."
          className="!py-2 !text-xs !rounded-xl"
        />
        {coords && (
          <p className="text-[11px] font-mono text-emerald-600 mt-1">
            ✓ Coordinates mapped: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
          </p>
        )}
      </div>

      {/* Schedule for Internal Technicians */}
      {!isExternal && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="font-semibold text-slate-700 block mb-1 text-xs">Working Days</label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={workingDays}
                onChange={(e) => setWorkingDays(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white"
              />
            </div>
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1 text-xs">Working Hours</label>
            <div className="relative">
              <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Save Driver</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

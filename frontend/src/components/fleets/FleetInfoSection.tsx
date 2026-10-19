import { formatAsYouType, validateAndNormalizePhone } from '../../utils/phone';

export interface FleetFormData {
  companyName: string;
  contactPerson: string;
  fleetManager: string;
  ceoOwnerName: string;
  phone: string;
  altPhone: string;
  email: string;
  password?: string;
  poaEmail: string;
  address: string;
  website: string;
  numberOfUnits: string | number;
  customFleetCode: string;
  discountPercent: number;
  paymentTerms?: string;
  creditLimit?: string | number;
  contractTermYears?: string | number;
  contractStartDate?: string;
  contractEndDate?: string;
  governingProvince?: string;
  billingContactName?: string;
}

interface FleetInfoSectionProps {
  formData: FleetFormData;
  onChange: (field: keyof FleetFormData, value: any) => void;
  countryCode?: string;
}

export default function FleetInfoSection({ formData, onChange, countryCode = 'CA' }: FleetInfoSectionProps) {
  const normCountry = (countryCode || 'CA').toUpperCase();
  const phoneValidation = formData.phone ? validateAndNormalizePhone(formData.phone, normCountry) : null;
  return (
    <div className="space-y-3.5 text-xs">
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center justify-between">
          <span>Editable Commercial Details</span>
          <span className="text-[10px] text-emerald-700 font-semibold lowercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            auto-saved on convert
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Company Name *</label>
            <input
              type="text"
              required
              value={formData.companyName}
              onChange={(e) => onChange('companyName', e.target.value)}
              placeholder="e.g. Apex Freight Logistics"
              className="input-base"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Custom Fleet Code *</label>
            <input
              type="text"
              required
              value={formData.customFleetCode}
              onChange={(e) => onChange('customFleetCode', e.target.value)}
              placeholder="e.g. XMT-4501"
              className="input-base font-mono font-bold text-slate-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Primary Contact *</label>
            <input
              type="text"
              required
              value={formData.contactPerson}
              onChange={(e) => onChange('contactPerson', e.target.value)}
              placeholder="e.g. John Doe"
              className="input-base"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Fleet Manager</label>
            <input
              type="text"
              value={formData.fleetManager}
              onChange={(e) => onChange('fleetManager', e.target.value)}
              placeholder="e.g. Marcus Vance"
              className="input-base"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">CEO / Owner Name</label>
            <input
              type="text"
              value={formData.ceoOwnerName}
              onChange={(e) => onChange('ceoOwnerName', e.target.value)}
              placeholder="e.g. Robert Hayes"
              className="input-base"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Primary Phone *</span>
              <span className="text-[10px] font-mono text-slate-400">Dial: {normCountry === 'UK' ? '+44 (UK)' : '+1 (' + normCountry + ')'}</span>
            </label>
            <div className={`relative flex rounded-xl border transition-all overflow-hidden bg-white ${
              formData.phone && phoneValidation && !phoneValidation.isValid
                ? 'border-red-400 focus-within:ring-2 focus-within:ring-red-500/20'
                : 'border-slate-200 focus-within:ring-2 focus-within:ring-red-500/20'
            }`}>
              <span className="inline-flex items-center px-2.5 text-xs font-mono font-bold text-slate-600 bg-slate-50 border-r border-slate-200 select-none">
                {normCountry === 'UK' ? '+44' : '+1'}
              </span>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => onChange('phone', formatAsYouType(e.target.value, normCountry))}
                placeholder={normCountry === 'UK' ? '7123 456789' : '(416) 555-0100'}
                className="w-full px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
              />
            </div>
            {formData.phone && phoneValidation && !phoneValidation.isValid && (
              <p className="text-[10px] text-red-600 mt-0.5 font-medium">{phoneValidation.error}</p>
            )}
            {formData.phone && phoneValidation && phoneValidation.isValid && (
              <p className="text-[10px] text-emerald-600 mt-0.5 font-mono font-semibold">✓ {phoneValidation.normalized}</p>
            )}
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Alternate Phone</span>
              <span className="text-[10px] font-mono text-slate-400">Dial: {normCountry === 'UK' ? '+44 (UK)' : '+1 (' + normCountry + ')'}</span>
            </label>
            <div className="relative flex rounded-xl border border-slate-200 overflow-hidden bg-white focus-within:ring-2 focus-within:ring-red-500/20">
              <span className="inline-flex items-center px-2.5 text-xs font-mono font-bold text-slate-600 bg-slate-50 border-r border-slate-200 select-none">
                {normCountry === 'UK' ? '+44' : '+1'}
              </span>
              <input
                type="tel"
                value={formData.altPhone}
                onChange={(e) => onChange('altPhone', formatAsYouType(e.target.value, normCountry))}
                placeholder={normCountry === 'UK' ? '7123 456789' : '(416) 555-0199'}
                className="w-full px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Portal Login Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => onChange('email', e.target.value)}
              placeholder="manager@company.com"
              className="input-base"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">Used by Fleet Manager to sign in</p>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Fleet Manager Password</label>
            <input
              type="password"
              autoComplete="new-password"
              value={formData.password || ''}
              onChange={(e) => onChange('password', e.target.value)}
              placeholder="Set manager password..."
              className="input-base font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">Leave blank to auto-generate</p>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Billing / Invoices Email</label>
            <input
              type="email"
              value={formData.poaEmail}
              onChange={(e) => onChange('poaEmail', e.target.value)}
              placeholder="invoices@company.com"
              className="input-base"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">Accounts payable & invoices routing</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Depot / Yard Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => onChange('address', e.target.value)}
              placeholder="e.g. 70 Steeles Ave E, Brampton, ON"
              className="input-base"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Website</label>
            <input
              type="text"
              value={formData.website}
              onChange={(e) => onChange('website', e.target.value)}
              placeholder="e.g. www.apexlogistics.ca"
              className="input-base"
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
          Contract & Commercial Billing Terms
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payment Terms</label>
            <select
              value={formData.paymentTerms || 'NET_30'}
              onChange={(e) => onChange('paymentTerms', e.target.value)}
              className="select-base"
            >
              <option value="DUE_ON_RECEIPT">Due on Receipt (Credit Card)</option>
              <option value="NET_7">Net 7 Days</option>
              <option value="NET_15">Net 15 Days</option>
              <option value="NET_30">Net 30 Days (Standard Invoice)</option>
              <option value="NET_60">Net 60 Days</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Credit Limit ($)</label>
            <input
              type="number"
              min="0"
              value={formData.creditLimit ?? '5000'}
              onChange={(e) => onChange('creditLimit', e.target.value)}
              placeholder="5000"
              className="input-base font-mono"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Contract Discount %</label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.discountPercent}
              onChange={(e) => onChange('discountPercent', Number(e.target.value))}
              placeholder="0"
              className="input-base font-mono"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Contract Term</label>
            <select
              value={formData.contractTermYears || ''}
              onChange={(e) => onChange('contractTermYears', e.target.value ? Number(e.target.value) : undefined)}
              className="select-base"
            >
              <option value="">Select term...</option>
              <option value="1">1 Year</option>
              <option value="3">3 Years</option>
              <option value="5">5 Years</option>
              <option value="10">10 Years</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Governing Province / State</label>
            <input
              type="text"
              value={formData.governingProvince || ''}
              onChange={(e) => onChange('governingProvince', e.target.value)}
              placeholder="e.g. Ontario"
              className="input-base"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Billing Contact Name</label>
            <input
              type="text"
              value={formData.billingContactName || ''}
              onChange={(e) => onChange('billingContactName', e.target.value)}
              placeholder="e.g. John Doe"
              className="input-base"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Contract Start Date</label>
            <input
              type="date"
              value={formData.contractStartDate || ''}
              onChange={(e) => onChange('contractStartDate', e.target.value)}
              className="input-base font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Contract End Date</label>
            <input
              type="date"
              value={formData.contractEndDate || ''}
              onChange={(e) => onChange('contractEndDate', e.target.value)}
              className="input-base font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

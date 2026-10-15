import { useState } from 'react';
import Modal from '../ui/Modal';
import PhoneInputField from '../common/PhoneInputField';
import { useCreateCustomer } from '../../hooks/useCustomers';
import { toast } from 'sonner';
import { validateAndNormalizePhone } from '../../utils/phone';

import { useTenant } from '../../context/TenantContext';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddCustomerModal({ isOpen, onClose }: AddCustomerModalProps) {
  const { country } = useTenant();
  const createCustomerMutation = useCreateCustomer();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [customerType, setCustomerType] = useState<'RETAIL' | 'MEMBERSHIP'>('RETAIL');
  const [membershipTier, setMembershipTier] = useState<'STANDARD' | 'GOLD' | 'PLATINUM'>('STANDARD');
  const [membershipExpiresAt, setMembershipExpiresAt] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim();
    const cleanNotes = notes.trim();

    if (!cleanName || !cleanPhone) {
      toast.error('Full name and phone number are required');
      return;
    }

    const phoneValidation = validateAndNormalizePhone(cleanPhone, country);
    if (!phoneValidation.isValid) {
      toast.error(phoneValidation.error || 'Please enter a valid phone number');
      return;
    }

    try {
      await createCustomerMutation.mutateAsync({
        fullName: cleanName,
        phone: phoneValidation.normalized,
        email: cleanEmail || undefined,
        address: address.trim() || undefined,
        notes: cleanNotes || undefined,
        customerType,
        membershipTier: customerType === 'MEMBERSHIP' ? membershipTier : undefined,
        membershipExpiresAt: customerType === 'MEMBERSHIP' && membershipExpiresAt ? new Date(membershipExpiresAt).toISOString() : undefined,
        countryCode: country,
      });
      toast.success('Customer profile added successfully');
      onClose();
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setCustomerType('RETAIL');
      setMembershipTier('STANDARD');
      setMembershipExpiresAt('');
      setNotes('');
    } catch (err: any) {
      const fieldErrors = err.response?.data?.errors;
      let errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to create customer';
      if (fieldErrors && typeof fieldErrors === 'object') {
        const details = Object.values(fieldErrors).flat().join(', ');
        if (details) errorMsg = details;
      }
      toast.error(errorMsg);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Customer Profile" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-700">Account Type *</label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              type="button"
              onClick={() => setCustomerType('RETAIL')}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer border ${
                customerType === 'RETAIL'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Retail Motorist
            </button>
            <button
              type="button"
              onClick={() => setCustomerType('MEMBERSHIP')}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer border ${
                customerType === 'MEMBERSHIP'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                  : 'bg-amber-50/50 text-amber-800 border-amber-200 hover:bg-amber-50'
              }`}
            >
              ★ Membership Plan
            </button>
          </div>
        </div>

        {customerType === 'MEMBERSHIP' && (
          <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-200 space-y-2.5">
            <div>
              <label className="text-[11px] font-bold text-amber-900 block">Membership Tier *</label>
              <select
                value={membershipTier}
                onChange={(e) => setMembershipTier(e.target.value as any)}
                className="input-base mt-1 text-xs font-semibold"
              >
                <option value="STANDARD">Standard Member</option>
                <option value="GOLD">Gold Member</option>
                <option value="PLATINUM">Platinum VIP Member</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-amber-900 block">Expiration Date</label>
              <input
                type="date"
                value={membershipExpiresAt}
                onChange={(e) => setMembershipExpiresAt(e.target.value)}
                className="input-base mt-1 text-xs font-mono"
              />
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-slate-700">Full Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            className="input-base mt-1"
          />
        </div>

        <PhoneInputField
          value={phone}
          onChange={setPhone}
          countryCode={country}
          label="Phone Number"
          required
        />

        <div>
          <label className="text-xs font-semibold text-slate-700">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
            className="input-base mt-1"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700">Home / Service Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. 123 Main St, Toronto, ON"
            className="input-base mt-1"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700">Notes</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="VIP client, prefers morning calls..."
            className="textarea-base mt-1"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-secondary px-3 py-1.5 text-xs">
            Cancel
          </button>
          <button
            type="submit"
            disabled={createCustomerMutation.isPending}
            className="btn-primary px-4 py-1.5 text-xs"
          >
            {createCustomerMutation.isPending ? 'Saving...' : 'Save Customer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

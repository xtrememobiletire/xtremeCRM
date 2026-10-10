import { useState } from 'react';
import Modal from '../ui/Modal';
import { useCreateCustomer } from '../../hooks/useCustomers';
import { toast } from 'sonner';
import { AlertTriangle, Check } from 'lucide-react';
import { formatAsYouType, validateAndNormalizePhone } from '../../utils/phone';

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
        notes: cleanNotes || undefined,
        countryCode: country,
      });
      toast.success('Customer profile added successfully');
      onClose();
      setName('');
      setPhone('');
      setEmail('');
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

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700">Phone Number *</label>
            <span className="text-[10px] font-mono text-slate-400">Regional Dial: {country === 'UK' ? '+44 (UK)' : country === 'US' ? '+1 (US)' : '+1 (CA)'}</span>
          </div>
          <div className={`relative flex rounded-xl border transition-all shadow-2xs overflow-hidden bg-white ${
            phone && !validateAndNormalizePhone(phone, country).isValid
              ? 'border-red-400 focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-500'
              : 'border-slate-200 focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-500'
          }`}>
            <span className="inline-flex items-center px-3 text-xs font-mono font-bold text-slate-600 bg-slate-50 border-r border-slate-200 select-none">
              {country === 'UK' ? '+44' : '+1'}
            </span>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(formatAsYouType(e.target.value, country))}
              placeholder={country === 'UK' ? '7123 456789' : '(416) 555-0182'}
              className="w-full px-3.5 py-2 text-sm rounded-r-xl font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
            />
          </div>
          {phone && !validateAndNormalizePhone(phone, country).isValid && (
            <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
              <AlertTriangle size={12} className="shrink-0" />
              <span>{validateAndNormalizePhone(phone, country).error}</span>
            </p>
          )}
          {phone && validateAndNormalizePhone(phone, country).isValid && (
            <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <Check size={12} className="shrink-0" />
              <span>Verified format: {validateAndNormalizePhone(phone, country).normalized}</span>
            </p>
          )}
        </div>

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

import { useState } from 'react';
import Modal from '../ui/Modal';
import { useCreateFleet } from '../../hooks/useFleets';
import { toast } from 'sonner';

interface AddFleetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddFleetModal({ isOpen, onClose }: AddFleetModalProps) {
  const createFleetMutation = useCreateFleet();
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('NET_30');
  const [creditLimit, setCreditLimit] = useState('5000');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName) {
      toast.error('Company name is required');
      return;
    }

    try {
      await createFleetMutation.mutateAsync({
        companyName,
        contactName: contactName || undefined,
        phone: phone || undefined,
        email: email || undefined,
        paymentTerms,
        creditLimitCents: creditLimit ? parseInt(creditLimit, 10) * 100 : undefined,
      });
      toast.success('Fleet account registered successfully');
      onClose();
      setCompanyName('');
      setContactName('');
      setPhone('');
      setEmail('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create fleet account');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Register New Fleet Account" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-700">Company Name *</label>
          <input
            type="text"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Apex Logistics Transport Inc."
            className="input-base mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold text-slate-700">Contact Manager</label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Robert Chen"
              className="input-base mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+14165550299"
              className="input-base mt-1 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700">Billing Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ap@apexlogistics.com"
            className="input-base mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold text-slate-700">Payment Terms</label>
            <select
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="select-base mt-1"
            >
              <option value="DUE_ON_RECEIPT">Due on Receipt</option>
              <option value="NET_15">Net 15 Days</option>
              <option value="NET_30">Net 30 Days</option>
              <option value="NET_60">Net 60 Days</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">Credit Limit ($)</label>
            <input
              type="number"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              placeholder="5000"
              className="input-base mt-1 font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-secondary px-3 py-1.5 text-xs">
            Cancel
          </button>
          <button
            type="submit"
            disabled={createFleetMutation.isPending}
            className="btn-primary px-4 py-1.5 text-xs"
          >
            {createFleetMutation.isPending ? 'Registering...' : 'Save Fleet Account'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

import { useState } from 'react';
import Modal from '../ui/Modal';
import { useCreateExpense } from '../../hooks/useAccounting';
import { useTenant } from '../../context/TenantContext';
import { toast } from 'sonner';

interface ExpenseStatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId?: string;
}

export default function ExpenseStatingModal({ isOpen, onClose, jobId }: ExpenseStatingModalProps) {
  const { country, currencySymbol } = useTenant();
  const createExpenseMutation = useCreateExpense();

  const [category, setCategory] = useState('FUEL');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [vendor, setVendor] = useState('');
  const [associatedJobId, setAssociatedJobId] = useState(jobId || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) {
      toast.error('Amount and description are required');
      return;
    }

    const amountCents = Math.round(parseFloat(amount) * 100);

    try {
      await createExpenseMutation.mutateAsync({
        category,
        description,
        amountCents,
        vendor: vendor || undefined,
        jobId: associatedJobId || undefined,
        country,
      });
      toast.success('Cost entry booked successfully');
      onClose();
      setDescription('');
      setAmount('');
      setVendor('');
    } catch (err: any) {
      toast.error('Failed to log expense');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Operational Expense / Job Cost" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-700">Cost Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="select-base mt-1 font-semibold"
          >
            <option value="FUEL">Fuel & Van Fill-up</option>
            <option value="TIRE_INVENTORY">Tire Inventory Wholesale</option>
            <option value="PARTS_SUPPLIES">Patch Kits & Consumables</option>
            <option value="SUBCONTRACTOR">Third-Party Towing / Flatbed</option>
            <option value="MAINTENANCE">Rig Maintenance & Tools</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700">Amount ({currencySymbol}) *</label>
          <input
            type="number"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="125.50"
            className="input-base mt-1 font-mono font-bold"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700">Description / Items *</label>
          <input
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Diesel fuel - Van #04 Shell Station"
            className="input-base mt-1"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700">Vendor / Supplier</label>
          <input
            type="text"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="Shell / Wholesale Tire Distributor"
            className="input-base mt-1"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700">Associate with Job ID (Optional)</label>
          <input
            type="text"
            value={associatedJobId}
            onChange={(e) => setAssociatedJobId(e.target.value)}
            placeholder="job-id-uuid"
            className="input-base mt-1 font-mono text-xs"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-secondary px-3 py-1.5 text-xs">
            Cancel
          </button>
          <button
            type="submit"
            disabled={createExpenseMutation.isPending}
            className="btn-primary px-4 py-1.5 text-xs"
          >
            {createExpenseMutation.isPending ? 'Recording...' : 'Book Expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

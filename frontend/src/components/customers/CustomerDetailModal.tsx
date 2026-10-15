import { useState, useEffect } from 'react';
import { 
  Phone, 
  Mail, 
  Car, 
  Wrench, 
  MapPin, 
  Calendar, 
  AlertCircle,
  Edit2,
  Save,
  X
} from 'lucide-react';
import Modal from '../ui/Modal';
import { formatCurrency, centsToDollars } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { useTenant } from '../../context/TenantContext';
import { useUpdateCustomer } from '../../hooks/useCustomers';
import { toast } from 'sonner';

interface VehicleItem {
  id: string;
  year: number;
  make: string;
  model: string;
  licensePlate?: string;
  tireSize?: string;
  createdAt?: string;
}

interface JobHistoryItem {
  id: string;
  jobCode?: string;
  jobNumber?: string;
  status: string;
  urgency?: string;
  totalCents?: number;
  serviceAddress?: string;
  createdAt: string;
  vehicle?: VehicleItem | null;
  problemNotes?: string;
}

interface CustomerDetailModalProps {
  customer: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomerDetailModal({
  customer,
  isOpen,
  onClose,
}: CustomerDetailModalProps) {
  const { currencySymbol } = useTenant();
  const updateCustomerMutation = useUpdateCustomer();
  const [activeTab, setActiveTab] = useState<'jobs' | 'vehicles'>('jobs');
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editCustomerType, setEditCustomerType] = useState<'RETAIL' | 'MEMBERSHIP'>('RETAIL');
  const [editMembershipTier, setEditMembershipTier] = useState<'STANDARD' | 'GOLD' | 'PLATINUM'>('STANDARD');
  const [editMembershipExpiresAt, setEditMembershipExpiresAt] = useState('');

  useEffect(() => {
    if (customer) {
      setEditName(customer.fullName || customer.name || '');
      setEditPhone(customer.phone || '');
      setEditEmail(customer.email || '');
      setEditAddress(customer.address || '');
      setEditNotes(customer.notes || '');
      setEditCustomerType(customer.customerType === 'MEMBERSHIP' ? 'MEMBERSHIP' : 'RETAIL');
      setEditMembershipTier(customer.membershipTier || 'STANDARD');
      setEditMembershipExpiresAt(customer.membershipExpiresAt ? customer.membershipExpiresAt.slice(0, 10) : '');
      setIsEditing(false);
    }
  }, [customer]);

  if (!customer) return null;

  const vehicles: VehicleItem[] = customer.vehicles || [];
  const jobs: JobHistoryItem[] = customer.jobs || [];
  const totalSpendCents = customer.totalSpendCents ?? jobs.reduce((sum, j) => sum + (j.totalCents || 0), 0);

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editPhone.trim()) {
      toast.error('Name and phone are required');
      return;
    }

    try {
      await updateCustomerMutation.mutateAsync({
        id: customer.id,
        payload: {
          fullName: editName.trim(),
          phone: editPhone.trim(),
          email: editEmail.trim() || null,
          address: editAddress.trim() || null,
          notes: editNotes.trim() || null,
          customerType: editCustomerType,
          membershipTier: editCustomerType === 'MEMBERSHIP' ? editMembershipTier : null,
          membershipExpiresAt: editCustomerType === 'MEMBERSHIP' && editMembershipExpiresAt ? new Date(editMembershipExpiresAt).toISOString() : null,
        },
      });
      toast.success('Customer profile updated successfully');
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update customer');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'IN_PROGRESS':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'ASSIGNED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Customer Profile: ${customer.fullName || customer.name || 'Valued Motorist'}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5">
        {/* Customer Header Stats Card */}
        <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-wrap items-center justify-between gap-4 border border-slate-800 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black tracking-tight text-white">
                {customer.fullName || customer.name || 'Valued Customer'}
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${
                customer.customerType === 'MEMBERSHIP'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                {customer.customerType === 'MEMBERSHIP'
                  ? `★ ${customer.membershipTier || 'STANDARD'} MEMBER`
                  : 'RETAIL MOTORIST'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300 font-mono">
              <span className="flex items-center gap-1">
                <Phone size={12} className="text-emerald-400" />
                <span>{customer.phone}</span>
              </span>
              {customer.email && (
                <span className="flex items-center gap-1 text-slate-400">
                  <Mail size={12} />
                  <span>{customer.email}</span>
                </span>
              )}
            </div>
            {customer.address && (
              <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-0.5">
                <MapPin size={11} className="text-slate-500" />
                <span>{customer.address}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right px-3 py-1.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Lifetime Spend</span>
              <strong className="text-sm font-black font-mono text-emerald-400">
                {formatCurrency(centsToDollars(totalSpendCents), currencySymbol)}
              </strong>
            </div>

            <div className="text-right px-3 py-1.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Jobs</span>
              <strong className="text-sm font-black font-mono text-white">
                {jobs.length}
              </strong>
            </div>

            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={`p-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border ${
                isEditing
                  ? 'bg-red-600/20 border-red-500/40 text-red-400 hover:bg-red-600/30'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
              title={isEditing ? 'Cancel Editing' : 'Edit Profile'}
            >
              {isEditing ? <X size={14} /> : <Edit2 size={14} />}
              <span>{isEditing ? 'Cancel' : 'Edit'}</span>
            </button>
          </div>
        </div>

        {/* Inline Edit Form */}
        {isEditing && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
            <div className="font-bold text-slate-900 text-xs">Edit Customer Details</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input-base"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="input-base font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="input-base"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Home / Service Address</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="input-base"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Account Type</label>
                <select
                  value={editCustomerType}
                  onChange={(e) => setEditCustomerType(e.target.value as any)}
                  className="input-base"
                >
                  <option value="RETAIL">Retail Motorist</option>
                  <option value="MEMBERSHIP">Membership Plan</option>
                </select>
              </div>

              {editCustomerType === 'MEMBERSHIP' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tier</label>
                    <select
                      value={editMembershipTier}
                      onChange={(e) => setEditMembershipTier(e.target.value as any)}
                      className="input-base"
                    >
                      <option value="STANDARD">Standard</option>
                      <option value="GOLD">Gold</option>
                      <option value="PLATINUM">Platinum</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Expiration</label>
                    <input
                      type="date"
                      value={editMembershipExpiresAt}
                      onChange={(e) => setEditMembershipExpiresAt(e.target.value)}
                      className="input-base font-mono"
                    />
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Notes</label>
              <textarea
                rows={2}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="textarea-base"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="btn-secondary px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={updateCustomerMutation.isPending}
                className="btn-primary px-4 py-1.5 flex items-center gap-1.5"
              >
                <Save size={13} />
                <span>{updateCustomerMutation.isPending ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('jobs')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'jobs'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Wrench size={13} />
            <span>Job History ({jobs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vehicles')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'vehicles'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Car size={13} />
            <span>Registered Vehicles ({vehicles.length})</span>
          </button>
        </div>

        {/* Tab 1: Job History */}
        {activeTab === 'jobs' && (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {jobs.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                <AlertCircle size={28} className="mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-bold text-slate-700">No work orders recorded yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Jobs booked for this customer will automatically appear here.</p>
              </div>
            ) : (
              jobs.map((job) => (
                <div
                  key={job.id}
                  className="p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200 transition space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-900">
                        #{job.jobCode || job.jobNumber}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${getStatusBadgeClass(job.status)}`}>
                        {job.status.replace('_', ' ')}
                      </span>
                      {job.urgency && (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                          {job.urgency}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                        <Calendar size={12} />
                        <span>{formatDate(job.createdAt)}</span>
                      </span>
                      <strong className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {formatCurrency(centsToDollars(job.totalCents || 0), currencySymbol)}
                      </strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-1 border-t border-slate-200/60">
                    <div className="flex items-start gap-1.5 min-w-0">
                      <MapPin size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span className="truncate">{job.serviceAddress || 'No breakdown address recorded'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 min-w-0">
                      <Car size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">
                        {job.vehicle
                          ? `${job.vehicle.year || ''} ${job.vehicle.make} ${job.vehicle.model} (${job.vehicle.tireSize || 'Std'})`.trim()
                          : 'Vehicle logged on ticket'}
                      </span>
                    </div>
                  </div>

                  {job.problemNotes && (
                    <p className="text-[11px] text-slate-500 italic bg-white p-2 rounded-lg border border-slate-200/80">
                      "{job.problemNotes}"
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Registered Vehicles */}
        {activeTab === 'vehicles' && (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {vehicles.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                <Car size={28} className="mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-bold text-slate-700">No vehicles registered</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Vehicles serviced for this customer will automatically index here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {vehicles.map((v) => (
                  <div
                    key={v.id}
                    className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">
                        {v.year} {v.make} {v.model}
                      </span>
                      {v.licensePlate && (
                        <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-800">
                          {v.licensePlate}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[10px]">Tire Spec:</span>
                      <strong className="text-slate-900 font-mono">{v.tireSize || 'TBD'}</strong>
                    </div>
                    {v.createdAt && (
                      <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                        Indexed: {formatDate(v.createdAt)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

import { useState } from 'react';
import { Truck, Plus, Search } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import FleetTable from '../components/fleets/FleetTable';
import AddFleetModal from '../components/fleets/AddFleetModal';
import FleetDetailModal from '../components/fleets/FleetDetailModal';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/common/Skeleton';
import { useFleets } from '../hooks/useFleets';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export default function Fleets() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'GENERAL_MANAGER' || user?.role?.toUpperCase().includes('ADMIN');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedFleet, setSelectedFleet] = useState<any | null>(null);
  const [newFleetCredentials, setNewFleetCredentials] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const { data: fleetsResponse, isLoading } = useFleets();

  const fleets = fleetsResponse?.data || [];

  const filteredFleets = fleets.filter((f: any) => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      f.fleetCode?.toLowerCase().includes(query) ||
      f.companyName?.toLowerCase().includes(query) ||
      f.name?.toLowerCase().includes(query) ||
      f.contactName?.toLowerCase().includes(query) ||
      f.contactPerson?.toLowerCase().includes(query) ||
      f.email?.toLowerCase().includes(query) ||
      f.phone?.includes(query)
    );
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Fleet Accounts & B2B Billing"
        subtitle="Manage logistics partners, Net-30 payment terms, and fleet vehicle enrollments"
        actions={
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="btn-primary"
          >
            <Plus size={14} />
            <span>Register Fleet Account</span>
          </button>
        }
      />

      <div className="card-surface p-3 flex items-center">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Fleet ID (e.g. XMT-4501), company name, or phone..."
            className="input-base pl-8 py-1.5 text-xs"
          />
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={isAdmin ? 9 : 8} />
      ) : fleets.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No commercial fleet accounts"
          description="Register transportation companies, delivery fleets, or corporate accounts for consolidated billing."
          action={
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="btn-primary"
            >
              <Plus size={14} />
              <span>Register Fleet</span>
            </button>
          }
        />
      ) : filteredFleets.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching fleets"
          description={`No fleet accounts found matching "${search}".`}
        />
      ) : (
        <FleetTable fleets={filteredFleets} onSelectFleet={(f) => setSelectedFleet(f)} />
      )}

      <AddFleetModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={(created) => {
          if (created?.tempCredentials) {
            setNewFleetCredentials({
              ...created.tempCredentials,
              fleetCode: created.fleetCode,
              companyName: created.companyName || created.name,
            });
          }
        }}
      />
      <FleetDetailModal
        fleet={selectedFleet}
        isOpen={!!selectedFleet}
        onClose={() => setSelectedFleet(null)}
      />

      {/* One-Time Fleet Credentials Modal */}
      {newFleetCredentials && (
        <Modal
          isOpen={!!newFleetCredentials}
          onClose={() => setNewFleetCredentials(null)}
          title="Fleet Account Registered"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900">
              <div className="font-bold text-sm mb-1">🎉 Fleet Account Activated!</div>
              <p className="text-slate-600 text-xs">
                One-time portal login credentials generated for <strong>{newFleetCredentials.companyName}</strong>. Please copy and share these securely with the Fleet Manager.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 font-mono text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Portal URL</span>
                <span className="text-slate-900 font-bold">{window.location.origin}/login</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Fleet Code</span>
                <span className="text-slate-900 font-bold">{newFleetCredentials.fleetCode || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Login Email</span>
                <span className="text-slate-900 font-bold">{newFleetCredentials.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Temporary Password</span>
                <span className="text-red-600 font-bold select-all">{newFleetCredentials.tempPassword || '(Custom password set)'}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const txt = `🏢 Xtreme Mobile Tire — Fleet Manager Portal
🔗 Portal: ${window.location.origin}/login
🏷️ Fleet Code: ${newFleetCredentials.fleetCode}
📧 Email: ${newFleetCredentials.email}
🔑 Password: ${newFleetCredentials.tempPassword || '(Custom password set)'}`;
                  navigator.clipboard.writeText(txt);
                  toast.success('Credentials copied to clipboard!');
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Copy All Credentials
              </button>
              <button
                type="button"
                onClick={() => setNewFleetCredentials(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

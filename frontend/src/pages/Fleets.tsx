import { useState } from 'react';
import { Truck, Plus, Search } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import FleetTable from '../components/fleets/FleetTable';
import AddFleetModal from '../components/fleets/AddFleetModal';
import FleetDetailModal from '../components/fleets/FleetDetailModal';
import EmptyState from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/common/Skeleton';
import { useFleets } from '../hooks/useFleets';

export default function Fleets() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedFleet, setSelectedFleet] = useState<any | null>(null);
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
        <TableSkeleton rows={5} cols={7} />
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

      <AddFleetModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
      <FleetDetailModal
        fleet={selectedFleet}
        isOpen={!!selectedFleet}
        onClose={() => setSelectedFleet(null)}
      />
    </div>
  );
}

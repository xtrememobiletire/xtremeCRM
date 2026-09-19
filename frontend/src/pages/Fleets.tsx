import { useState } from 'react';
import { Truck, Plus } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import FleetTable from '../components/pages/fleets/FleetTable';
import AddFleetModal from '../components/pages/fleets/AddFleetModal';
import EmptyState from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/common/Skeleton';
import { useFleets } from '../hooks/useFleets';

export default function Fleets() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { data: fleetsResponse, isLoading } = useFleets();

  const fleets = fleetsResponse?.data || [];

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

      {isLoading ? (
        <TableSkeleton rows={5} cols={6} />
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
      ) : (
        <FleetTable fleets={fleets} />
      )}

      <AddFleetModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
    </div>
  );
}

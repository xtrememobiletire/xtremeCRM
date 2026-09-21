import { useState } from 'react';
import { Users, Plus, Search } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import CustomerTable from '../components/customers/CustomerTable';
import AddCustomerModal from '../components/customers/AddCustomerModal';
import Pagination from '../components/common/Pagination';
import EmptyState from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/common/Skeleton';
import { useCustomers } from '../hooks/useCustomers';

export default function Customers() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { data: customerResponse, isLoading } = useCustomers({
    page,
    limit: 10,
    search: search || undefined,
  });

  const customers = customerResponse?.data || [];
  const pagination = customerResponse?.pagination || { total: 0, totalPages: 1, page: 1 };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Customer Directory"
        subtitle="Manage personal vehicle owners and commercial roadside accounts"
        actions={
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="btn-primary"
          >
            <Plus size={14} />
            <span>Add Customer</span>
          </button>
        }
      />

      <div className="card-surface p-3 flex items-center">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search customers by name, phone, or email..."
            className="input-base pl-8 py-1.5 text-xs"
          />
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers found"
          description="Add a customer or wait for callers to be automatically indexed through intake."
          action={
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="btn-primary"
            >
              <Plus size={14} />
              <span>Add New Customer</span>
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          <CustomerTable customers={customers} />
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalCount={pagination.total}
            onPageChange={setPage}
          />
        </div>
      )}

      <AddCustomerModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
    </div>
  );
}

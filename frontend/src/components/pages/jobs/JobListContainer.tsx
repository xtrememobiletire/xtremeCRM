import JobTable from './JobTable';
import JobCard from './JobCard';
import Pagination from '../../common/Pagination';
import { TableSkeleton } from '../../common/Skeleton';
import EmptyState from '../../ui/EmptyState';
import { Wrench, Plus } from 'lucide-react';

interface JobListContainerProps {
  isLoading: boolean;
  jobs: any[];
  pagination: { page: number; totalPages: number; total?: number };
  onPageChange: (page: number) => void;
  onViewJob: (job: any) => void;
  onAssignDriver: (job: any) => void;
  onCreateJobClick: () => void;
}

export default function JobListContainer({
  isLoading,
  jobs,
  pagination,
  onPageChange,
  onViewJob,
  onAssignDriver,
  onCreateJobClick,
}: JobListContainerProps) {
  if (isLoading) {
    return <TableSkeleton rows={8} cols={7} />;
  }

  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={Wrench}
        title="No jobs matching criteria"
        description="There are currently no active job tickets matching your search or filters."
        action={
          <button type="button" onClick={onCreateJobClick} className="btn-primary">
            <Plus size={14} />
            <span>Create First Job</span>
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="hidden md:block">
        <JobTable jobs={jobs} onViewJob={onViewJob} onAssignDriver={onAssignDriver} />
      </div>

      <div className="grid grid-cols-1 gap-3 md:hidden">
        {jobs.map((j) => (
          <JobCard key={j.id} job={j} onViewJob={onViewJob} onAssignDriver={onAssignDriver} />
        ))}
      </div>

      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalCount={pagination.total}
        onPageChange={onPageChange}
      />
    </div>
  );
}

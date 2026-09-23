import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import JobFilters from '../components/pages/jobs/JobFilters';
import JobListContainer from '../components/pages/jobs/JobListContainer';
import CreateJobModal from '../components/pages/jobs/CreateJobModal';
import JobDetailModal from '../components/pages/jobs/JobDetailModal';
import AssignDriverModal from '../components/pages/jobs/AssignDriverModal';
import { useJobs } from '../hooks/useJobs';
import { useAuth } from '../context/AuthContext';

export default function Jobs() {
  const { user } = useAuth();
  const isDriver = user?.role === 'DRIVER';

  const [searchParams, setSearchParams] = useSearchParams();
  const intakePhoneParam = searchParams.get('intakePhone') || '';

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [urgency, setUrgency] = useState('');
  const [page, setPage] = useState(1);

  const [isCreateOpen, setIsCreateOpen] = useState(!!intakePhoneParam);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [assignJob, setAssignJob] = useState<any>(null);

  useEffect(() => {
    if (intakePhoneParam) {
      setIsCreateOpen(true);
    }
  }, [intakePhoneParam]);

  const { data: jobsResponse, isLoading, refetch } = useJobs({
    page,
    limit: 10,
    status: status || undefined,
    urgency: urgency || undefined,
    search: search || undefined,
    driverId: isDriver ? user?.id : undefined,
  });

  const rawJobs = jobsResponse?.data || [];
  // Strict driver isolation: only show jobs where driverId matches current user ID
  const jobs = isDriver && user?.id
    ? rawJobs.filter((j: any) => j.driverId === user.id || j.driver?.id === user.id)
    : rawJobs;

  const pagination = jobsResponse?.pagination || { total: jobs.length, totalPages: 1, page: 1 };

  const handleCloseCreate = () => {
    setIsCreateOpen(false);
    if (intakePhoneParam) {
      searchParams.delete('intakePhone');
      setSearchParams(searchParams);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={isDriver ? "Orders" : "Jobs & Dispatch Work Orders"}
        subtitle={isDriver ? "View and manage your assigned roadside service dispatches" : "Manage customer intake, roadside emergency dispatches, and work order lifecycle"}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              className="btn-secondary px-2.5 py-2 cursor-pointer"
              title="Refresh order list"
            >
              <RefreshCw size={14} />
            </button>
            {!isDriver && (
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="btn-primary cursor-pointer"
              >
                <Plus size={14} />
                <span>Create Job Ticket</span>
              </button>
            )}
          </div>
        }
      />

      <JobFilters
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        status={status}
        onStatusChange={(v) => { setStatus(v); setPage(1); }}
        urgency={urgency}
        onUrgencyChange={(v) => { setUrgency(v); setPage(1); }}
      />

      <JobListContainer
        isLoading={isLoading}
        jobs={jobs}
        pagination={pagination}
        onPageChange={setPage}
        onViewJob={setSelectedJob}
        onAssignDriver={setAssignJob}
        onCreateJobClick={() => setIsCreateOpen(true)}
      />

      <CreateJobModal
        isOpen={isCreateOpen}
        onClose={handleCloseCreate}
        prefillPhone={intakePhoneParam}
      />
      <JobDetailModal
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        job={selectedJob}
      />
      <AssignDriverModal
        isOpen={!!assignJob}
        onClose={() => setAssignJob(null)}
        job={assignJob}
      />
    </div>
  );
}

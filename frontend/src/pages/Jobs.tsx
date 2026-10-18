import { useState, lazy, Suspense, useMemo } from 'react';
import { useSearchParams, Navigate, Link } from 'react-router-dom';
import { Plus, RefreshCw, CheckCircle2, MapPin } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import JobFilters from '../components/pages/jobs/JobFilters';
import JobListContainer from '../components/pages/jobs/JobListContainer';
import DriverActiveOrderCard from '../components/jobs/DriverActiveOrderCard';
import EmptyState from '../components/ui/EmptyState';

const CreateRoadsideJobModal = lazy(() => import('../components/pages/jobs/CreateRoadsideJobModal'));
const JobDetailModal = lazy(() => import('../components/pages/jobs/JobDetailModal'));
const AssignDriverModal = lazy(() => import('../components/pages/jobs/AssignDriverModal'));
const ExpenseStatingModal = lazy(() => import('../components/accounting/ExpenseStatingModal'));
import { useJobs } from '../hooks/useJobs';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { toast } from 'sonner';

export default function Jobs() {
  const { user } = useAuth();
  const isDriver = user?.role === 'DRIVER';
  const isAccountant = user?.role === 'ACCOUNTANT';

  const [searchParams, setSearchParams] = useSearchParams();
  const intakePhoneParam = searchParams.get('intakePhone') || '';

  const [lifecycleTab, setLifecycleTab] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [urgency, setUrgency] = useState('');
  const [jobCategory, setJobCategory] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState<'ALL' | 'CA' | 'UK' | 'US'>('ALL');

  const [isCreateOpen, setIsCreateOpen] = useState(Boolean(intakePhoneParam));
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [assignJob, setAssignJob] = useState<any>(null);
  const [cogsJob, setCogsJob] = useState<any>(null);

  const effectiveStatus = isAccountant
    ? 'COMPLETED'
    : lifecycleTab === 'COMPLETED'
    ? 'COMPLETED'
    : (status || 'ACTIVE');

  const { data: jobsResponse, isLoading, refetch } = useJobs({
    page: isDriver ? 1 : page,
    limit: isDriver ? 50 : 20,
    status: effectiveStatus,
    urgency: urgency || undefined,
    search: search || undefined,
    driverId: isDriver ? user?.id : undefined,
    countryCode: selectedCountry,
    jobCategory: jobCategory,
  });

  const rawJobs = jobsResponse?.data || [];
  // Universal job visibility: shows all jobs matching category, excluding unverified public bookings
  // Tab isolation: never show completed in ACTIVE tab, never show active in COMPLETED tab
  const visibleJobs = rawJobs.filter((j: any) => {
    if (j.status === 'UNVERIFIED_PUBLIC') return false;
    if (!isDriver) {
      if (lifecycleTab === 'ACTIVE' && j.status === 'COMPLETED') return false;
      if (lifecycleTab === 'COMPLETED' && j.status !== 'COMPLETED') return false;
    }
    return true;
  });
  // Strict driver isolation: only show jobs where driverId matches current user ID
  const jobs = isDriver && user?.id
    ? visibleJobs.filter((j: any) => j.driverId === user.id || j.driver?.id === user.id)
    : visibleJobs;

  const liveSelectedJob = useMemo(
    () => jobs.find((j: any) => j.id === selectedJob?.id) || selectedJob,
    [jobs, selectedJob]
  );

  if (isAccountant) {
    return <Navigate to="/accounting" replace />;
  }

  // For driver, only show fresh/active orders (not completed, not cancelled)
  const activeJobs = isDriver
    ? jobs.filter((j: any) => j.status !== 'COMPLETED' && j.status !== 'CANCELLED')
    : jobs;

  const pagination = jobsResponse?.pagination || { total: jobs.length, totalPages: 1, page: 1 };

  const handleCloseCreate = () => {
    setIsCreateOpen(false);
    if (intakePhoneParam) {
      searchParams.delete('intakePhone');
      setSearchParams(searchParams);
    }
  };

  const handleCompleteOrder = async (jobId: string, cashAmountCents: number) => {
    try {
      await api.patch(`/jobs/${jobId}/status`, {
        status: 'COMPLETED',
        cashAmountCents,
      });
      toast.success('Order completed successfully! Cash collection recorded.');
      refetch();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Failed to complete order';
      toast.error(errorMsg);
      throw err;
    }
  };

  const pageTitle = isDriver 
    ? 'Orders' 
    : isAccountant 
    ? 'Completed Work Orders' 
    : 'Jobs';

  const pageSubtitle = isDriver 
    ? 'Active service dispatches' 
    : isAccountant 
    ? 'Review resolved roadside dispatches and record COGS across regions' 
    : 'Manage roadside work orders';

  return (
    <div className="space-y-4">
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/jobs/map"
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <MapPin size={14} className="text-red-600" />
              <span>Map View</span>
            </Link>
            <button
              type="button"
              onClick={() => refetch()}
              className="btn-secondary px-2.5 py-2 cursor-pointer"
              title="Refresh order list"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
            {!isDriver && !isAccountant && (
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="btn-primary cursor-pointer"
              >
                <Plus size={14} />
                <span>New Job</span>
              </button>
            )}
          </div>
        }
      />

      {/* Country Filter Pills with Mobile Scroll-X (No Stacking/Grid Wrap) */}
      {!isDriver && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap py-1">
          {[
            { code: 'ALL', label: 'All Regions', flag: '🌐' },
            { code: 'CA', label: 'Canada', flag: '🇨🇦' },
            { code: 'UK', label: 'United Kingdom', flag: '🇬🇧' },
            { code: 'US', label: 'United States', flag: '🇺🇸' },
          ].map((tab) => {
            const isActive = selectedCountry === tab.code;
            return (
              <button
                key={tab.code}
                type="button"
                onClick={() => {
                  setSelectedCountry(tab.code as any);
                  setPage(1);
                }}
                className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span>{tab.flag}</span>
                <span>{tab.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {isDriver ? (
        isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-2xl border border-slate-200 p-5 h-72 animate-pulse" />
            ))}
          </div>
        ) : activeJobs.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="No active orders"
            description="No open roadside dispatches."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {activeJobs.map((job: any) => (
              <DriverActiveOrderCard
                key={job.id}
                job={job}
                onCompleteOrder={handleCompleteOrder}
              />
            ))}
          </div>
        )
      ) : (
        <>
          {!isAccountant && (
            <JobFilters
              search={search}
              onSearchChange={(v) => { setSearch(v); setPage(1); }}
              status={status}
              onStatusChange={(v) => { setStatus(v); setPage(1); }}
              urgency={urgency}
              onUrgencyChange={(v) => { setUrgency(v); setPage(1); }}
              jobCategory={jobCategory}
              onJobCategoryChange={(cat) => { setJobCategory(cat); setPage(1); }}
              lifecycleTab={lifecycleTab}
              onLifecycleTabChange={(tab) => { setLifecycleTab(tab); setPage(1); }}
            />
          )}

          <JobListContainer
            isLoading={isLoading}
            jobs={jobs}
            pagination={pagination}
            onPageChange={setPage}
            onViewJob={(job) => {
              if (isAccountant) {
                setCogsJob(job);
              } else {
                setSelectedJob(job);
              }
            }}
            onAssignDriver={setAssignJob}
            onCreateJobClick={() => setIsCreateOpen(true)}
          />
        </>
      )}

      {isCreateOpen && (
        <Suspense fallback={null}>
          <CreateRoadsideJobModal
            isOpen={isCreateOpen}
            onClose={handleCloseCreate}
            prefillPhone={intakePhoneParam}
          />
        </Suspense>
      )}
      {selectedJob && (
        <Suspense fallback={null}>
          <JobDetailModal
            isOpen={!!selectedJob}
            onClose={() => setSelectedJob(null)}
            job={liveSelectedJob}
          />
        </Suspense>
      )}
      {assignJob && (
        <Suspense fallback={null}>
          <AssignDriverModal
            isOpen={!!assignJob}
            onClose={() => setAssignJob(null)}
            job={assignJob}
          />
        </Suspense>
      )}
      {cogsJob && (
        <Suspense fallback={null}>
          <ExpenseStatingModal
            isOpen={!!cogsJob}
            onClose={() => {
              setCogsJob(null);
              refetch();
            }}
            job={{
              id: cogsJob.id,
              jobNumber: cogsJob.jobCode || cogsJob.jobNumber,
              customerName: cogsJob.customer?.name || cogsJob.recipientName || 'Customer',
              countryCode: cogsJob.countryCode,
              currencySymbol: cogsJob.countryCode === 'UK' ? '£' : cogsJob.countryCode === 'CA' ? 'CA$' : '$',
              revenueCents: cogsJob.totalAmount || cogsJob.totalCents || 0,
              costCents: (cogsJob.materialCostCents || 0) + (cogsJob.repairerFeeCents || 0) + (cogsJob.otherExpenseCents || 0),
              materialCostCents: cogsJob.materialCostCents || 0,
              repairerFeeCents: cogsJob.repairerFeeCents || 0,
              otherExpenseCents: cogsJob.otherExpenseCents || 0,
              expenseNotes: cogsJob.expenseNotes,
              profitCents: (cogsJob.totalAmount || cogsJob.totalCents || 0) - ((cogsJob.materialCostCents || 0) + (cogsJob.repairerFeeCents || 0) + (cogsJob.otherExpenseCents || 0)),
              marginPercent: 0,
              paymentStatus: cogsJob.paymentStatus || 'UNPAID',
              date: cogsJob.createdAt,
              itPlatformFeeCents: cogsJob.countryCode === 'CA' ? 150 : 100,
              netAfterItRoyaltyCents: 0,
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

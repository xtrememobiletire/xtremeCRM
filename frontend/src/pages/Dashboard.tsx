import { useState } from 'react';
import { Wrench, Plus, Radio, ArrowRight } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import TimeframeDropdown from '../components/ui/TimeframeDropdown';
import Card from '../components/ui/Card';
import DashboardKpiGrid from '../components/pages/dashboard/DashboardKpiGrid';
import JobTable from '../components/jobs/JobTable';
import CreateJobModal from '../components/jobs/CreateJobModal';
import JobDetailModal from '../components/jobs/JobDetailModal';
import AssignDriverModal from '../components/jobs/AssignDriverModal';
import ProximityDistanceTool from '../components/dispatch/ProximityDistanceTool';
import DriverCashTracker from '../components/dispatch/DriverCashTracker';
import { useJobs } from '../hooks/useJobs';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const { country, currencySymbol } = useTenant();
  const [timeframe, setTimeframe] = useState('today');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [assignJob, setAssignJob] = useState<any>(null);

  const { data: jobsData, isLoading } = useJobs({ page: 1, limit: 6 });

  if (user?.role === 'ACCOUNTANT') {
    return <Navigate to="/accounting" replace />;
  }

  const jobs = jobsData?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={`Operations overview for ${country} Region (${currencySymbol})`}
        badge={
          <span className="badge-brand inline-flex items-center gap-1">
            <Radio className="w-3 h-3 text-red-600 animate-pulse" />
            <span>Live</span>
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <TimeframeDropdown value={timeframe} onChange={setTimeframe} />
            <button type="button" onClick={() => setIsCreateOpen(true)} className="btn-primary cursor-pointer">
              <Plus size={14} />
              <span>New Job</span>
            </button>
          </div>
        }
      />

      <DashboardKpiGrid isLoading={isLoading} jobs={jobs} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card
            title="Recent Jobs"
            icon={Wrench}
            action={
              <Link to="/jobs" className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1">
                <span>View All</span>
                <ArrowRight size={13} />
              </Link>
            }
          >
            <JobTable
              jobs={jobs}
              onViewJob={(j) => setSelectedJob(j)}
              onAssignDriver={(j) => setAssignJob(j)}
            />
          </Card>
        </div>

        <div className="space-y-6">
          <ProximityDistanceTool />
          <DriverCashTracker />
        </div>
      </div>

      <CreateJobModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      <JobDetailModal isOpen={!!selectedJob} onClose={() => setSelectedJob(null)} job={selectedJob} />
      <AssignDriverModal isOpen={!!assignJob} onClose={() => setAssignJob(null)} job={assignJob} />
    </div>
  );
}

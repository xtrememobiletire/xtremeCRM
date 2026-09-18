import { Wrench, DollarSign, Clock, Users } from 'lucide-react';
import StatCard from '../../ui/StatCard';
import { CardSkeleton } from '../../common/Skeleton';
import { formatCurrency, centsToDollars } from '../../../utils/currency';
import { useTenant } from '../../../context/TenantContext';

interface DashboardKpiGridProps {
  isLoading: boolean;
  jobs: any[];
}

export default function DashboardKpiGrid({ isLoading, jobs }: DashboardKpiGridProps) {
  const { currencySymbol } = useTenant();

  if (isLoading) {
    return <CardSkeleton count={4} />;
  }

  const activeJobsCount = jobs.filter((j: any) =>
    ['DISPATCHED', 'EN_ROUTE', 'ON_SCENE', 'IN_PROGRESS'].includes(j.status)
  ).length;

  const totalRevenueCents = jobs.reduce((sum: number, j: any) => sum + (j.totalAmount || 0), 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Active Roadside Jobs"
        value={activeJobsCount.toString()}
        subtitle="Units en route or on scene"
        subtitleColor="text-emerald-600"
        icon={Wrench}
        iconBg="bg-red-50"
        iconColor="text-red-600"
      />
      <StatCard
        title="Gross Period Revenue"
        value={formatCurrency(centsToDollars(totalRevenueCents), currencySymbol)}
        subtitle="Invoiced & card intakes"
        subtitleColor="text-slate-500"
        icon={DollarSign}
        iconBg="bg-emerald-50"
        iconColor="text-emerald-600"
      />
      <StatCard
        title="Avg Response Time"
        value="19.2 min"
        subtitle="Target: under 30 mins"
        subtitleColor="text-blue-600"
        icon={Clock}
        iconBg="bg-blue-50"
        iconColor="text-blue-600"
      />
      <StatCard
        title="Drivers Deployed"
        value="8 / 10"
        subtitle="80% fleet rig utilization"
        subtitleColor="text-amber-600"
        icon={Users}
        iconBg="bg-amber-50"
        iconColor="text-amber-600"
      />
    </div>
  );
}

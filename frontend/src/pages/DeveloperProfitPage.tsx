import { RefreshCw, CheckCircle2, ShieldCheck, DollarSign } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import { useDeveloperProfit } from '../hooks/useAccounting';

export default function DeveloperProfitPage() {
  const { data: profitData, isLoading, refetch } = useDeveloperProfit();

  const ca = profitData?.canada;
  const us = profitData?.unitedStates;
  const uk = profitData?.unitedKingdom;
  const totalDispatches = profitData?.totalDispatches ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Developer IT Platform Royalties"
        subtitle="Contractual platform dispatch fees (CA$1.50 CA / $1.00 US / £1.00 UK per completed job)"
        actions={
          <button
            type="button"
            onClick={() => refetch()}
            className="btn-secondary px-3 py-2 cursor-pointer flex items-center gap-2 text-xs font-bold"
            title="Refresh developer royalties"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Completed Dispatches"
          value={isLoading ? '...' : totalDispatches.toLocaleString()}
          subtitle="All regions combined"
          subtitleColor="text-slate-500"
          icon={CheckCircle2}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          isLoading={isLoading}
        />
        <StatCard
          title="Canada Royalties"
          value={isLoading ? '...' : ca?.formattedProfit ?? 'CA$0.00'}
          subtitle={`${ca?.completedDispatches ?? 0} jobs @ CA$1.50/job`}
          subtitleColor="text-emerald-600"
          icon={DollarSign}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          isLoading={isLoading}
        />
        <StatCard
          title="US Royalties"
          value={isLoading ? '...' : us?.formattedProfit ?? '$0.00'}
          subtitle={`${us?.completedDispatches ?? 0} jobs @ $1.00/job`}
          subtitleColor="text-emerald-600"
          icon={DollarSign}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          isLoading={isLoading}
        />
        <StatCard
          title="UK Royalties"
          value={isLoading ? '...' : uk?.formattedProfit ?? '£0.00'}
          subtitle={`${uk?.completedDispatches ?? 0} jobs @ £1.00/job`}
          subtitleColor="text-emerald-600"
          icon={DollarSign}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          isLoading={isLoading}
        />
      </div>

      {/* Regional Settlement Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            region: 'Canada',
            flag: '🇨🇦',
            currency: 'CAD',
            rate: 'CA$1.50',
            data: ca,
          },
          {
            region: 'United States',
            flag: '🇺🇸',
            currency: 'USD',
            rate: '$1.00',
            data: us,
          },
          {
            region: 'United Kingdom',
            flag: '🇬🇧',
            currency: 'GBP',
            rate: '£1.00',
            data: uk,
          },
        ].map((item) => (
          <div key={item.region} className="card p-5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{item.flag}</span>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{item.region}</h4>
                  <p className="text-xs text-slate-500 font-medium">Currency: {item.currency}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                {item.rate} / job
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Completed Dispatches</span>
                <span className="font-bold text-slate-800">{item.data?.completedDispatches ?? 0}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Contract Royalty Rate</span>
                <span className="font-bold text-slate-800">{item.rate}</span>
              </div>
              <div className="flex justify-between py-1.5 text-sm font-bold bg-emerald-50/60 px-2 rounded-lg">
                <span className="text-emerald-800">Total Accrued</span>
                <span className="text-emerald-700">{item.data?.formattedProfit ?? '0.00'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Contract & Security Protocol Card */}
      <div className="card p-5 bg-white border border-slate-200 rounded-xl shadow-2xs flex items-start gap-3.5">
        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
          <ShieldCheck size={20} />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-900">Platform Royalty Contract Protocol</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Platform royalties are automatically calculated on every job verified and completed across Canadian, US, and UK dispatch centers.
            Royalty metrics are segregated by currency to preserve accounting accuracy and prevent arbitrary foreign exchange conversions.
            Access to this ledger is restricted strictly to Developer, Administrator, and General Management credentials.
          </p>
        </div>
      </div>
    </div>
  );
}

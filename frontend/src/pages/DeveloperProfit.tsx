import { Shield, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDeveloperProfit } from '../hooks/useAccounting';
import { Navigate } from 'react-router-dom';

export default function DeveloperProfit() {
  const { user } = useAuth();
  const { data: profitData, isLoading, refetch } = useDeveloperProfit();

  // Strict Admin isolation (unauthorized access redirected)
  if (user && user.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  const ca = profitData?.canada;
  const us = profitData?.unitedStates;
  const uk = profitData?.unitedKingdom;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Developer Sector Profit
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-900 text-emerald-400 border border-slate-800">
              Admin Confidential
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Real-time automated software royalties accumulated on completed roadside dispatches.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          className="btn-secondary text-xs px-3.5 py-2 cursor-pointer font-bold inline-flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Counters</span>
        </button>
      </div>

      {/* 3 Dedicated Regional Profit Containers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Container 1: Canada */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-2xl" role="img" aria-label="Canada">🇨🇦</span>
              <div>
                <h3 className="text-sm font-black text-slate-900">Canada Sector</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CAD Economy</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
              +CA$1.50 / Job
            </span>
          </div>

          <div className="py-6 space-y-1">
            <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">
              Accrued Developer Profit
            </span>
            <p className="text-4xl font-black text-slate-900 font-mono tracking-tight text-emerald-600">
              {isLoading ? '...' : (ca?.formattedProfit || 'CA$0.00')}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Completed Dispatches:</span>
            <span className="font-mono font-bold text-slate-900">{ca?.completedDispatches ?? 0}</span>
          </div>
        </div>

        {/* Container 2: United States */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-2xl" role="img" aria-label="United States">🇺🇸</span>
              <div>
                <h3 className="text-sm font-black text-slate-900">United States Sector</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">USD Economy</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
              +$1.00 / Job
            </span>
          </div>

          <div className="py-6 space-y-1">
            <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">
              Accrued Developer Profit
            </span>
            <p className="text-4xl font-black text-slate-900 font-mono tracking-tight text-blue-600">
              {isLoading ? '...' : (us?.formattedProfit || '$0.00')}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Completed Dispatches:</span>
            <span className="font-mono font-bold text-slate-900">{us?.completedDispatches ?? 0}</span>
          </div>
        </div>

        {/* Container 3: United Kingdom */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-2xl" role="img" aria-label="United Kingdom">🇬🇧</span>
              <div>
                <h3 className="text-sm font-black text-slate-900">United Kingdom Sector</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">GBP Economy</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
              +£1.00 / Job
            </span>
          </div>

          <div className="py-6 space-y-1">
            <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">
              Accrued Developer Profit
            </span>
            <p className="text-4xl font-black text-slate-900 font-mono tracking-tight text-purple-600">
              {isLoading ? '...' : (uk?.formattedProfit || '£0.00')}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Completed Dispatches:</span>
            <span className="font-mono font-bold text-slate-900">{uk?.completedDispatches ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Construction } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';

export default function Dispatch() {
  return (
    <div className="space-y-6">
      <PageHeader title="Live Dispatch" subtitle="Real-time driver coordination & routing" />
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-2xs">
        <Construction className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-800">Coming Soon</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Live dispatch with driver GPS, proximity routing, and real-time fleet telemetry is under development.
        </p>
      </div>
    </div>
  );
}

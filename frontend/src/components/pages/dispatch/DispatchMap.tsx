import { MapPin, Truck } from 'lucide-react';
import Card from '../../ui/Card';

interface DispatchMapProps {
  country: string;
}

export default function DispatchMap({ country }: DispatchMapProps) {
  return (
    <Card title="Regional GPS Coverage & Geo-Fencing" icon={MapPin}>
      <div className="h-64 rounded-xl bg-slate-950 text-white p-4 relative overflow-hidden flex flex-col justify-between border border-slate-800 shadow-inner">
        <div className="flex justify-between items-start z-10">
          <div className="bg-slate-900/80 border border-slate-700 px-3 py-1.5 rounded-lg text-xs backdrop-blur-xs">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Active Telematics Feed</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">5 Mobile Rigs Online in {country} Zone</div>
          </div>

          <div className="text-right text-[11px] font-mono text-slate-400">
            LAT: 43.6532° N<br />LON: 79.3832° W
          </div>
        </div>

        {/* Simulated Radar Ring */}
        <div className="absolute inset-0 flex items-center justify-center opacity-40 pointer-events-none">
          <div className="w-96 h-96 rounded-full border border-dashed border-red-500/40 animate-spin" style={{ animationDuration: '30s' }} />
          <div className="w-64 h-64 rounded-full border border-dashed border-slate-700 absolute" />
        </div>

        {/* Pin markers */}
        <div className="absolute top-1/3 left-1/4 flex items-center gap-1 bg-red-600/90 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-lg animate-pulse">
          <Truck size={10} />
          <span>Van #04</span>
        </div>

        <div className="absolute bottom-1/3 right-1/3 flex items-center gap-1 bg-blue-600/90 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-lg">
          <Truck size={10} />
          <span>Rig #08</span>
        </div>

        <div className="z-10 flex justify-between items-end text-[11px] text-slate-400">
          <span>Auto-refresh interval: 10s</span>
          <span className="font-mono text-xs text-red-400 font-bold">Xtreme Fleet Telemetry v2.4</span>
        </div>
      </div>
    </Card>
  );
}

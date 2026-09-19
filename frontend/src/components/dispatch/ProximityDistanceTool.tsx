import { useState } from 'react';
import { MapPin, Navigation, Sparkles } from 'lucide-react';
import Card from '../ui/Card';

export default function ProximityDistanceTool() {
  const [targetAddress, setTargetAddress] = useState('');
  const [calculatedDrivers, setCalculatedDrivers] = useState<any[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAddress) return;

    setIsCalculating(true);
    // Proximity calculation simulation
    setTimeout(() => {
      setCalculatedDrivers([
        { name: 'Marcus Vance', van: 'Van #04 (Ford Transit)', distance: '4.2 km', eta: '11 mins', status: 'AVAILABLE' },
        { name: 'Samir Patel', van: 'Van #02 (Mercedes Sprinter)', distance: '7.8 km', eta: '19 mins', status: 'AVAILABLE' },
        { name: 'Devon Lee', van: 'Rig #08 (RAM 3500)', distance: '12.4 km', eta: '28 mins', status: 'BUSY' },
      ]);
      setIsCalculating(false);
    }, 400);
  };

  return (
    <Card title="Driver Proximity & Routing Tool" icon={Navigation}>
      <form onSubmit={handleCalculate} className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-red-500" />
          <input
            type="text"
            value={targetAddress}
            onChange={(e) => setTargetAddress(e.target.value)}
            placeholder="Enter breakdown address or postal code (e.g., M5V 2T6)..."
            className="input-base pl-9 py-2 text-xs"
          />
        </div>
        <button
          type="submit"
          disabled={isCalculating || !targetAddress}
          className="btn-primary px-4 py-2 text-xs shrink-0"
        >
          <Sparkles size={14} />
          <span>{isCalculating ? 'Computing...' : 'Find Nearest Driver'}</span>
        </button>
      </form>

      {calculatedDrivers.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Optimal Driver Recommendations
          </h5>
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {calculatedDrivers.map((drv, i) => (
              <div key={i} className="p-2.5 flex items-center justify-between text-xs bg-white hover:bg-slate-50">
                <div>
                  <div className="font-bold text-slate-800">{drv.name}</div>
                  <div className="text-[11px] text-slate-400">{drv.van}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-red-600">{drv.distance}</div>
                  <div className="text-[11px] font-semibold text-emerald-600">ETA ~{drv.eta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

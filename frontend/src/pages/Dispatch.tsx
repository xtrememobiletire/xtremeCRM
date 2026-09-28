import { useNavigate } from 'react-router-dom';
import { Wrench, Map, Navigation2, Zap, Radio, ArrowLeft } from 'lucide-react';

const COMING_FEATURES = [
  { icon: Map, label: 'Live Fleet Map', desc: 'Real-time GPS tracking of all field technicians on an interactive map.' },
  { icon: Navigation2, label: 'Smart Routing', desc: 'AI-assisted nearest-driver assignment based on live location and traffic.' },
  { icon: Radio, label: 'Live Queue Operations', desc: 'Drag-and-drop urgent queue management with ETA countdown timers.' },
  { icon: Zap, label: 'Instant Push Dispatch', desc: 'One-click push job to driver with in-app notification and auto-acceptance.' },
  { icon: Wrench, label: 'Technician Status Board', desc: 'Live status board showing all drivers: Available, En Route, On Scene, Busy.' },
];

export default function Dispatch() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      {/* Logo / Brand */}
      <div className="mb-8">
        <img src="/logo.webp" alt="Xtreme Mobile Tire" className="h-14 w-auto mx-auto mb-4 drop-shadow" />
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-100 text-red-600 text-xs font-bold uppercase tracking-widest mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          Coming Soon
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Live Dispatch Operations</h1>
        <p className="mt-2 text-slate-500 text-sm max-w-md mx-auto">
          The full live dispatch centre is under active development. Real-time fleet management, GPS routing, and instant driver push-dispatch are coming in the next sprint.
        </p>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl w-full mb-10">
        {COMING_FEATURES.map(({ icon: Icon, label, desc }) => (
          <div
            key={label}
            className="bg-white border border-slate-100 rounded-2xl p-5 text-left shadow-sm hover:shadow-md transition"
          >
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center mb-3">
              <Icon className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">{label}</h3>
            <p className="text-[12px] text-slate-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={() => navigate('/jobs')}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Jobs
      </button>
    </div>
  );
}

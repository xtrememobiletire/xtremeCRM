import { useState } from 'react';
import { Radio, PhoneCall } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import DriverList from '../components/pages/dispatch/DriverList';
import ProximityDistanceTool from '../components/pages/dispatch/ProximityDistanceTool';
import DriverCashTracker from '../components/pages/dispatch/DriverCashTracker';
import DispatchMap from '../components/pages/dispatch/DispatchMap';
import { useSocket } from '../context/SocketContext';
import { useTenant } from '../context/TenantContext';

const MOCK_FLEET_DRIVERS = [
  { id: 'drv-1', name: 'Marcus Vance', phone: '+1 (416) 555-0199', status: 'AVAILABLE', vehicle: 'Van #04 (Ford Transit 350)', currentJob: 'JOB-CA-1002', location: 'Hwy 401 Eastbound (Toronto)' },
  { id: 'drv-2', name: 'Devon Lee', phone: '+1 (416) 555-0188', status: 'AVAILABLE', vehicle: 'Rig #08 (RAM 3500 HD)', currentJob: undefined, location: 'Gardiner Expy & Spadina' },
  { id: 'drv-3', name: 'Samir Patel', phone: '+1 (416) 555-0144', status: 'BUSY', vehicle: 'Van #02 (Sprinter High-Roof)', currentJob: 'JOB-CA-1005', location: 'QEW Westbound near Mississauga' },
  { id: 'drv-4', name: 'Tyler Ross', phone: '+1 (416) 555-0133', status: 'BUSY', vehicle: 'Van #07 (Ford Transit)', currentJob: 'JOB-CA-1008', location: '407 ETR & Markham Rd' },
  { id: 'drv-5', name: 'Alex Tremblay', phone: '+1 (514) 555-0122', status: 'OFFLINE', vehicle: 'Service Truck #01', currentJob: undefined, location: 'Depot (Off Shift)' },
];

export default function Dispatch() {
  const { country } = useTenant();
  const { simulateIncomingCall } = useSocket();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredDrivers = MOCK_FLEET_DRIVERS.filter((drv) => {
    const matchesSearch = !search || drv.name.toLowerCase().includes(search.toLowerCase()) || drv.vehicle.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || drv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Dispatch Operations"
        subtitle={`Roster monitoring, proximity routing, and driver coordination for ${country} Region`}
        badge={
          <span className="badge-brand inline-flex items-center gap-1">
            <Radio className="w-3 h-3 text-red-600 animate-pulse" />
            <span>Telemetry Connected</span>
          </span>
        }
        actions={
          <button
            type="button"
            onClick={() => simulateIncomingCall('+14165550199', 'Roadside Unit #04 - Marcus')}
            className="btn-secondary"
          >
            <PhoneCall size={14} className="text-emerald-600" />
            <span>Softphone Radio Test</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800">
              Mobile Service Units ({filteredDrivers.length})
            </h3>
            <span className="text-xs text-slate-500">
              {filteredDrivers.filter((d) => d.status === 'AVAILABLE').length} Available Now
            </span>
          </div>

          <DriverList
            drivers={filteredDrivers}
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />

          <DispatchMap country={country} />
        </div>

        <div className="space-y-6">
          <ProximityDistanceTool />
          <DriverCashTracker />
        </div>
      </div>
    </div>
  );
}

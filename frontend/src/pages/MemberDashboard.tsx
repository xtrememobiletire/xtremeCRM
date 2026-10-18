import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Car, 
  Wrench, 
  Clock, 
  Receipt, 
  ShieldCheck, 
  MapPin, 
  Plus, 
  FileText, 
  X, 
  ArrowRight,
  AlertCircle,
  PhoneCall,
  Sparkles
} from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { formatCurrency, centsToDollars } from '../utils/currency';
import PageHeader from '../components/ui/PageHeader';
import AddressAutocompleteInput from '../components/common/AddressAutocompleteInput';
import InvoicePdfModal from '../components/invoices/InvoicePdfModal';
import { toast } from 'sonner';

const MEMBER_SERVICE_OPTIONS: Array<{
  name: string;
  category: 'TIRE_SERVICE' | 'ROADSIDE_ASSISTANCE' | 'MAINTENANCE';
  priceCents: number;
}> = [
  { name: 'Flat Tire Repair', category: 'TIRE_SERVICE', priceCents: 10800 },
  { name: 'New Tire Replacement', category: 'TIRE_SERVICE', priceCents: 21600 },
  { name: 'Seasonal Tire Swap (On-Rim)', category: 'TIRE_SERVICE', priceCents: 9900 },
  { name: 'Jump Start', category: 'ROADSIDE_ASSISTANCE', priceCents: 8550 },
  { name: 'Lock Smith Service', category: 'ROADSIDE_ASSISTANCE', priceCents: 12150 },
  { name: 'Fuel Delivery', category: 'ROADSIDE_ASSISTANCE', priceCents: 9450 },
  { name: 'Towing Service', category: 'ROADSIDE_ASSISTANCE', priceCents: 16650 },
];

export default function MemberDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currencySymbol, country } = useTenant();
  const queryClient = useQueryClient();

  const firstName = user?.fullName ? user.fullName.split(' ')[0] : 'Member';

  // Determine active view from URL path
  const getActiveView = () => {
    if (location.pathname.startsWith('/member/garage')) return 'garage';
    if (location.pathname.startsWith('/member/request')) return 'request';
    if (location.pathname.startsWith('/member/history')) return 'history';
    if (location.pathname.startsWith('/member/invoices')) return 'invoices';
    return 'overview';
  };
  const activeView = getActiveView();

  // Booking state (prefills if passed via navigation state)
  const [vehicleId, setVehicleId] = useState('');
  const [serviceName, setServiceName] = useState('Flat Tire Repair');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [notes, setNotes] = useState('');

  // Modals & Invoices
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    licensePlate: '',
    tireSize: '225/65R17',
    color: '',
    vin: '',
  });

  // 1. My Vehicles
  const { data: vehicles = [] } = useQuery({
    queryKey: ['member-portal-vehicles'],
    queryFn: async () => {
      const res = await api.get('/member-portal/vehicles');
      return res.data?.data || [];
    },
  });

  // 2. Job History
  const { data: jobs = [] } = useQuery({
    queryKey: ['member-portal-jobs'],
    queryFn: async () => {
      const res = await api.get('/member-portal/jobs');
      return res.data?.data || [];
    },
  });

  // 3. Invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ['member-portal-invoices'],
    queryFn: async () => {
      const res = await api.get('/member-portal/invoices');
      return res.data?.data || [];
    },
  });

  // 4. Receipts
  const { data: receipts = [] } = useQuery({
    queryKey: ['member-portal-receipts'],
    queryFn: async () => {
      const res = await api.get('/member-portal/receipts');
      return res.data?.data || [];
    },
  });

  // If navigation passed a selectedVehicleId, pre-select it
  useEffect(() => {
    const passedVehicleId = (location.state as any)?.selectedVehicleId;
    if (passedVehicleId) {
      setVehicleId(passedVehicleId);
    } else if (!vehicleId && vehicles.length > 0) {
      setVehicleId(vehicles[0].id);
    }
  }, [location.state, vehicles]);

  // Find active job for overview live tracker
  const activeJob = jobs.find(
    (j: any) => j.status !== 'COMPLETED' && j.status !== 'CANCELLED'
  );

  // Add vehicle mutation
  const addVehicleMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post('/member-portal/vehicles', payload);
    },
    onSuccess: (res: any) => {
      toast.success('Vehicle added to your garage!');
      queryClient.invalidateQueries({ queryKey: ['member-portal-vehicles'] });
      setIsAddVehicleOpen(false);
      const createdId = res.data?.data?.id;
      if (createdId) setVehicleId(createdId);
      setNewVehicle({
        make: '',
        model: '',
        year: new Date().getFullYear(),
        licensePlate: '',
        tireSize: '225/65R17',
        color: '',
        vin: '',
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add vehicle');
    },
  });

  // Book service mutation
  const bookMemberService = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post('/jobs', payload);
    },
    onSuccess: () => {
      toast.success('Roadside assistance requested! A dispatcher is verifying arrival window.');
      queryClient.invalidateQueries({ queryKey: ['member-portal-jobs'] });
      navigate('/member/history');
      setAddress('');
      setCoords(null);
      setNotes('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    },
  });

  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !address) {
      toast.error('Vehicle and breakdown location are required');
      return;
    }

    const selectedVeh = vehicles.find((v: any) => v.id === vehicleId);
    const selectedSvc = MEMBER_SERVICE_OPTIONS.find((s) => s.name === serviceName) || MEMBER_SERVICE_OPTIONS[0];

    bookMemberService.mutate({
      vehicleId,
      countryCode: country,
      serviceAddress: address,
      serviceLatitude: coords?.latitude || null,
      serviceLongitude: coords?.longitude || null,
      urgency: 'URGENT',
      serviceItems: [
        {
          serviceName: selectedSvc.name,
          category: selectedSvc.category,
          quantity: 1,
          unitPriceCents: selectedSvc.priceCents,
        },
      ],
      problemNotes: `[Member Request] Tire: ${selectedVeh?.tireSize || 'N/A'}. ${notes}`.trim(),
      source: 'MEMBER_PORTAL',
    });
  };

  const handleAddVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.make.trim() || !newVehicle.model.trim()) {
      toast.error('Vehicle make and model are required');
      return;
    }
    addVehicleMutation.mutate(newVehicle);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            COMPLETED
          </span>
        );
      case 'UNVERIFIED_PUBLIC':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            PENDING DISPATCH
          </span>
        );
      case 'EN_ROUTE':
      case 'IN_PROGRESS':
      case 'ON_SCENE':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
            {status.replace('_', ' ')}
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Dynamic Header according to active page */}
      {activeView === 'overview' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Welcome back, {firstName}</h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 rounded-full font-semibold text-[11px]">
                <ShieldCheck className="w-3 h-3 text-amber-600" />
                <span>VIP Gold Member</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              24/7 Roadside Priority &bull; 10% Member Rate &bull; {vehicles.length} Vehicle{vehicles.length === 1 ? '' : 's'} Covered
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddVehicleOpen(true)}
              className="btn-secondary py-1.5 px-3 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={13} />
              <span>Add Vehicle</span>
            </button>
            <Link
              to="/member/request"
              className="btn-primary py-1.5 px-3.5 text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Wrench size={13} />
              <span>Request Service</span>
            </Link>
          </div>
        </div>
      )}

      {activeView === 'garage' && (
        <PageHeader
          title="My Digital Garage"
          subtitle="Vehicles registered for instant roadside and emergency assistance"
          badge={
            <span className="badge-brand inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-xs font-semibold">
              <Car className="w-3.5 h-3.5 text-red-600" />
              <span>{vehicles.length} Vehicle{vehicles.length === 1 ? '' : 's'}</span>
            </span>
          }
        />
      )}

      {activeView === 'request' && (
        <PageHeader
          title="Request Roadside Assistance"
          subtitle="Priority roadside assistance dispatched directly to your location"
          badge={
            <span className="badge-brand inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-bold">
              <Wrench className="w-3.5 h-3.5 text-red-600" />
              <span>Priority Member Dispatch</span>
            </span>
          }
        />
      )}

      {activeView === 'history' && (
        <PageHeader
          title="Service History"
          subtitle="Track your active jobs, dispatched technicians, and completed services"
          badge={
            <span className="badge-brand inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>{jobs.length} Total Service{jobs.length === 1 ? '' : 's'}</span>
            </span>
          }
        />
      )}

      {activeView === 'invoices' && (
        <PageHeader
          title="Invoices & Receipts"
          subtitle="Official billing statements, payment receipts, and itemized service invoices"
          badge={
            <span className="badge-brand inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-xs font-semibold">
              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
              <span>{invoices.length} Statement{invoices.length === 1 ? '' : 's'}</span>
            </span>
          }
        />
      )}

      {/* ======================================================== */}
      {/* 1. OVERVIEW PAGE (/member/dashboard)                     */}
      {/* ======================================================== */}
      {activeView === 'overview' && (
        <div className="space-y-6">
          {/* Active Job Tracker (Only rendered when there's an in-flight job) */}
          {activeJob && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 text-amber-800 rounded-lg mt-0.5">
                    <AlertCircle className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-900">Active Service Request</span>
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {activeJob.jobCode || `JOB-${activeJob.id.slice(0, 6)}`}
                      </span>
                      {getStatusBadge(activeJob.status)}
                    </div>
                    <div className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{activeJob.serviceAddress}</span>
                    </div>
                    {activeJob.status === 'UNVERIFIED_PUBLIC' && (
                      <p className="text-[11px] text-amber-800 mt-1">
                        Request received. Dispatcher is confirming technician arrival window.
                      </p>
                    )}
                  </div>
                </div>
                <Link
                  to="/member/history"
                  className="btn-secondary py-1.5 px-3 text-xs font-semibold self-start sm:self-center inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <span>Track Status</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          )}

          {/* Minimal 2-Column Core: My Vehicles & Recent Services */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Covered Vehicles */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-slate-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Covered Vehicles ({vehicles.length})</h3>
                </div>
                <Link to="/member/garage" className="text-xs text-red-600 hover:text-red-700 font-semibold inline-flex items-center gap-1">
                  <span>Manage</span>
                  <ArrowRight size={12} />
                </Link>
              </div>

              <div className="p-4 divide-y divide-slate-100 flex-1">
                {vehicles.map((v: any) => (
                  <div key={v.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {v.year} {v.make} {v.model}
                        </span>
                        <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-700">
                          {v.licensePlate || 'NO PLATE'}
                        </span>
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        Tire: <strong className="text-slate-700 font-mono font-medium">{v.tireSize || 'Standard'}</strong>
                        {v.color && ` &bull; ${v.color}`}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/member/request', { state: { selectedVehicleId: v.id } })}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 transition cursor-pointer whitespace-nowrap inline-flex items-center gap-1"
                    >
                      <Wrench size={12} />
                      <span>Request Help</span>
                    </button>
                  </div>
                ))}
                {vehicles.length === 0 && (
                  <div className="py-8 text-center text-slate-400 text-xs space-y-2">
                    <p>No vehicles registered in your garage yet.</p>
                    <button
                      type="button"
                      onClick={() => setIsAddVehicleOpen(true)}
                      className="btn-primary py-1 px-3 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Add Vehicle</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Recent Activity & Invoices */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Recent Activity</h3>
                </div>
                <Link to="/member/history" className="text-xs text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1">
                  <span>View All</span>
                  <ArrowRight size={12} />
                </Link>
              </div>

              <div className="p-4 divide-y divide-slate-100 flex-1">
                {jobs.slice(0, 3).map((j: any) => (
                  <div key={j.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{j.jobCode || `JOB-${j.id.slice(0, 6)}`}</span>
                        {getStatusBadge(j.status)}
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5 truncate max-w-[220px]">
                        {j.serviceAddress}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-slate-900">
                        {formatCurrency(centsToDollars(j.totalCents || 0), currencySymbol)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(j.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
                {jobs.length === 0 && (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No recent service activity recorded.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Minimal Member Benefits Strip */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span><strong>24/7 Priority Queue:</strong> First in line for dispatch</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span><strong>10% Member Rate:</strong> Applied automatically</span>
            </div>
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-blue-600 shrink-0" />
              <span><strong>Garage Coverage:</strong> Instant dispatch by plate</span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MY GARAGE PAGE (/member/garage)                       */}
      {/* ======================================================== */}
      {activeView === 'garage' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Registered Vehicles</h3>
              <p className="text-xs text-slate-500">Vehicles eligible for instant roadside emergency dispatch</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddVehicleOpen(true)}
              className="btn-primary py-1.5 px-3.5 text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Vehicle</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {vehicles.map((v: any) => (
              <div key={v.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-800">
                    {v.licensePlate || 'NO PLATE'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{v.year}</span>
                </div>
                <div className="font-bold text-sm text-slate-900">{v.make} {v.model}</div>
                <div className="text-xs text-slate-500">
                  Tire Size: <strong className="text-red-700 font-mono">{v.tireSize || '225/65R17'}</strong>
                </div>
                {v.color && (
                  <div className="text-[11px] text-slate-400">Color: {v.color}</div>
                )}
                {v.vin && (
                  <div className="text-[10px] text-slate-400 font-mono">VIN: {v.vin}</div>
                )}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => navigate('/member/request', { state: { selectedVehicleId: v.id } })}
                    className="w-full text-center py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition cursor-pointer"
                  >
                    Request Roadside for This Vehicle
                  </button>
                </div>
              </div>
            ))}
            {vehicles.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs space-y-3 bg-white rounded-xl border border-dashed border-slate-300">
                <Car className="w-8 h-8 text-slate-300 mx-auto" />
                <div>No saved vehicles in your garage yet.</div>
                <button
                  type="button"
                  onClick={() => setIsAddVehicleOpen(true)}
                  className="btn-primary py-2 px-4 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Your First Vehicle</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. REQUEST SERVICE PAGE (/member/request)                */}
      {/* ======================================================== */}
      {activeView === 'request' && (
        <form onSubmit={handleSubmitBooking} className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs max-w-xl space-y-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
            <span className="font-semibold text-slate-900 block">Priority Roadside Dispatch</span>
            Your request will be queued for immediate dispatcher verification and mobile technician routing.
          </div>

          {vehicles.length === 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center justify-between gap-3">
              <div>
                <strong className="block font-semibold">No vehicle in your garage</strong>
                Please add a vehicle to request roadside service.
              </div>
              <button
                type="button"
                onClick={() => setIsAddVehicleOpen(true)}
                className="btn-primary py-1 px-2.5 text-xs font-bold whitespace-nowrap inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} />
                <span>Add Vehicle</span>
              </button>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700">Select Vehicle *</label>
              <button
                type="button"
                onClick={() => setIsAddVehicleOpen(true)}
                className="text-[11px] text-red-600 hover:text-red-700 font-semibold inline-flex items-center gap-0.5 cursor-pointer"
              >
                <Plus size={12} />
                <span>Add New Vehicle</span>
              </button>
            </div>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="select-base mt-1"
              required
            >
              <option value="">-- Choose vehicle --</option>
              {vehicles.map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.licensePlate ? `[${v.licensePlate}] ` : ''}{v.year} {v.make} {v.model} ({v.tireSize || 'TBD'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700">Roadside Service (10% VIP Rate)</label>
            <select
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              className="select-base mt-1"
            >
              {MEMBER_SERVICE_OPTIONS.map((svc) => (
                <option key={svc.name} value={svc.name}>
                  {svc.name} &bull; {formatCurrency(centsToDollars(svc.priceCents), currencySymbol)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700">Breakdown Location *</label>
            <div className="mt-1">
              <AddressAutocompleteInput
                value={address}
                countryCode={country}
                onChange={(val) => setAddress(val)}
                onSelectLocation={(loc) => {
                  setAddress(loc.address);
                  setCoords({ latitude: loc.latitude, longitude: loc.longitude });
                }}
                placeholder="e.g. 100 King St West, Toronto or Hwy 401 Eastbound shoulder"
                required
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700">Describe the Issue</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Front driver-side flat tire, pulled onto shoulder"
              className="textarea-base mt-1"
              rows={2}
            />
          </div>

          <button
            type="submit"
            disabled={bookMemberService.isPending || !vehicleId}
            className="btn-primary w-full py-2.5 text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            {bookMemberService.isPending ? 'Requesting Unit...' : 'Dispatch Roadside Unit Now'}
          </button>
        </form>
      )}

      {/* ======================================================== */}
      {/* 4. SERVICE HISTORY PAGE (/member/history)                */}
      {/* ======================================================== */}
      {activeView === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-900 text-xs">All Member Service Callouts</h4>
              <p className="text-[11px] text-slate-500">Live request status, arrival confirmation, and itemized billing</p>
            </div>
            <Link
              to="/member/request"
              className="btn-primary py-1 px-3 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus size={12} />
              <span>New Request</span>
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {jobs.map((j: any) => (
              <div key={j.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/50 transition">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{j.jobCode || `JOB-${j.id.slice(0, 6)}`}</span>
                    {getStatusBadge(j.status)}
                  </div>
                  <div className="text-slate-600 flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{j.serviceAddress}</span>
                  </div>
                  {j.problemNotes && (
                    <div className="text-slate-500 text-[11px] mt-0.5 italic">
                      "{j.problemNotes}"
                    </div>
                  )}
                  {j.driver && (
                    <div className="text-blue-700 font-semibold text-[11px] mt-0.5 flex items-center gap-1">
                      <PhoneCall size={11} />
                      <span>Assigned Driver: {j.driver.fullName} ({j.driver.phone})</span>
                    </div>
                  )}
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <div className="font-mono font-bold text-slate-900">
                    {formatCurrency(centsToDollars(j.totalCents || 0), currencySymbol)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(j.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
            {jobs.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                <Clock className="w-7 h-7 text-slate-300 mx-auto" />
                <div>No roadside service records found.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. INVOICES & RECEIPTS PAGE (/member/invoices)           */}
      {/* ======================================================== */}
      {activeView === 'invoices' && (
        <div className="space-y-6">
          {/* Member Invoices */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-xs">Official Member Invoices</h4>
                <p className="text-[11px] text-slate-500">Official billing statements and itemized work receipts</p>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {invoices.map((inv: any) => {
                const isPaid = inv.status === 'PAID';
                return (
                  <div key={inv.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/50 transition">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{inv.invoiceNumber}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isPaid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          inv.status === 'PARTIAL' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {inv.status}
                        </span>
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        Issued: {new Date(inv.issueDate || inv.createdAt).toLocaleDateString()}
                        {inv.dueDate && ` &bull; Due: ${new Date(inv.dueDate).toLocaleDateString()}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-mono font-bold text-slate-900">
                          {formatCurrency(centsToDollars(inv.totalCents), currencySymbol)}
                        </div>
                        {!isPaid && (
                          <div className="text-[11px] text-amber-600 font-medium">
                            Due: {formatCurrency(centsToDollars(inv.balanceDueCents ?? inv.totalCents), currencySymbol)}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedInvoiceId(inv.id)}
                        className="btn-secondary py-1 px-2.5 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <FileText size={12} />
                        <span>PDF</span>
                      </button>
                    </div>
                  </div>
                );
              })}
              {invoices.length === 0 && (
                <div className="p-6 text-center text-slate-400 text-xs">No invoices generated yet.</div>
              )}
            </div>
          </div>

          {/* Payment Receipts */}
          {receipts.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h4 className="font-bold text-slate-900 text-xs">Payment Receipts</h4>
              </div>
              <div className="divide-y divide-slate-100">
                {receipts.map((r: any) => (
                  <div key={r.id} className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-mono font-bold text-slate-900">{r.jobCode}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        Settled on {r.completedAt ? new Date(r.completedAt).toLocaleDateString() : 'Recent'}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="font-mono font-bold text-emerald-700">
                        {formatCurrency(centsToDollars(r.totalCents), currencySymbol)}
                      </div>
                      {r.receiptUrl ? (
                        <a
                          href={r.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary text-[11px] py-1 px-2"
                        >
                          Receipt
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Settled</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* Modals: Add Vehicle & Invoice PDF                        */}
      {/* ======================================================== */}

      {/* Add Vehicle Modal */}
      {isAddVehicleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl border border-slate-200 overflow-hidden text-xs">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-red-600" />
                <h3 className="font-bold text-slate-900 text-sm">Add Vehicle to Garage</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddVehicleOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddVehicleSubmit} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Make *</label>
                  <input
                    type="text"
                    value={newVehicle.make}
                    onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
                    placeholder="e.g. Toyota"
                    className="input-base mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Model *</label>
                  <input
                    type="text"
                    value={newVehicle.model}
                    onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                    placeholder="e.g. RAV4"
                    className="input-base mt-1"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Year</label>
                  <input
                    type="number"
                    value={newVehicle.year}
                    onChange={(e) => setNewVehicle({ ...newVehicle, year: Number(e.target.value) })}
                    className="input-base mt-1 font-mono"
                    min="1980"
                    max={new Date().getFullYear() + 1}
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">License Plate</label>
                  <input
                    type="text"
                    value={newVehicle.licensePlate}
                    onChange={(e) => setNewVehicle({ ...newVehicle, licensePlate: e.target.value.toUpperCase() })}
                    placeholder="e.g. ABCD-123"
                    className="input-base mt-1 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Tire Size</label>
                  <input
                    type="text"
                    value={newVehicle.tireSize}
                    onChange={(e) => setNewVehicle({ ...newVehicle, tireSize: e.target.value })}
                    placeholder="e.g. 225/65R17"
                    className="input-base mt-1 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Color</label>
                  <input
                    type="text"
                    value={newVehicle.color}
                    onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
                    placeholder="e.g. Silver"
                    className="input-base mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">VIN (Optional)</label>
                <input
                  type="text"
                  value={newVehicle.vin}
                  onChange={(e) => setNewVehicle({ ...newVehicle, vin: e.target.value.toUpperCase() })}
                  placeholder="17-character VIN"
                  className="input-base mt-1 font-mono uppercase text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddVehicleOpen(false)}
                  className="btn-secondary py-1.5 px-3 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addVehicleMutation.isPending}
                  className="btn-primary py-1.5 px-3.5 text-xs font-bold cursor-pointer"
                >
                  {addVehicleMutation.isPending ? 'Saving...' : 'Save to Garage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice PDF Modal */}
      {selectedInvoiceId && (
        <InvoicePdfModal
          isOpen={!!selectedInvoiceId}
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
          onStatusUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['member-portal-invoices'] });
          }}
        />
      )}
    </div>
  );
}

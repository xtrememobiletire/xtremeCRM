import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Truck, Users, Clock, FileText, CheckCircle2,
  MapPin, Phone, Mail, Globe, Plus, Trash2,
  LogOut, ArrowLeft, Building2, X,
  Calendar, Layers, ShieldCheck
} from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { useSocket } from '../context/SocketContext';
import { formatCurrency, centsToDollars } from '../utils/currency';
import InvoicePdfModal from '../components/invoices/InvoicePdfModal';
import { toast } from 'sonner';

type Tab = 'dashboard' | 'vehicles' | 'drivers' | 'request' | 'status' | 'pending-invoices' | 'paid-invoices';

export default function FleetDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { currencySymbol } = useTenant();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [pendingSearch, setPendingSearch] = useState('');
  const [paidSearch, setPaidSearch] = useState('');

  // Modals for adding vehicle & driver
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [isAssignVehicleOpen, setIsAssignVehicleOpen] = useState(false);
  const [assigningDriver, setAssigningDriver] = useState<any | null>(null);
  const [assignPlate, setAssignPlate] = useState('');

  // New vehicle form state
  const [newVehicle, setNewVehicle] = useState({
    year: new Date().getFullYear(),
    make: '',
    model: '',
    licensePlate: '',
    tireSize: '11R22.5',
    vin: '',
  });

  // New driver form state
  const [newDriver, setNewDriver] = useState({
    fullName: '',
    phone: '',
    licensePlate: '',
  });

  // Booking Form State
  const [bookingForm, setBookingForm] = useState({
    appointmentDate: '',
    vehicleId: '',
    serviceName: 'New Tire Replacement',
    serviceType: 'STANDARD' as 'STANDARD' | 'EMERGENCY',
    contactPhone: '',
    tireSize: '11R22.5',
    address: '10100 Richmond Hwy, Lorton, VA 22079',
    notes: '',
  });

  // 1. Dashboard KPI query
  const { data: dashboardData } = useQuery({
    queryKey: ['fleet-portal-dashboard'],
    queryFn: async () => {
      const res = await api.get('/fleet-portal/dashboard');
      return res.data?.data;
    },
    staleTime: 30000,
  });

  const fleet = dashboardData?.fleet;

  // 2. Vehicles Query
  const { data: vehicles = [] } = useQuery({
    queryKey: ['fleet-portal-vehicles'],
    queryFn: async () => {
      const res = await api.get('/fleet-portal/vehicles');
      return res.data?.data || [];
    },
    staleTime: 30000,
  });

  // 3. Drivers Query
  const { data: drivers = [] } = useQuery({
    queryKey: ['fleet-portal-drivers'],
    queryFn: async () => {
      const res = await api.get('/fleet-portal/drivers');
      return res.data?.data || [];
    },
    staleTime: 30000,
  });

  // 4. Jobs / Service Status Query
  const { data: jobs = [] } = useQuery({
    queryKey: ['fleet-portal-jobs'],
    queryFn: async () => {
      const res = await api.get('/fleet-portal/jobs');
      return res.data?.data || [];
    },
    staleTime: 15000,
  });

  // 5. Invoices Query
  const { data: pendingInvoices = [] } = useQuery({
    queryKey: ['fleet-portal-invoices', 'PENDING'],
    queryFn: async () => {
      const res = await api.get('/fleet-portal/invoices?status=PENDING');
      return res.data?.data || [];
    },
    staleTime: 30000,
  });

  const { data: paidInvoices = [] } = useQuery({
    queryKey: ['fleet-portal-invoices', 'PAID'],
    queryFn: async () => {
      const res = await api.get('/fleet-portal/invoices?status=PAID');
      return res.data?.data || [];
    },
    staleTime: 30000,
  });

  // Real-time synchronization with dispatch & technician actions
  useEffect(() => {
    if (!socket) return;
    const handleJobUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['fleet-portal-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-portal-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-portal-invoices'] });
    };

    socket.on('job:created', handleJobUpdate);
    socket.on('job:status_updated', handleJobUpdate);
    socket.on('job:assigned', handleJobUpdate);

    return () => {
      socket.off('job:created', handleJobUpdate);
      socket.off('job:status_updated', handleJobUpdate);
      socket.off('job:assigned', handleJobUpdate);
    };
  }, [socket, queryClient]);

  // Request Service Mutation
  const bookServiceMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post('/fleet-portal/request-service', payload);
    },
    onSuccess: () => {
      toast.success('Service request submitted successfully! Dispatch has been notified.');
      queryClient.invalidateQueries({ queryKey: ['fleet-portal-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-portal-dashboard'] });
      setActiveTab('status');
      setBookingForm((prev) => ({
        ...prev,
        appointmentDate: '',
        notes: '',
      }));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit service request');
    },
  });

  // Add Vehicle Mutation
  const addVehicleMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post('/fleet-portal/vehicles', payload);
    },
    onSuccess: () => {
      toast.success('Vehicle registered successfully');
      queryClient.invalidateQueries({ queryKey: ['fleet-portal-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-portal-dashboard'] });
      setIsAddVehicleOpen(false);
      setNewVehicle({
        year: new Date().getFullYear(),
        make: '',
        model: '',
        licensePlate: '',
        tireSize: '11R22.5',
        vin: '',
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to register vehicle');
    },
  });

  // Delete Vehicle Mutation
  const deleteVehicleMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/fleet-portal/vehicles/${id}`);
    },
    onSuccess: () => {
      toast.success('Vehicle removed');
      queryClient.invalidateQueries({ queryKey: ['fleet-portal-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-portal-dashboard'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete vehicle');
    },
  });

  // Add Driver Mutation
  const addDriverMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post('/fleet-portal/drivers', payload);
    },
    onSuccess: () => {
      toast.success('Driver registered successfully');
      queryClient.invalidateQueries({ queryKey: ['fleet-portal-drivers'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-portal-dashboard'] });
      setIsAddDriverOpen(false);
      setNewDriver({ fullName: '', phone: '', licensePlate: '' });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to register driver');
    },
  });

  // Delete Driver Mutation
  const deleteDriverMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/fleet-portal/drivers/${id}`);
    },
    onSuccess: () => {
      toast.success('Driver removed');
      queryClient.invalidateQueries({ queryKey: ['fleet-portal-drivers'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-portal-dashboard'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete driver');
    },
  });

  // Update Driver Mutation (for assigning vehicle)
  const updateDriverMutation = useMutation({
    mutationFn: async ({ id, licensePlate }: { id: string; licensePlate: string }) => {
      return await api.patch(`/fleet-portal/drivers/${id}`, { licensePlate });
    },
    onSuccess: () => {
      toast.success('Vehicle assigned to driver successfully');
      queryClient.invalidateQueries({ queryKey: ['fleet-portal-drivers'] });
      setIsAssignVehicleOpen(false);
      setAssigningDriver(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to assign vehicle');
    },
  });

  // Vehicle select handler for booking form
  const handleVehicleSelect = (vId: string) => {
    const selectedVeh = vehicles.find((v: any) => v.id === vId);
    setBookingForm((prev) => ({
      ...prev,
      vehicleId: vId,
      tireSize: selectedVeh?.tireSize || prev.tireSize,
    }));
  };

  const handleBookService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForm.vehicleId && !bookingForm.tireSize) {
      toast.error('Please select a vehicle or enter tire size');
      return;
    }
    if (!bookingForm.address) {
      toast.error('Please provide a breakdown / service location address');
      return;
    }

    bookServiceMutation.mutate({
      vehicleId: bookingForm.vehicleId || undefined,
      appointmentDate: bookingForm.appointmentDate || undefined,
      serviceName: bookingForm.serviceName,
      serviceType: bookingForm.serviceType,
      serviceAddress: bookingForm.address,
      contactPhone: bookingForm.contactPhone || fleet?.contactPhone,
      tireSize: bookingForm.tireSize,
      notes: bookingForm.notes,
    });
  };

  // Filtered pending invoices
  const filteredPendingInvoices = useMemo(() => {
    const q = pendingSearch.trim().toLowerCase();
    if (!q) return pendingInvoices;
    return pendingInvoices.filter((inv: any) =>
      inv.invoiceNumber?.toLowerCase().includes(q) ||
      inv.notes?.toLowerCase().includes(q)
    );
  }, [pendingInvoices, pendingSearch]);

  // Filtered paid invoices
  const filteredPaidInvoices = useMemo(() => {
    const q = paidSearch.trim().toLowerCase();
    if (!q) return paidInvoices;
    return paidInvoices.filter((inv: any) =>
      inv.invoiceNumber?.toLowerCase().includes(q) ||
      inv.notes?.toLowerCase().includes(q)
    );
  }, [paidInvoices, paidSearch]);

  const navTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Layers },
    { id: 'vehicles', label: 'Vehicles', icon: Truck },
    { id: 'drivers', label: 'My Drivers', icon: Users },
    { id: 'request', label: 'Request New Service', icon: Calendar },
    { id: 'status', label: 'Service Status', icon: Clock },
    { id: 'pending-invoices', label: 'Pending Invoices', icon: FileText },
    { id: 'paid-invoices', label: 'Paid Invoices', icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-[#0d0e12] text-slate-100 font-sans flex flex-col antialiased selection:bg-red-600 selection:text-white">
      {/* TOP HEADER (Matches Screenshot 1) */}
      <header className="h-16 bg-[#131419] border-b border-[#22232c] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-red-600 font-black tracking-wider text-xs uppercase">Xtreme Mobile Tire</span>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">|</span>
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Fleet Manager Portal</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <h1 className="text-base font-bold text-white leading-tight">
                {fleet?.companyName || 'KT Group'}
              </h1>
              <span className="text-xs font-mono font-bold text-red-500">
                {fleet?.accountCode || 'XMT-5132'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Admin Exit Preview button */}
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => navigate('/dashboard')}
              className="text-xs bg-[#1f2029] hover:bg-[#2b2c38] text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-[#2e303d] flex items-center gap-1.5 transition"
              title="Return to Staff CRM"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit to CRM</span>
            </button>
          )}

          {/* Approved Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/70 border border-emerald-500/40 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved</span>
          </span>

          {/* Sign Out Button */}
          <button
            onClick={() => logout()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1a1b22] hover:bg-[#262731] border border-[#2d2e3a] text-slate-300 hover:text-white transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row min-w-0">
        {/* SIDEBAR NAVIGATION (Matches Screenshots) */}
        <aside className="w-full md:w-64 bg-[#111216] border-r border-[#1f2028] p-3 md:p-4 shrink-0 flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap text-left ${
                  isActive
                    ? 'bg-[#e5252a] text-white shadow-md shadow-red-900/30'
                    : 'text-slate-400 hover:text-white hover:bg-[#1a1b22]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-6xl w-full">
          {/* 1. DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">Dashboard</h2>

              {/* 3 Top Cards (Image 1) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Vehicles Card */}
                <div 
                  onClick={() => setActiveTab('vehicles')}
                  className="bg-[#18191e] border border-[#272832] rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-red-600/50 transition group"
                >
                  <div className="w-10 h-10 rounded-full bg-red-950/40 border border-red-500/20 flex items-center justify-center text-red-500 mb-2 group-hover:scale-110 transition">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="text-3xl font-bold text-white font-mono">
                    {vehicles.length}
                  </div>
                  <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mt-1">
                    Vehicles
                  </div>
                </div>

                {/* Drivers Card */}
                <div 
                  onClick={() => setActiveTab('drivers')}
                  className="bg-[#18191e] border border-[#272832] rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-red-600/50 transition group"
                >
                  <div className="w-10 h-10 rounded-full bg-red-950/40 border border-red-500/20 flex items-center justify-center text-red-500 mb-2 group-hover:scale-110 transition">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="text-3xl font-bold text-white font-mono">
                    {drivers.length}
                  </div>
                  <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mt-1">
                    Drivers
                  </div>
                </div>

                {/* Company Card */}
                <div className="bg-[#18191e] border border-[#272832] rounded-xl p-6 flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 rounded-full bg-red-950/40 border border-red-500/20 flex items-center justify-center text-red-500 mb-2">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="text-lg font-bold text-white truncate max-w-[200px]">
                    {fleet?.companyName || 'KT Group'}
                  </div>
                  <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mt-1">
                    Company
                  </div>
                </div>
              </div>

              {/* Company Details Card (Image 1) */}
              <div className="bg-[#18191e] border border-[#272832] rounded-xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Company Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-xs">
                  {/* Email */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-red-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</div>
                      <div className="text-white mt-0.5 font-medium select-all">
                        {fleet?.contactEmail || 'piratheep@xtrememobiletire.com'}
                      </div>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-red-500">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</div>
                      <div className="text-white mt-0.5 font-mono font-medium">
                        {fleet?.contactPhone || '1-866-686-9660'}
                      </div>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-red-500">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Address</div>
                      <div className="text-white mt-0.5 font-medium">
                        {fleet?.address || '10100 Richmond Hwy, Lorton, VA 22079'}
                      </div>
                    </div>
                  </div>

                  {/* Website */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-red-500">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Website</div>
                      <a 
                        href={fleet?.website || 'https://www.ktgroupcanada.ca/'}
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-white hover:text-red-400 mt-0.5 font-medium inline-flex items-center gap-1 transition underline-offset-2 hover:underline"
                      >
                        <span>{fleet?.website || 'https://www.ktgroupcanada.ca/'}</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Support Banner (Image 1) */}
              <div className="bg-[#2a1315] border border-red-900/40 rounded-xl p-4 text-center text-xs text-red-400">
                Need help or have questions about your fleet account? Contact us at{' '}
                <a href="mailto:admin@xtrememobiletire.com" className="font-bold underline hover:text-red-300">
                  admin@xtrememobiletire.com
                </a>
              </div>
            </div>
          )}

          {/* 2. VEHICLES TAB */}
          {activeTab === 'vehicles' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Truck className="w-5 h-5 text-red-500" />
                    <span>Registered Fleet Vehicles ({vehicles.length})</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Manage vehicles authorized for 24/7 roadside tire repair and maintenance</p>
                </div>
                <button
                  onClick={() => setIsAddVehicleOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-md shadow-red-900/30"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Vehicle</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicles.map((v: any) => (
                  <div key={v.id} className="bg-[#18191e] border border-[#272832] rounded-xl p-4 space-y-3 relative group hover:border-[#383a48] transition">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 bg-[#252733] border border-[#343644] rounded text-white">
                        {v.licensePlate || 'NO PLATE'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-mono">{v.year}</span>
                        <button
                          onClick={() => deleteVehicleMutation.mutate(v.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition p-1"
                          title="Remove Vehicle"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="font-bold text-sm text-white">{v.make} {v.model}</div>
                      {v.vin && <div className="text-[10px] font-mono text-slate-500 mt-0.5">VIN: {v.vin}</div>}
                    </div>

                    <div className="pt-2 border-t border-[#252733] flex items-center justify-between text-xs">
                      <span className="text-slate-400">Tire Spec:</span>
                      <strong className="text-red-500 font-mono font-bold">{v.tireSize || '11R22.5'}</strong>
                    </div>
                  </div>
                ))}

                {vehicles.length === 0 && (
                  <div className="col-span-full bg-[#18191e] border border-[#272832] rounded-xl py-12 text-center text-slate-400 text-xs space-y-3">
                    <Truck className="w-8 h-8 text-slate-600 mx-auto" />
                    <div>No fleet vehicles registered yet.</div>
                    <button
                      onClick={() => setIsAddVehicleOpen(true)}
                      className="inline-flex items-center gap-1 text-red-500 hover:text-red-400 font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Register your first vehicle</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. MY DRIVERS TAB */}
          {activeTab === 'drivers' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-red-500" />
                    <span>Authorized Fleet Drivers ({drivers.length})</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Drivers verified by dispatch during 24/7 roadside breakdown calls</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAddVehicleOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#252733] hover:bg-[#323444] text-slate-200 border border-[#3b3d4f] text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <Truck className="w-4 h-4 text-red-500" />
                    <span>+ Add Vehicle</span>
                  </button>
                  <button
                    onClick={() => setIsAddDriverOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-md shadow-red-900/30 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Driver</span>
                  </button>
                </div>
              </div>

              <div className="bg-[#18191e] border border-[#272832] rounded-xl divide-y divide-[#252733] overflow-hidden">
                {drivers.map((d: any) => (
                  <div key={d.id} className="p-4 flex items-center justify-between text-xs hover:bg-[#1d1f27] transition">
                    <div className="space-y-1">
                      <div className="font-bold text-white text-sm">{d.fullName}</div>
                      <div className="text-slate-400 font-mono flex items-center gap-2">
                        <Phone className="w-3 h-3 text-red-500" />
                        <span>{d.phone}</span>
                        {d.licensePlate && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span className="px-1.5 py-0.5 bg-[#252733] text-slate-300 rounded font-mono text-[10px]">
                              Plate: {d.licensePlate}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Add/Assign Vehicle button for this driver */}
                      <button
                        onClick={() => {
                          setAssigningDriver(d);
                          setAssignPlate(d.licensePlate || '');
                          setIsAssignVehicleOpen(true);
                        }}
                        className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
                          d.licensePlate
                            ? 'bg-[#252733] hover:bg-[#323444] text-slate-200 border-[#3a3c4c]'
                            : 'bg-red-950/40 hover:bg-red-900/50 text-red-400 border-red-500/30'
                        }`}
                        title="Add or Change Assigned Vehicle"
                      >
                        <Truck className="w-3.5 h-3.5 text-red-500" />
                        <span>{d.licensePlate ? `Vehicle: ${d.licensePlate}` : '+ Add Vehicle'}</span>
                      </button>

                      <span className="px-2.5 py-1 bg-emerald-950/70 text-emerald-400 border border-emerald-500/30 rounded-full font-semibold text-[11px] hidden sm:flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Authorized</span>
                      </span>

                      <button
                        onClick={() => deleteDriverMutation.mutate(d.id)}
                        className="text-slate-500 hover:text-red-400 transition p-1 cursor-pointer"
                        title="Remove Driver"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {drivers.length === 0 && (
                  <div className="py-12 text-center text-slate-400 text-xs space-y-3">
                    <Users className="w-8 h-8 text-slate-600 mx-auto" />
                    <div>No authorized drivers registered yet.</div>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => setIsAddDriverOpen(true)}
                        className="inline-flex items-center gap-1 text-red-500 hover:text-red-400 font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Register your first driver</span>
                      </button>
                      <span className="text-slate-600">•</span>
                      <button
                        onClick={() => setIsAddVehicleOpen(true)}
                        className="inline-flex items-center gap-1 text-slate-400 hover:text-white font-bold"
                      >
                        <Truck className="w-3.5 h-3.5 text-red-500" />
                        <span>Add Vehicle</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. REQUEST NEW SERVICE (Image 5) */}
          {activeTab === 'request' && (
            <div className="max-w-2xl space-y-4">
              <div>
                <h2 className="text-xl font-bold text-white">Book an Appointment</h2>
                <p className="text-xs text-slate-400 mt-0.5">Fill in the details below to request a new service.</p>
              </div>

              <form onSubmit={handleBookService} className="bg-[#18191e] border border-[#272832] rounded-xl p-6 space-y-4 text-xs">
                {/* APPOINTMENT DATE & TIME */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Appointment Date & Time *
                    </label>
                    <span className="text-[10px] text-slate-500">24/7 Hours</span>
                  </div>
                  <input
                    type="datetime-local"
                    value={bookingForm.appointmentDate}
                    onChange={(e) => setBookingForm({ ...bookingForm, appointmentDate: e.target.value })}
                    className="w-full mt-1.5 px-3 py-2.5 bg-[#101115] border border-[#2c2d3a] rounded-lg text-white text-xs focus:outline-none focus:border-red-500 transition"
                    required
                  />
                </div>

                {/* VEHICLE */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Vehicle
                  </label>
                  <select
                    value={bookingForm.vehicleId}
                    onChange={(e) => handleVehicleSelect(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2.5 bg-[#101115] border border-[#2c2d3a] rounded-lg text-white text-xs focus:outline-none focus:border-red-500 transition"
                  >
                    <option value="">Select a vehicle...</option>
                    {vehicles.map((v: any) => (
                      <option key={v.id} value={v.id}>
                        {v.licensePlate ? `[${v.licensePlate}] ` : ''}{v.year} {v.make} {v.model} ({v.tireSize || '11R22.5'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* SELECT SERVICE & SERVICE TYPE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Select Service *
                    </label>
                    <select
                      value={bookingForm.serviceName}
                      onChange={(e) => setBookingForm({ ...bookingForm, serviceName: e.target.value })}
                      className="w-full mt-1.5 px-3 py-2.5 bg-[#101115] border border-[#2c2d3a] rounded-lg text-white text-xs focus:outline-none focus:border-red-500 transition"
                      required
                    >
                      <option value="New Tire Replacement">New Tire Replacement</option>
                      <option value="Used tire replacement">Used tire replacement</option>
                      <option value="Tire Repair (plug)">Tire Repair (plug)</option>
                      <option value="Tire Swap (ON RIM)">Tire Swap (ON RIM)</option>
                      <option value="Spare Tire Change">Spare Tire Change</option>
                      <option value="Battery Booster">Jump Start / Booster</option>
                      <option value="Emergency Roadside Assistance">Emergency Roadside Assistance</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Service Type
                    </label>
                    <select
                      value={bookingForm.serviceType}
                      onChange={(e) => setBookingForm({ ...bookingForm, serviceType: e.target.value as any })}
                      className="w-full mt-1.5 px-3 py-2.5 bg-[#101115] border border-[#2c2d3a] rounded-lg text-white text-xs focus:outline-none focus:border-red-500 transition"
                    >
                      <option value="STANDARD">Standard Service</option>
                      <option value="EMERGENCY">Roadside Emergency (Priority)</option>
                    </select>
                  </div>
                </div>

                {/* PHONE NUMBER & TIRE SIZE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={bookingForm.contactPhone}
                      onChange={(e) => setBookingForm({ ...bookingForm, contactPhone: e.target.value })}
                      placeholder={fleet?.contactPhone || '1-866-686-9660'}
                      className="w-full mt-1.5 px-3 py-2.5 bg-[#101115] border border-[#2c2d3a] rounded-lg text-white text-xs focus:outline-none focus:border-red-500 transition"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Tire Size
                    </label>
                    <input
                      type="text"
                      value={bookingForm.tireSize}
                      onChange={(e) => setBookingForm({ ...bookingForm, tireSize: e.target.value })}
                      placeholder="e.g. 235/65R17 or 11R22.5"
                      className="w-full mt-1.5 px-3 py-2.5 bg-[#101115] border border-[#2c2d3a] rounded-lg text-white text-xs font-mono focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                </div>

                {/* ADDRESS */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Address
                  </label>
                  <input
                    type="text"
                    value={bookingForm.address}
                    onChange={(e) => setBookingForm({ ...bookingForm, address: e.target.value })}
                    placeholder="Enter service address or breakdown location"
                    className="w-full mt-1.5 px-3 py-2.5 bg-[#101115] border border-[#2c2d3a] rounded-lg text-white text-xs focus:outline-none focus:border-red-500 transition"
                    required
                  />
                </div>

                {/* NOTES */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Wheel Position / Breakdown Notes
                  </label>
                  <textarea
                    value={bookingForm.notes}
                    onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                    placeholder="e.g. Driver side trailer front axle flat tire"
                    rows={2}
                    className="w-full mt-1.5 px-3 py-2.5 bg-[#101115] border border-[#2c2d3a] rounded-lg text-white text-xs focus:outline-none focus:border-red-500 transition resize-none"
                  />
                </div>

                {/* SUBMIT BUTTON (Full-width bright red) */}
                <button
                  type="submit"
                  disabled={bookServiceMutation.isPending}
                  className="w-full py-3 bg-[#e5252a] hover:bg-[#c91e23] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition shadow-lg shadow-red-950/50 cursor-pointer mt-2"
                >
                  {bookServiceMutation.isPending ? 'Submitting Request...' : 'SUBMIT REQUEST'}
                </button>
              </form>
            </div>
          )}

          {/* 5. SERVICE STATUS (Image 4) */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-white">Service Status</h2>
                <p className="text-xs text-slate-400 mt-0.5">Track the status of your submitted service requests.</p>
              </div>

              <div className="bg-[#18191e] border border-[#272832] rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-[#252733] text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">APPT #</th>
                      <th className="py-3 px-4">SERVICE</th>
                      <th className="py-3 px-4">TYPE</th>
                      <th className="py-3 px-4">VEHICLE</th>
                      <th className="py-3 px-4">TIRE SIZE</th>
                      <th className="py-3 px-4">ADDRESS</th>
                      <th className="py-3 px-4">PHONE</th>
                      <th className="py-3 px-4">APPOINTMENT DATE</th>
                      <th className="py-3 px-4">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#252733]">
                    {jobs.map((j: any, index: number) => {
                      const serviceTitle = j.serviceItems?.[0]?.serviceName || 'Tire Service';
                      const vehicleDesc = j.vehicle
                        ? `${j.vehicle.make} ${j.vehicle.model} (${j.vehicle.licensePlate || 'NONE'})`
                        : '(NONE)';
                      const tireSize = j.vehicle?.tireSize || '11R22.5';
                      const apptNum = `#${jobs.length - index}`;
                      const formattedDate = j.scheduledFor || j.appointmentDate || j.createdAt
                        ? new Date(j.scheduledFor || j.appointmentDate || j.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Immediate';

                      return (
                        <tr key={j.id} className="hover:bg-[#1f2029] transition">
                          <td className="py-3.5 px-4 font-bold text-red-500 font-mono">
                            {apptNum}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-white">
                            {serviceTitle}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              j.urgency === 'URGENT'
                                ? 'bg-red-950/40 text-red-400 border-red-500/30'
                                : 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                            }`}>
                              {j.urgency === 'URGENT' ? 'Emergency' : 'Standard'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">
                            {vehicleDesc}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-300">
                            {tireSize}
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 max-w-[180px] truncate" title={j.serviceAddress}>
                            {j.serviceAddress || '—'}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-300">
                            {j.recipientPhone || fleet?.contactPhone || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                            {formattedDate}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              j.status === 'COMPLETED'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                                : j.status === 'IN_PROGRESS' || j.status === 'ARRIVED'
                                ? 'bg-blue-950 text-blue-300 border border-blue-500/40'
                                : j.status === 'ASSIGNED' || j.status === 'EN_ROUTE'
                                ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/40'
                                : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                            }`}>
                              {j.status === 'IN_PROGRESS' ? 'Job Start' : j.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {jobs.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-500 text-xs">
                          No service requests submitted yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. PENDING INVOICES (Image 3) */}
          {activeTab === 'pending-invoices' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-red-500" />
                  <span>Pending Invoices</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Invoices sent to you by XtremeMobileTire that require payment.
                </p>
              </div>

              {/* Search Bar (Image 3) */}
              <div className="relative">
                <input
                  type="text"
                  value={pendingSearch}
                  onChange={(e) => setPendingSearch(e.target.value)}
                  placeholder="Search invoice #, company..."
                  className="w-full px-4 py-2.5 bg-[#18191e] border border-[#272832] rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-red-500 transition"
                />
              </div>

              {filteredPendingInvoices.length > 0 ? (
                <div className="bg-[#18191e] border border-[#272832] rounded-xl divide-y divide-[#252733] overflow-hidden">
                  {filteredPendingInvoices.map((inv: any) => (
                    <div key={inv.id} className="p-4 flex items-center justify-between text-xs hover:bg-[#1f2029] transition">
                      <div className="space-y-1">
                        <div className="font-mono font-bold text-white text-sm">{inv.invoiceNumber}</div>
                        <div className="text-slate-400 text-[11px]">
                          Issued: {new Date(inv.createdAt).toLocaleDateString()} | Due: {new Date(inv.dueDate).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setSelectedInvoiceId(inv.id)}
                          className="px-3 py-1.5 bg-[#252733] hover:bg-[#323444] text-white rounded-lg border border-[#343644] text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                          <FileText className="w-3.5 h-3.5 text-red-500" />
                          <span>View PDF</span>
                        </button>

                        <div className="text-right">
                          <div className="font-mono font-bold text-red-500 text-sm">
                            {formatCurrency(centsToDollars(inv.totalCents), currencySymbol)}
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                            {inv.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Empty state matching Image 3 */
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="text-slate-600">
                    <FileText className="w-12 h-12 stroke-[1.2]" />
                  </div>
                  <div className="text-xs text-slate-400 font-medium">
                    No pending invoices at this time.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 7. PAID INVOICES (Image 2) */}
          {activeTab === 'paid-invoices' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span>Paid Invoices</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Invoices that have been marked as paid.
                </p>
              </div>

              {/* Search Bar (Image 2) */}
              <div className="relative">
                <input
                  type="text"
                  value={paidSearch}
                  onChange={(e) => setPaidSearch(e.target.value)}
                  placeholder="Search invoice #, company..."
                  className="w-full px-4 py-2.5 bg-[#18191e] border border-[#272832] rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-red-500 transition"
                />
              </div>

              {filteredPaidInvoices.length > 0 ? (
                <div className="bg-[#18191e] border border-[#272832] rounded-xl divide-y divide-[#252733] overflow-hidden">
                  {filteredPaidInvoices.map((inv: any) => (
                    <div key={inv.id} className="p-4 flex items-center justify-between text-xs hover:bg-[#1f2029] transition">
                      <div className="space-y-1">
                        <div className="font-mono font-bold text-white text-sm">{inv.invoiceNumber}</div>
                        <div className="text-slate-400 text-[11px]">
                          Paid on {new Date(inv.updatedAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setSelectedInvoiceId(inv.id)}
                          className="px-3 py-1.5 bg-[#252733] hover:bg-[#323444] text-white rounded-lg border border-[#343644] text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                          <FileText className="w-3.5 h-3.5 text-red-500" />
                          <span>View PDF</span>
                        </button>

                        <div className="text-right">
                          <div className="font-mono font-bold text-emerald-400 text-sm">
                            {formatCurrency(centsToDollars(inv.totalCents), currencySymbol)}
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                            PAID
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Empty state matching Image 2 */
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="text-slate-600 flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 stroke-[1.2]" />
                  </div>
                  <div className="text-xs text-slate-400 font-medium">
                    No paid invoices yet.
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ADD VEHICLE MODAL */}
      {isAddVehicleOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#18191e] border border-[#272832] rounded-2xl w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-red-500" />
                <span>Register Fleet Vehicle</span>
              </h3>
              <button 
                onClick={() => setIsAddVehicleOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addVehicleMutation.mutate(newVehicle);
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Make *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Freightliner"
                    value={newVehicle.make}
                    onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-[#101115] border border-[#2c2d3a] rounded-lg text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Model *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cascadia"
                    value={newVehicle.model}
                    onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-[#101115] border border-[#2c2d3a] rounded-lg text-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Year</label>
                  <input
                    type="number"
                    value={newVehicle.year}
                    onChange={(e) => setNewVehicle({ ...newVehicle, year: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 bg-[#101115] border border-[#2c2d3a] rounded-lg text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">License Plate</label>
                  <input
                    type="text"
                    placeholder="e.g. KT-20"
                    value={newVehicle.licensePlate}
                    onChange={(e) => setNewVehicle({ ...newVehicle, licensePlate: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-[#101115] border border-[#2c2d3a] rounded-lg text-white text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Tire Size *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 11R22.5 or 235/65R17"
                  value={newVehicle.tireSize}
                  onChange={(e) => setNewVehicle({ ...newVehicle, tireSize: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-[#101115] border border-[#2c2d3a] rounded-lg text-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">VIN (Optional)</label>
                <input
                  type="text"
                  placeholder="Vehicle Identification Number"
                  value={newVehicle.vin}
                  onChange={(e) => setNewVehicle({ ...newVehicle, vin: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-[#101115] border border-[#2c2d3a] rounded-lg text-white text-xs font-mono uppercase"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddVehicleOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#252733] hover:bg-[#323444] text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addVehicleMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-900/30"
                >
                  {addVehicleMutation.isPending ? 'Registering...' : 'Register Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD DRIVER MODAL */}
      {isAddDriverOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#18191e] border border-[#272832] rounded-2xl w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-red-500" />
                <span>Register Fleet Driver</span>
              </h3>
              <button 
                onClick={() => setIsAddDriverOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addDriverMutation.mutate(newDriver);
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Driver Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={newDriver.fullName}
                  onChange={(e) => setNewDriver({ ...newDriver, fullName: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-[#101115] border border-[#2c2d3a] rounded-lg text-white text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Phone Number (For Roadside Verification) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +17035550199"
                  value={newDriver.phone}
                  onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-[#101115] border border-[#2c2d3a] rounded-lg text-white text-xs font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Assigned Vehicle (Optional)</label>
                  <button
                    type="button"
                    onClick={() => setIsAddVehicleOpen(true)}
                    className="text-[10px] font-bold text-red-500 hover:text-red-400 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Add New Vehicle</span>
                  </button>
                </div>
                <select
                  value={newDriver.licensePlate}
                  onChange={(e) => setNewDriver({ ...newDriver, licensePlate: e.target.value })}
                  className="w-full px-3 py-2 bg-[#101115] border border-[#2c2d3a] rounded-lg text-white text-xs font-mono uppercase"
                >
                  <option value="">-- No vehicle assigned --</option>
                  {vehicles.map((v: any) => (
                    <option key={v.id} value={v.licensePlate || `${v.make} ${v.model}`}>
                      {v.licensePlate ? `[${v.licensePlate}] ` : ''}{v.year} {v.make} {v.model} ({v.tireSize || '11R22.5'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddDriverOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#252733] hover:bg-[#323444] text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addDriverMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-900/30"
                >
                  {addDriverMutation.isPending ? 'Registering...' : 'Register Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN / ADD VEHICLE TO DRIVER MODAL */}
      {isAssignVehicleOpen && assigningDriver && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#18191e] border border-[#272832] rounded-2xl w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-red-500" />
                <span>Assign Vehicle to {assigningDriver.fullName}</span>
              </h3>
              <button 
                onClick={() => {
                  setIsAssignVehicleOpen(false);
                  setAssigningDriver(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateDriverMutation.mutate({
                  id: assigningDriver.id,
                  licensePlate: assignPlate,
                });
              }}
              className="space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Select Registered Fleet Vehicle</label>
                  <button
                    type="button"
                    onClick={() => setIsAddVehicleOpen(true)}
                    className="text-[10px] font-bold text-red-500 hover:text-red-400 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Add New Vehicle</span>
                  </button>
                </div>
                <select
                  value={assignPlate}
                  onChange={(e) => setAssignPlate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#101115] border border-[#2c2d3a] rounded-lg text-white text-xs font-mono uppercase"
                >
                  <option value="">-- No vehicle assigned / Unassign --</option>
                  {vehicles.map((v: any) => (
                    <option key={v.id} value={v.licensePlate || `${v.make} ${v.model}`}>
                      {v.licensePlate ? `[${v.licensePlate}] ` : ''}{v.year} {v.make} {v.model} ({v.tireSize || '11R22.5'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Or Enter Custom License Plate</label>
                <input
                  type="text"
                  placeholder="e.g. KT-15"
                  value={assignPlate}
                  onChange={(e) => setAssignPlate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-[#101115] border border-[#2c2d3a] rounded-lg text-white text-xs font-mono uppercase"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAssignVehicleOpen(false);
                    setAssigningDriver(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-[#252733] hover:bg-[#323444] text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateDriverMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-900/30 cursor-pointer"
                >
                  {updateDriverMutation.isPending ? 'Saving...' : 'Save Vehicle Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVOICE PDF MODAL */}
      {selectedInvoiceId && (
        <InvoicePdfModal
          isOpen={!!selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
          invoiceId={selectedInvoiceId}
          onStatusUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['fleet-portal-invoices'] });
            queryClient.invalidateQueries({ queryKey: ['fleet-portal-dashboard'] });
          }}
        />
      )}
    </div>
  );
}

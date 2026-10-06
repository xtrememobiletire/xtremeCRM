import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Truck, Users, Clock, FileText, CheckCircle2,
  MapPin, Phone, Mail, Globe, Plus, Trash2,
  LogOut, ArrowLeft, Building2, X,
  Calendar, Layers, ShieldCheck, DollarSign,
  Wrench, ArrowRight, Radio, Bell, Menu
} from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { useSocket } from '../context/SocketContext';
import { formatCurrency, centsToDollars } from '../utils/currency';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import InvoicePdfModal from '../components/invoices/InvoicePdfModal';
import { toast } from 'sonner';

type Tab = 'dashboard' | 'vehicles' | 'drivers' | 'request' | 'status' | 'pending-invoices' | 'paid-invoices';

export default function FleetDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { country, currencySymbol } = useTenant();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [pendingSearch, setPendingSearch] = useState('');
  const [paidSearch, setPaidSearch] = useState('');

  // Modals for adding vehicle, driver, and assigning vehicle
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
      toast.error(err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to submit service request');
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

  // Handle vehicle select in booking form
  const handleVehicleSelect = (vehId: string) => {
    const selected = vehicles.find((v: any) => v.id === vehId);
    setBookingForm((prev) => ({
      ...prev,
      vehicleId: vehId,
      tireSize: selected?.tireSize || prev.tireSize,
    }));
  };

  // Handle submit service
  const handleBookService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForm.appointmentDate) {
      toast.error('Please choose an appointment date and time');
      return;
    }
    bookServiceMutation.mutate({
      ...bookingForm,
      serviceAddress: bookingForm.address,
      fleetId: fleet?.id,
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

  // KPI Calculations
  const pendingAmountCents = useMemo(() => {
    return pendingInvoices.reduce((sum: number, inv: any) => sum + (inv.totalCents || 0), 0);
  }, [pendingInvoices]);

  const activeJobsCount = useMemo(() => {
    return jobs.filter((j: any) =>
      ['DISPATCHED', 'EN_ROUTE', 'ON_SCENE', 'IN_PROGRESS', 'ASSIGNED', 'PENDING'].includes(j.status)
    ).length;
  }, [jobs]);

  const navTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Layers, count: null },
    { id: 'vehicles', label: 'Vehicles', icon: Truck, count: vehicles.length },
    { id: 'drivers', label: 'My Drivers', icon: Users, count: drivers.length },
    { id: 'request', label: 'Request Service', icon: Calendar, count: null },
    { id: 'status', label: 'Service Status', icon: Clock, count: jobs.length },
    { id: 'pending-invoices', label: 'Pending Invoices', icon: FileText, count: pendingInvoices.length },
    { id: 'paid-invoices', label: 'Paid Invoices', icon: CheckCircle2, count: paidInvoices.length },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex antialiased">
      {/* Mobile Backdrop Overlay */}
      {isMobileNavOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 transition-opacity" 
          onClick={() => setIsMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* LEFT SIDEBAR - Identical to XtremeCRM Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 md:sticky top-0 h-[100dvh] max-h-[100dvh] bg-white border-r border-slate-200 flex flex-col z-50 transition-all duration-200 shrink-0 select-none shadow-2xl md:shadow-none ${
          isMobileNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } w-64`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-2">
            <img 
              src="/logo-signin.png" 
              alt="Xtreme Mobile Tire" 
              className="h-9 sm:h-10 w-auto max-w-[145px] object-contain shrink-0 drop-shadow-xs cursor-pointer"
              onClick={() => setActiveTab('dashboard')} 
            />
            <div className="min-w-0">
              <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-700 border border-slate-200 font-mono truncate max-w-[90px]">
                {fleet?.accountCode || 'XMT-5132'}
              </span>
            </div>
          </div>
          <button 
            type="button"
            className="md:hidden p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition cursor-pointer" 
            onClick={() => setIsMobileNavOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items (Light Red Accent when active) */}
        <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-3 px-3 space-y-1">
          {navTabs.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id as Tab);
                  setIsMobileNavOpen(false);
                }}
                className={`w-full flex items-center justify-between rounded-xl text-xs sm:text-sm transition-all duration-150 px-3.5 py-2.5 cursor-pointer text-left ${
                  isActive 
                    ? 'bg-red-50 text-red-700 font-bold shadow-2xs' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span className="truncate tracking-tight">{item.label}</span>
                </div>
                {item.count !== null && item.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    isActive ? 'bg-red-200/60 text-red-800' : 'bg-slate-200/70 text-slate-700'
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Info / Sign Out Footer (Pinned to bottom) */}
        <div className="shrink-0 p-3 sm:p-4 border-t border-slate-200 bg-slate-50/95 backdrop-blur-xs space-y-2.5">
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs shrink-0">
              {user?.firstName?.[0] || 'F'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800 truncate">
                {fleet?.companyName || user?.fullName || 'Fleet Manager'}
              </p>
              <p className="text-[10px] text-slate-500 uppercase font-semibold">
                FLEET MANAGER
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 shadow-2xs transition-colors cursor-pointer"
          >
            <LogOut size={16} className="shrink-0 text-rose-600" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* RIGHT MAIN VIEW */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP NAVBAR - Matching XtremeCRM Topbar */}
        <header className="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(true)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>

            {/* Live Dispatch Status Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Fleet Dispatch</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Admin return button */}
            {user?.role === 'ADMIN' && (
              <button
                onClick={() => navigate('/dashboard')}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-300 flex items-center gap-1.5 transition font-semibold cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exit to CRM</span>
              </button>
            )}

            {/* Fleet / Region Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold font-mono">
              <span>{country || 'US'}</span>
              <span>•</span>
              <span className="text-red-600">{fleet?.accountCode || 'XMT-5132'}</span>
            </div>

            {/* Active Status Badge */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Active</span>
            </div>

            {/* Notification Bell */}
            <div className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition cursor-pointer">
              <Bell size={18} />
            </div>

            {/* User Avatar */}
            <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center border border-red-200">
              {user?.firstName?.[0] || 'F'}
            </div>
          </div>
        </header>

        {/* MAIN BODY AREA */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {/* 1. DASHBOARD TAB - EXACT LAYOUT AS SHOWN IN SCREENSHOT */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <PageHeader
                title="Dashboard"
                subtitle={`Operations overview for ${fleet?.companyName || 'KT Group'} [${fleet?.accountCode || 'XMT-5132'}]`}
                badge={
                  <span className="badge-brand inline-flex items-center gap-1">
                    <Radio className="w-3 h-3 text-red-600 animate-pulse" />
                    <span>Live</span>
                  </span>
                }
                actions={
                  <div className="flex items-center gap-2">
                    <button 
                      type="button" 
                      onClick={() => setActiveTab('request')} 
                      className="btn-primary cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>+ Request Service</span>
                    </button>
                  </div>
                }
              />

              {/* 4 KPI Stat Cards (Matching DashboardKpiGrid Style) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="ACTIVE FLEET VEHICLES"
                  value={vehicles.length.toString()}
                  subtitle="Commercial units registered"
                  subtitleColor="text-emerald-600"
                  icon={Truck}
                  iconBg="bg-red-50"
                  iconColor="text-red-600"
                />
                <StatCard
                  title="PENDING INVOICES"
                  value={formatCurrency(centsToDollars(pendingAmountCents), currencySymbol)}
                  subtitle={`${pendingInvoices.length} unpaid invoices`}
                  subtitleColor="text-slate-500"
                  icon={DollarSign}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                />
                <StatCard
                  title="ACTIVE SERVICE JOBS"
                  value={activeJobsCount.toString()}
                  subtitle="Units en route or on scene"
                  subtitleColor="text-blue-600"
                  icon={Clock}
                  iconBg="bg-blue-50"
                  iconColor="text-blue-600"
                />
                <StatCard
                  title="ASSIGNED DRIVERS"
                  value={`${drivers.length} / ${vehicles.length || 1}`}
                  subtitle="Fleet driver coverage"
                  subtitleColor="text-amber-600"
                  icon={Users}
                  iconBg="bg-amber-50"
                  iconColor="text-amber-600"
                />
              </div>

              {/* 2-Column Grid (Recent Service Requests + Fleet Profile & Actions) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Recent Service Requests */}
                <div className="lg:col-span-2 space-y-4">
                  <Card
                    title="Recent Service Requests"
                    icon={Wrench}
                    action={
                      <button 
                        onClick={() => setActiveTab('status')} 
                        className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                      >
                        <span>View All</span>
                        <ArrowRight size={13} />
                      </button>
                    }
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead>
                          <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-2.5 px-3">JOB # / DATE</th>
                            <th className="py-2.5 px-3">SERVICE</th>
                            <th className="py-2.5 px-3">VEHICLE & TIRE</th>
                            <th className="py-2.5 px-3">DRIVER</th>
                            <th className="py-2.5 px-3">STATUS</th>
                            <th className="py-2.5 px-3 text-right">TOTAL</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {jobs.slice(0, 5).map((j: any) => {
                            const serviceName = j.serviceItems?.[0]?.serviceName || 'Tire Service';
                            const dateStr = j.scheduledFor || j.appointmentDate || j.createdAt
                              ? new Date(j.scheduledFor || j.appointmentDate || j.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'Immediate';
                            return (
                              <tr key={j.id} className="hover:bg-slate-50/80 transition">
                                <td className="py-3 px-3">
                                  <div className="font-bold text-red-600 font-mono text-xs">{j.jobCode}</div>
                                  <div className="text-[11px] text-slate-400 mt-0.5">{dateStr}</div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-semibold text-slate-800">{serviceName}</div>
                                  <div className="text-[10px] text-slate-400 uppercase font-mono">{j.urgency || 'STANDARD'}</div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="text-slate-800 font-medium">
                                    {j.vehicle ? `${j.vehicle.make} ${j.vehicle.model}` : 'Standard Vehicle'}
                                  </div>
                                  <div className="text-[11px] font-mono text-slate-500">
                                    {j.vehicle?.licensePlate ? `Plate: ${j.vehicle.licensePlate}` : (j.vehicle?.tireSize || '11R22.5')}
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="text-slate-700 font-medium flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span>{j.driver?.fullName || 'Assigned Tech'}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                    j.status === 'COMPLETED'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : j.status === 'IN_PROGRESS' || j.status === 'ARRIVED'
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}>
                                    {j.status}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                                  {j.totalCents ? formatCurrency(centsToDollars(j.totalCents), currencySymbol) : '—'}
                                </td>
                              </tr>
                            );
                          })}

                          {jobs.length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                                No service requests submitted yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>

                {/* Right 1 Col: Fleet Profile & Quick Actions */}
                <div className="space-y-6">
                  {/* Fleet Profile Card */}
                  <Card title="Fleet Account Profile" icon={Building2}>
                    <div className="space-y-3.5 text-xs">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company Name</div>
                        <div className="font-bold text-slate-900 text-sm mt-0.5">{fleet?.companyName || 'KT Group'}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account Code</div>
                          <div className="font-mono font-bold text-red-600 mt-0.5">{fleet?.accountCode || 'XMT-5132'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</div>
                          <div className="text-emerald-700 font-bold mt-0.5">Approved B2B</div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span className="truncate">{fleet?.contactEmail || 'piratheep@xtrememobiletire.com'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 font-mono">
                          <Phone className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span>{fleet?.contactPhone || '1-866-686-9660'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span className="truncate">{fleet?.address || '10100 Richmond Hwy, Lorton, VA 22079'}</span>
                        </div>
                        {fleet?.website && (
                          <div className="flex items-center gap-2 text-red-600">
                            <Globe className="w-3.5 h-3.5 shrink-0" />
                            <a href={fleet.website} target="_blank" rel="noreferrer" className="truncate hover:underline">
                              {fleet.website}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>

                  {/* Quick Dispatch Actions */}
                  <Card title="Quick Fleet Actions" icon={Plus}>
                    <div className="space-y-2.5">
                      <button
                        type="button"
                        onClick={() => setActiveTab('request')}
                        className="w-full btn-primary py-2.5 text-xs font-bold justify-center cursor-pointer shadow-sm shadow-red-600/20"
                      >
                        <Calendar size={14} />
                        <span>+ Request Roadside Service</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsAddVehicleOpen(true)}
                        className="w-full btn-secondary py-2.5 text-xs font-semibold justify-center cursor-pointer"
                      >
                        <Truck size={14} className="text-red-600" />
                        <span>+ Register Vehicle</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsAddDriverOpen(true)}
                        className="w-full btn-secondary py-2.5 text-xs font-semibold justify-center cursor-pointer"
                      >
                        <Users size={14} className="text-red-600" />
                        <span>+ Add Authorized Driver</span>
                      </button>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* 2. VEHICLES TAB */}
          {activeTab === 'vehicles' && (
            <div className="space-y-6">
              <PageHeader
                title="Registered Fleet Vehicles"
                subtitle={`Commercial fleet units authorized for 24/7 roadside tire repair (${vehicles.length} total)`}
                actions={
                  <button
                    onClick={() => setIsAddVehicleOpen(true)}
                    className="btn-primary cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>+ Add Vehicle</span>
                  </button>
                }
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicles.map((v: any) => (
                  <div key={v.id} className="card-surface p-5 space-y-3 relative group hover:border-slate-300 hover:shadow-md transition">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-800">
                        {v.licensePlate || 'NO PLATE'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-mono">{v.year}</span>
                        <button
                          onClick={() => deleteVehicleMutation.mutate(v.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 transition p-1 cursor-pointer"
                          title="Remove Vehicle"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="font-bold text-base text-slate-900">{v.make} {v.model}</div>
                      {v.vin && <div className="text-[11px] font-mono text-slate-400 mt-0.5">VIN: {v.vin}</div>}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Tire Spec:</span>
                      <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded font-mono font-bold text-xs">
                        {v.tireSize || '11R22.5'}
                      </span>
                    </div>
                  </div>
                ))}

                {vehicles.length === 0 && (
                  <div className="col-span-full card-surface py-12 text-center text-slate-500 text-xs space-y-3">
                    <Truck className="w-10 h-10 text-slate-300 mx-auto" />
                    <div className="font-semibold text-slate-700">No fleet vehicles registered yet.</div>
                    <button
                      onClick={() => setIsAddVehicleOpen(true)}
                      className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-bold cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
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
              <PageHeader
                title="Authorized Fleet Drivers"
                subtitle={`Drivers verified by dispatch during 24/7 roadside breakdown calls (${drivers.length} registered)`}
                actions={
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsAddVehicleOpen(true)}
                      className="btn-secondary text-xs cursor-pointer"
                    >
                      <Truck className="w-4 h-4 text-red-600" />
                      <span>+ Add Vehicle</span>
                    </button>
                    <button
                      onClick={() => setIsAddDriverOpen(true)}
                      className="btn-primary text-xs cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>+ Add Driver</span>
                    </button>
                  </div>
                }
              />

              <div className="card-surface divide-y divide-slate-100 overflow-hidden shadow-xs">
                {drivers.map((d: any) => (
                  <div key={d.id} className="p-4 sm:p-5 flex items-center justify-between text-xs hover:bg-slate-50/80 transition">
                    <div className="space-y-1">
                      <div className="font-bold text-slate-900 text-sm">{d.fullName}</div>
                      <div className="text-slate-500 font-mono flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-red-600" />
                        <span>{d.phone}</span>
                        {d.licensePlate && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-mono text-[11px] font-semibold">
                              Plate: {d.licensePlate}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setAssigningDriver(d);
                          setAssignPlate(d.licensePlate || '');
                          setIsAssignVehicleOpen(true);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
                          d.licensePlate
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                            : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                        }`}
                        title="Add or Change Assigned Vehicle"
                      >
                        <Truck className="w-3.5 h-3.5 text-red-600" />
                        <span>{d.licensePlate ? `Vehicle: ${d.licensePlate}` : '+ Add Vehicle'}</span>
                      </button>

                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-semibold text-xs hidden sm:flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Authorized</span>
                      </span>

                      <button
                        onClick={() => deleteDriverMutation.mutate(d.id)}
                        className="text-slate-400 hover:text-red-600 transition p-1.5 cursor-pointer rounded-lg hover:bg-red-50"
                        title="Remove Driver"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {drivers.length === 0 && (
                  <div className="py-12 text-center text-slate-500 text-xs space-y-3">
                    <Users className="w-10 h-10 text-slate-300 mx-auto" />
                    <div className="font-semibold text-slate-700">No authorized drivers registered yet.</div>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => setIsAddDriverOpen(true)}
                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-bold cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Register your first driver</span>
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        onClick={() => setIsAddVehicleOpen(true)}
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-bold cursor-pointer"
                      >
                        <Truck className="w-4 h-4 text-red-600" />
                        <span>Add Vehicle</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. REQUEST NEW SERVICE TAB */}
          {activeTab === 'request' && (
            <div className="max-w-2xl space-y-4">
              <PageHeader
                title="Request Roadside Service"
                subtitle="Book standard or emergency roadside assistance directly with corporate dispatch"
              />

              <form onSubmit={handleBookService} className="card-surface p-6 space-y-4 text-xs">
                {/* APPOINTMENT DATE & TIME */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Appointment Date & Time *
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">24/7 Hours</span>
                  </div>
                  <input
                    type="datetime-local"
                    value={bookingForm.appointmentDate}
                    onChange={(e) => setBookingForm({ ...bookingForm, appointmentDate: e.target.value })}
                    className="input-base mt-1.5 py-2.5 text-xs text-slate-800"
                    required
                  />
                </div>

                {/* VEHICLE */}
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Select Fleet Vehicle
                  </label>
                  <select
                    value={bookingForm.vehicleId}
                    onChange={(e) => handleVehicleSelect(e.target.value)}
                    className="select-base mt-1.5 py-2.5 text-xs text-slate-800"
                  >
                    <option value="">Select a registered vehicle...</option>
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
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Select Service *
                    </label>
                    <select
                      value={bookingForm.serviceName}
                      onChange={(e) => setBookingForm({ ...bookingForm, serviceName: e.target.value })}
                      className="select-base mt-1.5 py-2.5 text-xs text-slate-800"
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
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Service Urgency
                    </label>
                    <select
                      value={bookingForm.serviceType}
                      onChange={(e) => setBookingForm({ ...bookingForm, serviceType: e.target.value as any })}
                      className="select-base mt-1.5 py-2.5 text-xs text-slate-800"
                    >
                      <option value="STANDARD">Standard Scheduled Service</option>
                      <option value="EMERGENCY">Roadside Emergency (Priority Dispatch)</option>
                    </select>
                  </div>
                </div>

                {/* PHONE NUMBER & TIRE SIZE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      value={bookingForm.contactPhone}
                      onChange={(e) => setBookingForm({ ...bookingForm, contactPhone: e.target.value })}
                      placeholder={fleet?.contactPhone || '1-866-686-9660'}
                      className="input-base mt-1.5 py-2.5 text-xs text-slate-800 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Tire Size
                    </label>
                    <input
                      type="text"
                      value={bookingForm.tireSize}
                      onChange={(e) => setBookingForm({ ...bookingForm, tireSize: e.target.value })}
                      placeholder="e.g. 11R22.5 or 235/65R17"
                      className="input-base mt-1.5 py-2.5 text-xs font-mono text-slate-800"
                    />
                  </div>
                </div>

                {/* ADDRESS */}
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Breakdown / Service Address *
                  </label>
                  <input
                    type="text"
                    value={bookingForm.address}
                    onChange={(e) => setBookingForm({ ...bookingForm, address: e.target.value })}
                    placeholder="Enter street address, highway exit, or depot location"
                    className="input-base mt-1.5 py-2.5 text-xs text-slate-800"
                    required
                  />
                </div>

                {/* NOTES */}
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Wheel Position / Breakdown Instructions
                  </label>
                  <textarea
                    value={bookingForm.notes}
                    onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                    placeholder="e.g. Trailer right-rear outer tire blowout, driver waiting on shoulder"
                    rows={2}
                    className="textarea-base mt-1.5 py-2 text-xs text-slate-800 resize-none"
                  />
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={bookServiceMutation.isPending}
                  className="w-full btn-primary py-3 text-xs font-bold uppercase tracking-wider shadow-md shadow-red-600/20 cursor-pointer mt-2"
                >
                  {bookServiceMutation.isPending ? 'Dispatching Request...' : 'Submit Service Request'}
                </button>
              </form>
            </div>
          )}

          {/* 5. SERVICE STATUS TAB */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              <PageHeader
                title="Service Status"
                subtitle="Live tracking and real-time updates for all submitted fleet jobs"
              />

              <div className="card-surface overflow-x-auto shadow-xs">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
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
                  <tbody className="divide-y divide-slate-100">
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
                        <tr key={j.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4 font-bold text-red-600 font-mono">
                            {apptNum}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            {serviceTitle}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              j.urgency === 'URGENT'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {j.urgency === 'URGENT' ? 'Emergency' : 'Standard'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 font-medium">
                            {vehicleDesc}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-700">
                            {tireSize}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 max-w-[180px] truncate" title={j.serviceAddress}>
                            {j.serviceAddress || '—'}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-700">
                            {j.recipientPhone || fleet?.contactPhone || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">
                            {formattedDate}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              j.status === 'COMPLETED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : j.status === 'IN_PROGRESS' || j.status === 'ARRIVED'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : j.status === 'ASSIGNED' || j.status === 'EN_ROUTE'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {j.status === 'IN_PROGRESS' ? 'Job Start' : j.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {jobs.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                          No service requests submitted yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. PENDING INVOICES TAB */}
          {activeTab === 'pending-invoices' && (
            <div className="space-y-4">
              <PageHeader
                title="Pending Fleet Invoices"
                subtitle="Invoices generated by Xtreme Mobile Tire that require payment settlement"
              />

              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  value={pendingSearch}
                  onChange={(e) => setPendingSearch(e.target.value)}
                  placeholder="Search invoice #, company..."
                  className="input-base py-2.5 text-xs text-slate-800"
                />
              </div>

              {filteredPendingInvoices.length > 0 ? (
                <div className="card-surface divide-y divide-slate-100 overflow-hidden shadow-xs">
                  {filteredPendingInvoices.map((inv: any) => (
                    <div key={inv.id} className="p-4 sm:p-5 flex items-center justify-between text-xs hover:bg-slate-50/80 transition">
                      <div className="space-y-1">
                        <div className="font-mono font-bold text-slate-900 text-sm">{inv.invoiceNumber}</div>
                        <div className="text-slate-500 text-xs">
                          Issued: {new Date(inv.createdAt).toLocaleDateString()} | Due: {new Date(inv.dueDate).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setSelectedInvoiceId(inv.id)}
                          className="btn-secondary py-1.5 px-3 text-xs inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-red-600" />
                          <span>View PDF</span>
                        </button>

                        <div className="text-right">
                          <div className="font-mono font-bold text-red-600 text-base">
                            {formatCurrency(centsToDollars(inv.totalCents), currencySymbol)}
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded">
                            {inv.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-3 card-surface">
                  <div className="text-slate-300">
                    <FileText className="w-12 h-12 stroke-[1.2]" />
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    No pending invoices at this time.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 7. PAID INVOICES TAB */}
          {activeTab === 'paid-invoices' && (
            <div className="space-y-4">
              <PageHeader
                title="Paid Fleet Invoices"
                subtitle="Historical settled invoices and digital receipts"
              />

              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  value={paidSearch}
                  onChange={(e) => setPaidSearch(e.target.value)}
                  placeholder="Search invoice #, company..."
                  className="input-base py-2.5 text-xs text-slate-800"
                />
              </div>

              {filteredPaidInvoices.length > 0 ? (
                <div className="card-surface divide-y divide-slate-100 overflow-hidden shadow-xs">
                  {filteredPaidInvoices.map((inv: any) => (
                    <div key={inv.id} className="p-4 sm:p-5 flex items-center justify-between text-xs hover:bg-slate-50/80 transition">
                      <div className="space-y-1">
                        <div className="font-mono font-bold text-slate-900 text-sm">{inv.invoiceNumber}</div>
                        <div className="text-slate-500 text-xs">
                          Paid on {new Date(inv.updatedAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setSelectedInvoiceId(inv.id)}
                          className="btn-secondary py-1.5 px-3 text-xs inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-red-600" />
                          <span>View PDF</span>
                        </button>

                        <div className="text-right">
                          <div className="font-mono font-bold text-emerald-600 text-base">
                            {formatCurrency(centsToDollars(inv.totalCents), currencySymbol)}
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                            PAID
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-3 card-surface">
                  <div className="text-slate-300 flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 stroke-[1.2]" />
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-4 text-xs shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-red-600" />
                <span>Register Fleet Vehicle</span>
              </h3>
              <button 
                onClick={() => setIsAddVehicleOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
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
                  <label className="text-xs font-semibold text-slate-700">Make *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Freightliner"
                    value={newVehicle.make}
                    onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
                    className="input-base mt-1 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Model *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cascadia"
                    value={newVehicle.model}
                    onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                    className="input-base mt-1 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Year</label>
                  <input
                    type="number"
                    value={newVehicle.year}
                    onChange={(e) => setNewVehicle({ ...newVehicle, year: Number(e.target.value) })}
                    className="input-base mt-1 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">License Plate</label>
                  <input
                    type="text"
                    placeholder="e.g. KT-20"
                    value={newVehicle.licensePlate}
                    onChange={(e) => setNewVehicle({ ...newVehicle, licensePlate: e.target.value })}
                    className="input-base mt-1 py-2 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Tire Size *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 11R22.5 or 235/65R17"
                  value={newVehicle.tireSize}
                  onChange={(e) => setNewVehicle({ ...newVehicle, tireSize: e.target.value })}
                  className="input-base mt-1 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">VIN (Optional)</label>
                <input
                  type="text"
                  placeholder="Vehicle Identification Number"
                  value={newVehicle.vin}
                  onChange={(e) => setNewVehicle({ ...newVehicle, vin: e.target.value })}
                  className="input-base mt-1 py-2 text-xs font-mono uppercase"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddVehicleOpen(false)}
                  className="btn-secondary py-2 px-4 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addVehicleMutation.isPending}
                  className="btn-primary py-2 px-4 text-xs font-bold shadow-sm shadow-red-600/20 cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-4 text-xs shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-red-600" />
                <span>Register Fleet Driver</span>
              </h3>
              <button 
                onClick={() => setIsAddDriverOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
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
                <label className="text-xs font-semibold text-slate-700">Driver Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={newDriver.fullName}
                  onChange={(e) => setNewDriver({ ...newDriver, fullName: e.target.value })}
                  className="input-base mt-1 py-2 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Phone Number (For Roadside Verification) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +17035550199"
                  value={newDriver.phone}
                  onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                  className="input-base mt-1 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Assigned Vehicle (Optional)</label>
                  <button
                    type="button"
                    onClick={() => setIsAddVehicleOpen(true)}
                    className="text-xs font-bold text-red-600 hover:text-red-700 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Add New Vehicle</span>
                  </button>
                </div>
                <select
                  value={newDriver.licensePlate}
                  onChange={(e) => setNewDriver({ ...newDriver, licensePlate: e.target.value })}
                  className="select-base py-2 text-xs font-mono uppercase"
                >
                  <option value="">-- No vehicle assigned --</option>
                  {vehicles.map((v: any) => (
                    <option key={v.id} value={v.licensePlate || `${v.make} ${v.model}`}>
                      {v.licensePlate ? `[${v.licensePlate}] ` : ''}{v.year} {v.make} {v.model} ({v.tireSize || '11R22.5'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddDriverOpen(false)}
                  className="btn-secondary py-2 px-4 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addDriverMutation.isPending}
                  className="btn-primary py-2 px-4 text-xs font-bold shadow-sm shadow-red-600/20 cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-4 text-xs shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-red-600" />
                <span>Assign Vehicle to {assigningDriver.fullName}</span>
              </h3>
              <button 
                onClick={() => {
                  setIsAssignVehicleOpen(false);
                  setAssigningDriver(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
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
                  <label className="text-xs font-semibold text-slate-700">Select Registered Fleet Vehicle</label>
                  <button
                    type="button"
                    onClick={() => setIsAddVehicleOpen(true)}
                    className="text-xs font-bold text-red-600 hover:text-red-700 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Add New Vehicle</span>
                  </button>
                </div>
                <select
                  value={assignPlate}
                  onChange={(e) => setAssignPlate(e.target.value)}
                  className="select-base py-2 text-xs font-mono uppercase"
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
                <label className="text-xs font-semibold text-slate-700">Or Enter Custom License Plate</label>
                <input
                  type="text"
                  placeholder="e.g. KT-15"
                  value={assignPlate}
                  onChange={(e) => setAssignPlate(e.target.value)}
                  className="input-base mt-1 py-2 text-xs font-mono uppercase"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAssignVehicleOpen(false);
                    setAssigningDriver(null);
                  }}
                  className="btn-secondary py-2 px-4 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateDriverMutation.isPending}
                  className="btn-primary py-2 px-4 text-xs font-bold shadow-sm shadow-red-600/20 cursor-pointer"
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

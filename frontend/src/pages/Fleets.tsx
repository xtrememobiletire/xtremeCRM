import { useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Globe,
  User,
  Copy,
  Check,
  Trash2,
  Pencil,
  ExternalLink,
  Calendar,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import FleetTable from '../components/fleets/FleetTable';
import AddFleetModal from '../components/fleets/AddFleetModal';
import FleetDetailModal from '../components/fleets/FleetDetailModal';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/common/Skeleton';
import { useFleets, useApproveFleet, useDeleteFleet } from '../hooks/useFleets';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

type FleetTabType = 'APPROVED' | 'PENDING';

export default function Fleets() {
  const { user } = useAuth();
  const isAdmin =
    user?.role === 'ADMIN' ||
    user?.role === 'GENERAL_MANAGER' ||
    user?.role?.toUpperCase().includes('ADMIN');

  const [activeTab, setActiveTab] = useState<FleetTabType>('APPROVED');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedFleet, setSelectedFleet] = useState<any | null>(null);
  const [newFleetCredentials, setNewFleetCredentials] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data: fleetsResponse, isLoading } = useFleets();
  const approveMutation = useApproveFleet();
  const deleteMutation = useDeleteFleet();

  const allFleets = fleetsResponse?.data || [];

  const approvedFleets = allFleets.filter((f: any) => f.status === 'APPROVED' || !f.status);
  const pendingFleets = allFleets.filter((f: any) => f.status === 'PENDING');

  const currentTabFleets = activeTab === 'APPROVED' ? approvedFleets : pendingFleets;

  const filteredFleets = currentTabFleets.filter((f: any) => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      f.fleetCode?.toLowerCase().includes(query) ||
      f.companyName?.toLowerCase().includes(query) ||
      f.name?.toLowerCase().includes(query) ||
      f.contactName?.toLowerCase().includes(query) ||
      f.contactPerson?.toLowerCase().includes(query) ||
      f.email?.toLowerCase().includes(query) ||
      f.phone?.includes(query) ||
      f.address?.toLowerCase().includes(query)
    );
  });

  const handleCopy = (text: string, label: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleApprove = (fleet: any) => {
    approveMutation.mutate(fleet.id, {
      onSuccess: () => {
        toast.success(`Fleet ${fleet.fleetCode || fleet.companyName} approved successfully!`);
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message || 'Failed to approve fleet');
      },
    });
  };

  const handleDelete = (fleet: any) => {
    if (
      window.confirm(
        `Are you sure you want to delete or reject registration for "${
          fleet.companyName || fleet.name
        }"?`
      )
    ) {
      deleteMutation.mutate(fleet.id, {
        onSuccess: () => {
          toast.success('Fleet registration removed');
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || 'Failed to delete fleet');
        },
      });
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Fleet Accounts & B2B Billing"
        subtitle="Manage logistics partners, Net-30 payment terms, and fleet vehicle enrollments"
        actions={
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="btn-primary"
          >
            <Plus size={14} />
            <span>Register Fleet Account</span>
          </button>
        }
      />

      {/* Tabs and Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Technician Portal Inspired Pill Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 overflow-x-auto select-none w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('APPROVED')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'APPROVED'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <span>Approved Fleets</span>
            <span
              className={`text-[11px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center ${
                activeTab === 'APPROVED'
                  ? 'bg-slate-100 text-slate-800'
                  : 'bg-slate-200/80 text-slate-600'
              }`}
            >
              {approvedFleets.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PENDING')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'PENDING'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <span>Unapproved Fleets</span>
            <span
              className={`text-[11px] font-bold px-2 py-0.2 rounded-full min-w-4 text-center ${
                pendingFleets.length > 0
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-slate-200/80 text-slate-600'
              }`}
            >
              {pendingFleets.length}
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="card-surface p-1.5 px-3 flex items-center flex-1 sm:max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Fleet ID, company name, phone, email..."
              className="w-full pl-8 pr-2 py-1 text-xs bg-transparent border-0 focus:outline-none text-slate-900 placeholder:text-slate-400 font-sans"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={isAdmin ? 9 : 8} />
      ) : activeTab === 'APPROVED' ? (
        /* ================= APPROVED FLEETS TAB ================= */
        approvedFleets.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No approved fleet accounts"
            description="Register transportation companies, delivery fleets, or corporate accounts for consolidated billing."
            action={
              <button
                type="button"
                onClick={() => setIsAddOpen(true)}
                className="btn-primary"
              >
                <Plus size={14} />
                <span>Register Fleet</span>
              </button>
            }
          />
        ) : filteredFleets.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching fleets"
            description={`No approved fleets found matching "${search}".`}
          />
        ) : (
          <FleetTable fleets={filteredFleets} onSelectFleet={(f) => setSelectedFleet(f)} />
        )
      ) : (
        /* ================= UNAPPROVED FLEETS TAB ================= */
        pendingFleets.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="No unapproved fleet registrations"
            description="All commercial applications have been reviewed. When new fleets register via the landing page, they appear here."
          />
        ) : filteredFleets.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching registrations"
            description={`No unapproved registrations found matching "${search}".`}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFleets.map((f: any) => {
              const regDate = f.createdAt
                ? new Date(f.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Recent';

              const phoneKey = `phone-${f.id}`;
              const emailKey = `email-${f.id}`;
              const addrKey = `addr-${f.id}`;

              return (
                <div
                  key={f.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4.5 shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition-all space-y-4"
                >
                  {/* Card Header */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setSelectedFleet(f)}
                        className="font-mono font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 transition cursor-pointer"
                        title="Click to view details"
                      >
                        #{f.fleetCode || 'XMT-????'}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Unapproved
                        </span>
                        <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
                          {f.countryCode || 'CA'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {f.companyName || f.name}
                      </h3>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                        <Calendar size={11} />
                        <span>Registered {regDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Body Details */}
                  <div className="space-y-2.5 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-slate-100 font-sans">
                    {/* Contact Person */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <User size={13} className="text-slate-400" />
                        <span>Contact:</span>
                      </div>
                      <span className="font-semibold text-slate-800">
                        {f.contactPerson || f.contactName || '—'}
                      </span>
                    </div>

                    {/* Fleet Manager if present */}
                    {f.fleetManager && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[11px]">Fleet Manager:</span>
                        <span className="font-medium text-slate-700 text-[11px]">
                          {f.fleetManager}
                        </span>
                      </div>
                    )}

                    {/* Fleet Size */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Truck size={13} className="text-slate-400" />
                        <span>Fleet Size:</span>
                      </div>
                      <span className="font-bold text-slate-900">
                        {f.numberOfUnits ? `${f.numberOfUnits} units` : '1+ units'}
                      </span>
                    </div>

                    {/* Phone (Click to Copy) */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Phone size={13} className="text-slate-400" />
                        <span>Phone:</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(f.phone, 'Phone number', phoneKey)}
                        className="font-mono text-slate-800 hover:text-red-600 flex items-center gap-1 cursor-pointer transition"
                        title="Click to copy phone"
                      >
                        <span>{f.phone || '—'}</span>
                        {copiedField === phoneKey ? (
                          <Check size={11} className="text-emerald-600" />
                        ) : (
                          <Copy size={11} className="text-slate-400" />
                        )}
                      </button>
                    </div>

                    {/* Email (Click to Copy) */}
                    {f.email && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Mail size={13} className="text-slate-400" />
                          <span>Portal Email:</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(f.email, 'Email address', emailKey)}
                          className="font-mono text-slate-800 hover:text-red-600 flex items-center gap-1 cursor-pointer transition truncate max-w-[170px]"
                          title="Click to copy email"
                        >
                          <span className="truncate">{f.email}</span>
                          {copiedField === emailKey ? (
                            <Check size={11} className="text-emerald-600 shrink-0" />
                          ) : (
                            <Copy size={11} className="text-slate-400 shrink-0" />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Website */}
                    {f.website && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Globe size={13} className="text-slate-400" />
                          <span>Website:</span>
                        </div>
                        <a
                          href={f.website.startsWith('http') ? f.website : `https://${f.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-600 hover:underline flex items-center gap-1 truncate max-w-[170px]"
                        >
                          <span className="truncate">{f.website.replace(/^https?:\/\//, '')}</span>
                          <ExternalLink size={10} className="shrink-0" />
                        </a>
                      </div>
                    )}

                    {/* Depot Address */}
                    {f.address && (
                      <div className="pt-1 border-t border-slate-200/60 flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-slate-500 shrink-0 mt-0.5">
                          <MapPin size={13} className="text-slate-400" />
                          <span>Depot:</span>
                        </div>
                        <div className="text-right">
                          <button
                            type="button"
                            onClick={() => handleCopy(f.address, 'Address', addrKey)}
                            className="text-[11px] text-slate-700 hover:text-red-600 text-right line-clamp-2 cursor-pointer transition"
                            title="Click to copy address"
                          >
                            {f.address}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Actions Footer */}
                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={approveMutation.isPending}
                      onClick={() => handleApprove(f)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                    >
                      <Check size={13} />
                      <span>Approve</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedFleet(f)}
                      className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                      title="Inspect or edit fleet details"
                    >
                      <Pencil size={12} />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      disabled={deleteMutation.isPending}
                      onClick={() => handleDelete(f)}
                      className="inline-flex items-center justify-center p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition cursor-pointer disabled:opacity-50"
                      title="Delete or reject registration"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      <AddFleetModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={(created) => {
          if (created?.tempCredentials) {
            setNewFleetCredentials({
              ...created.tempCredentials,
              fleetCode: created.fleetCode,
              companyName: created.companyName || created.name,
            });
          }
        }}
      />
      <FleetDetailModal
        fleet={selectedFleet}
        isOpen={!!selectedFleet}
        onClose={() => setSelectedFleet(null)}
      />

      {/* One-Time Fleet Credentials Modal */}
      {newFleetCredentials && (
        <Modal
          isOpen={!!newFleetCredentials}
          onClose={() => setNewFleetCredentials(null)}
          title="Fleet Account Registered"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900">
              <div className="font-bold text-sm mb-1">🎉 Fleet Account Activated!</div>
              <p className="text-slate-600 text-xs">
                One-time portal login credentials generated for{' '}
                <strong>{newFleetCredentials.companyName}</strong>. Please copy and share these
                securely with the Fleet Manager.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 font-mono text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Portal URL
                </span>
                <span className="text-slate-900 font-bold">
                  {window.location.origin}/login
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Fleet Code
                </span>
                <span className="text-slate-900 font-bold">
                  {newFleetCredentials.fleetCode || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Login Email
                </span>
                <span className="text-slate-900 font-bold">{newFleetCredentials.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Temporary Password
                </span>
                <span className="text-red-600 font-bold select-all">
                  {newFleetCredentials.tempPassword || '(Custom password set)'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const txt = `🏢 Xtreme Mobile Tire — Fleet Manager Portal
🔗 Portal: ${window.location.origin}/login
🏷️ Fleet Code: ${newFleetCredentials.fleetCode}
📧 Email: ${newFleetCredentials.email}
🔑 Password: ${newFleetCredentials.tempPassword || '(Custom password set)'}`;
                  navigator.clipboard.writeText(txt);
                  toast.success('Credentials copied to clipboard!');
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Copy All Credentials
              </button>
              <button
                type="button"
                onClick={() => setNewFleetCredentials(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Search, 
  RefreshCw, 
  KeyRound, 
  Users, 
  UserCog, 
  Globe2, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight, 
  FilterX, 
  UserPlus, 
  Trash2 
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { userService, type UserItem } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import ResetCredentialsModal from '../components/common/ResetCredentialsModal';
import CreateUserModal from '../components/common/CreateUserModal';
import DeleteUserModal from '../components/common/DeleteUserModal';

const EXTERNAL_ROLES = [
  'FLEET_MANAGER',
  'CUSTOMER_MEMBER',
];

const ALL_ROLES = [
  { value: '', label: 'All Specific Roles' },
  { value: 'DEVELOPER', label: 'Developer (Internal)' },
  { value: 'ADMIN', label: 'Administrator (Internal)' },
  { value: 'GENERAL_MANAGER', label: 'General Manager (Internal)' },
  { value: 'DISPATCHER', label: 'Dispatcher (Internal)' },
  { value: 'CALL_AGENT', label: 'Call Agent (Internal)' },
  { value: 'DRIVER', label: 'Technician / Driver (Internal)' },
  { value: 'ACCOUNTANT', label: 'Accountant (Internal)' },
  { value: 'VIRTUAL_ASSISTANT', label: 'Virtual Assistant (Internal)' },
  { value: 'FLEET_MANAGER', label: 'Fleet Manager (Client Portal)' },
  { value: 'CUSTOMER_MEMBER', label: 'Customer Member (Client Portal)' },
];

export default function UserManagement() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // Filters & State
  const [regionFilter, setRegionFilter] = useState<'ALL' | 'CA' | 'US' | 'UK'>('ALL');
  const [classificationFilter, setClassificationFilter] = useState<'ALL' | 'INTERNAL' | 'EXTERNAL'>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Selected User for Credential Reset Modal
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Add User Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Delete User Modal State
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Fetch users with reactive query
  const queryParams = useMemo(() => ({
    page,
    limit,
    countryCode: regionFilter === 'ALL' ? undefined : regionFilter,
    classification: classificationFilter,
    role: roleFilter || undefined,
    search: searchQuery.trim() || undefined,
  }), [page, limit, regionFilter, classificationFilter, roleFilter, searchQuery]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['users-management', queryParams],
    queryFn: () => userService.getUsers(queryParams),
    staleTime: 30000,
  });

  const users = data?.data || [];
  const meta = data?.meta || { currentPage: 1, totalPages: 1, totalCount: 0, perPage: limit };

  const handleOpenResetModal = (user: UserItem) => {
    setSelectedUser(user);
    setIsResetModalOpen(true);
  };

  const handleResetSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['users-management'] });
    refetch();
  };

  const handleCreateSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['users-management'] });
    refetch();
  };

  const handleDeleteOpen = (user: UserItem) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['users-management'] });
    refetch();
  };

  const isRoleExternal = (role: string) => EXTERNAL_ROLES.includes(role);

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'DEVELOPER':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'ADMIN':
      case 'GENERAL_MANAGER':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'DISPATCHER':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'DRIVER':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ACCOUNTANT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'FLEET_MANAGER':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'CUSTOMER_MEMBER':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 px-1 sm:px-2">
      {/* 1. Header (HCI Signifier & Feedback) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                User & Credential Management
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                DEVELOPER ONLY
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Provision accounts, override passwords, manage roles, and delete user profiles across all silos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Add User Action */}
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl transition shadow-xs cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add User</span>
          </button>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition cursor-pointer disabled:opacity-50"
            title="Refresh user accounts"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Overview Metrics Bento Strip (HCI Visibility & Status) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Users</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-lg font-bold text-slate-900 mt-1 font-mono">{meta.totalCount}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Internal Staff</span>
            <UserCog className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-lg font-bold text-blue-700 mt-1 font-mono">
            {classificationFilter === 'INTERNAL' ? meta.totalCount : '8 Roles'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Portal Clients</span>
            <ExternalLink className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-lg font-bold text-purple-700 mt-1 font-mono">
            {classificationFilter === 'EXTERNAL' ? meta.totalCount : '2 Portals'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Region</span>
            <Globe2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-lg font-bold text-emerald-700 mt-1 font-mono">
            {regionFilter === 'ALL' ? 'CA • US • UK' : regionFilter}
          </p>
        </div>
      </div>

      {/* 3. Filters & Classification Bar (Gestalt Law of Proximity & Grouping) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Classification & Region Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Classification Tabs (Internal vs External vs All) */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl select-none">
              {[
                { id: 'ALL', label: 'All Users' },
                { id: 'INTERNAL', label: 'Internal Staff' },
                { id: 'EXTERNAL', label: 'External Clients' },
              ].map((tab) => {
                const isSelected = classificationFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setClassificationFilter(tab.id as any);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                      isSelected
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Region Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl select-none">
              {[
                { id: 'ALL', label: 'All Regions' },
                { id: 'CA', label: 'Canada (CA)' },
                { id: 'US', label: 'USA (US)' },
                { id: 'UK', label: 'UK (UK)' },
              ].map((tab) => {
                const isSelected = regionFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setRegionFilter(tab.id as any);
                      setPage(1);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                      isSelected
                        ? 'bg-white text-red-700 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search & Specific Role Filter */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            {/* Specific Role Dropdown */}
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
            >
              {ALL_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search user by name, email, phone..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
              />
            </div>

            {(roleFilter || searchQuery || classificationFilter !== 'ALL' || regionFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setRegionFilter('ALL');
                  setClassificationFilter('ALL');
                  setRoleFilter('');
                  setSearchQuery('');
                  setPage(1);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                title="Clear all filters"
              >
                <FilterX size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Users Data Table (Gestalt Similarity & Common Region) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">Loading user accounts...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Users className="w-9 h-9 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">No users match your criteria</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting the regional silo, classification filter, or search keyword.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Account Email</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Region</th>
                  <th className="py-3 px-4">Presence</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {users.map((u) => {
                  const isExt = isRoleExternal(u.role);
                  const isCurrentUser = currentUser?.id === u.id;
                  return (
                    <tr 
                      key={u.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Name & Phone */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-red-700 transition-colors">
                          {u.fullName}
                        </div>
                        {u.phone && (
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            {u.phone}
                          </div>
                        )}
                      </td>

                      {/* Email */}
                      <td className="py-3 px-4 font-mono text-slate-700 font-medium">
                        {u.email}
                      </td>

                      {/* Classification Badge */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          isExt 
                            ? 'bg-purple-50 text-purple-700 border-purple-200' 
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {isExt ? 'EXTERNAL CLIENT' : 'INTERNAL STAFF'}
                        </span>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${getRoleBadgeStyle(u.role)}`}>
                          {u.role}
                        </span>
                      </td>

                      {/* Region Silo */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-600">
                        {u.countryCode}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${u.isAgentActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          <span className="text-[11px] text-slate-600 font-medium">
                            {u.isAgentActive ? 'Active' : 'Standby'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Change Credentials */}
                          <button
                            type="button"
                            onClick={() => handleOpenResetModal(u)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-slate-800 bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-300 border border-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer group-hover:border-slate-300"
                            title="Change credentials"
                          >
                            <KeyRound size={12} className="text-slate-500 group-hover:text-red-600" />
                            <span className="hidden sm:inline">Change Credentials</span>
                            <span className="sm:hidden">Reset</span>
                          </button>

                          {/* Delete User */}
                          <button
                            type="button"
                            onClick={() => handleDeleteOpen(u)}
                            disabled={isCurrentUser}
                            className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400 disabled:hover:border-slate-200"
                            title={isCurrentUser ? "Cannot delete your own account" : "Delete user account"}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Pagination Footer */}
        {meta.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 bg-slate-50/50">
            <div>
              Showing <span className="font-bold text-slate-800">{((page - 1) * limit) + 1}</span> to{' '}
              <span className="font-bold text-slate-800">{Math.min(page * limit, meta.totalCount)}</span> of{' '}
              <span className="font-bold text-slate-800">{meta.totalCount}</span> users
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 py-1 font-mono font-bold text-slate-700">
                {page} / {meta.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reset Credentials Modal */}
      <ResetCredentialsModal
        user={selectedUser}
        isOpen={isResetModalOpen}
        onClose={() => {
          setIsResetModalOpen(false);
          setSelectedUser(null);
        }}
        onSuccess={handleResetSuccess}
      />

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
        defaultRegion={regionFilter === 'ALL' ? 'CA' : regionFilter}
      />

      {/* Delete User Modal */}
      <DeleteUserModal
        user={userToDelete}
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setUserToDelete(null);
        }}
        onSuccess={handleDeleteSuccess}
        currentUserId={currentUser?.id}
      />
    </div>
  );
}

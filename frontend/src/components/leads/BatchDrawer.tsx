import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  X, 
  Play, 
  Calendar, 
  Layers, 
  Users, 
  RefreshCw, 
  Plus 
} from 'lucide-react';
import { api } from '../../utils/api';
import { toast } from 'sonner';

interface BatchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  country: string;
  onOpenUpload: () => void;
}

export default function BatchDrawer({
  isOpen,
  onClose,
  country,
  onOpenUpload,
}: BatchDrawerProps) {
  const queryClient = useQueryClient();
  const [startingBatchId, setStartingBatchId] = useState<string | null>(null);

  // Fetch batches for this country
  const { data: batches = [], isLoading, refetch } = useQuery({
    queryKey: ['batches', country],
    queryFn: async () => {
      const res = await api.get(`/leads/batches?countryCode=${country}`);
      return res.data?.data || [];
    },
    enabled: isOpen,
    refetchInterval: isOpen ? 10000 : false,
  });

  // Fetch stats & online VAs
  const { data: leadStats } = useQuery({
    queryKey: ['lead-stats', country],
    queryFn: async () => {
      const res = await api.get(`/leads/stats?countryCode=${country}`);
      return res.data?.data;
    },
    enabled: isOpen,
  });

  // Start Batch Mutation
  const startBatchMutation = useMutation({
    mutationFn: async (batchId?: string) => {
      const res = await api.post('/leads/start-batch', {
        batchId,
        countryCode: country,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Campaign batch activated successfully!');
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['agent-queue'] });
      setStartingBatchId(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || 'Failed to start batch');
      setStartingBatchId(null);
    },
  });

  const handleStartBatch = (batchId: string) => {
    setStartingBatchId(batchId);
    startBatchMutation.mutate(batchId);
  };

  if (!isOpen) return null;

  const vaWorkloads = leadStats?.vaWorkloads || [];
  const activeVasCount = vaWorkloads.length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold">
                <Layers size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Regional Day Batches
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px] font-bold">
                    {country}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Scheduled lead batches & instant dispatch
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => refetch()}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                title="Refresh"
              >
                <RefreshCw size={16} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Active Online VAs Bar */}
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Users size={14} className="text-slate-500" />
              <span className="font-semibold">Active Online VAs:</span>
              <span className="font-bold font-mono text-slate-900">{activeVasCount}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenUpload();
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 cursor-pointer"
            >
              <Plus size={14} />
              <span>Upload New Batch</span>
            </button>
          </div>

          {/* Batches Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-400 text-xs">
                Loading regional batches...
              </div>
            ) : batches.length === 0 ? (
              <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl">
                <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No batches for {country}</p>
                <p className="text-[11px] text-slate-500 mt-1 mb-4">
                  Upload an Excel or CSV spreadsheet to create a regional batch.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenUpload();
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Upload Spreadsheet Now
                </button>
              </div>
            ) : (
              batches.map((batch: any) => {
                const isScheduled = batch.status === 'SCHEDULED';
                const isActive = batch.status === 'ACTIVE';
                const unassignedCount = Number(batch.unassignedLeads || 0);
                const heldCount = Number(batch.heldLeads || 0);
                const totalCount = Number(batch.totalLeads || 0);

                return (
                  <div
                    key={batch.id}
                    className={`border rounded-2xl p-4 transition-all duration-150 ${
                      isActive 
                        ? 'bg-emerald-50/40 border-emerald-300 shadow-xs' 
                        : isScheduled 
                        ? 'bg-blue-50/30 border-blue-200' 
                        : 'bg-slate-50/60 border-slate-200 opacity-80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {batch.batchName}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                          <Calendar size={11} />
                          <span>
                            {batch.scheduledDate
                              ? new Date(batch.scheduledDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Immediate'}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono tracking-wider shrink-0 border ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : isScheduled
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : 'bg-slate-200 text-slate-700 border-slate-300'
                        }`}
                      >
                        {batch.status}
                      </span>
                    </div>

                    {/* Progress Numbers */}
                    <div className="grid grid-cols-3 gap-2 my-3 text-center">
                      <div className="p-2 rounded-xl bg-white border border-slate-200/80">
                        <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Unassigned</div>
                        <div className="text-sm font-bold text-slate-900 font-mono">{unassignedCount}</div>
                      </div>
                      <div className="p-2 rounded-xl bg-white border border-slate-200/80">
                        <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Held by VAs</div>
                        <div className="text-sm font-bold text-amber-600 font-mono">{heldCount}</div>
                      </div>
                      <div className="p-2 rounded-xl bg-white border border-slate-200/80">
                        <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Total</div>
                        <div className="text-sm font-bold text-slate-700 font-mono">{totalCount}</div>
                      </div>
                    </div>

                    {/* Action Button: 1-Click Start Batch Now */}
                    {unassignedCount > 0 && (
                      <button
                        type="button"
                        disabled={startingBatchId === batch.id || startBatchMutation.isPending}
                        onClick={() => handleStartBatch(batch.id)}
                        className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs ${
                          isActive
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                      >
                        <Play size={14} />
                        <span>
                          {startingBatchId === batch.id
                            ? 'Activating & Refilling VAs...'
                            : isActive
                            ? 'Distribute Remaining to VAs'
                            : 'Start Batch Now (1-Lead Cap)'}
                        </span>
                      </button>
                    )}

                    {unassignedCount === 0 && (
                      <div className="text-center py-1 text-[11px] text-slate-500 font-medium">
                        ✓ All leads in this batch have been worked or assigned
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

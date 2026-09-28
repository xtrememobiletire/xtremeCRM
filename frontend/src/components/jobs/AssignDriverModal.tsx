import { useState, useEffect } from 'react';
import { Truck, Navigation, Globe, Copy, Check, ExternalLink } from 'lucide-react';
import Modal from '../ui/Modal';
import { useQuery } from '@tanstack/react-query';
import { userService, type UserItem } from '../../services/userService';
import { useAssignDriver } from '../../hooks/useJobs';
import { useNotificationSound } from '../../hooks/useNotificationSound';
import { api } from '../../utils/api';
import { toast } from 'sonner';

interface AssignDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
}

export default function AssignDriverModal({ isOpen, onClose, job }: AssignDriverModalProps) {
  const assignDriverMutation = useAssignDriver();
  const { playSuccess } = useNotificationSound();
  const [activeTab, setActiveTab] = useState<'internal' | 'external'>('internal');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');

  // External driver link generation state
  const [payoutAmount, setPayoutAmount] = useState<string>('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (job) {
      const defaultVal = job.externalDriverValueCents
        ? (job.externalDriverValueCents / 100).toFixed(2)
        : job.totalCents
        ? (job.totalCents / 100).toFixed(2)
        : job.totalAmount
        ? (job.totalAmount / 100).toFixed(2)
        : '150.00';
      setPayoutAmount(defaultVal);
      if (job.externalDriverToken) {
        setGeneratedLink(`${window.location.origin}/ext/${job.externalDriverToken}`);
      } else {
        setGeneratedLink('');
      }
    }
  }, [job]);

  const { data: drivers = [], isLoading } = useQuery<UserItem[]>({
    queryKey: ['drivers'],
    queryFn: () => userService.getDrivers(),
    enabled: isOpen,
  });

  if (!job) return null;

  const handleAssignInternal = async () => {
    if (!selectedDriverId) {
      toast.error('Please select a driver to dispatch');
      return;
    }

    try {
      await assignDriverMutation.mutateAsync({
        jobId: job.id,
        driverId: selectedDriverId,
      });
      playSuccess();
      toast.success('Technician dispatched successfully');
      onClose();
    } catch {
      toast.error('Failed to dispatch driver');
    }
  };

  const handleGenerateLink = async () => {
    const valCents = Math.round(parseFloat(payoutAmount || '0') * 100);
    if (valCents <= 0) {
      toast.error('Please specify a valid agreed driver payout amount');
      return;
    }

    setIsGeneratingLink(true);
    try {
      const res = await api.post(`/jobs/${job.id}/external-driver-link`, {
        externalDriverValueCents: valCents,
      });
      const token = res.data?.data?.token;
      const fullUrl = `${window.location.origin}/ext/${token}`;
      setGeneratedLink(fullUrl);
      playSuccess();
      toast.success('Public dispatch link generated');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to generate dispatch link');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Dispatch Driver for Job #${job.jobCode || job.jobNumber}`}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Destination Header */}
        <p className="text-xs text-slate-500">
          Target Destination: <strong className="text-slate-800">{job.locationAddress || job.serviceAddress || 'Roadside Call'}</strong>
        </p>

        {/* Tab Toggle */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('internal')}
            className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'internal'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck size={14} />
            <span>Company Driver</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('external')}
            className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'external'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe size={14} />
            <span>External Driver</span>
          </button>
        </div>

        {activeTab === 'internal' ? (
          <>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-xs text-slate-500">Loading active technicians...</div>
              ) : drivers.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">No active drivers registered in this region</div>
              ) : (
                drivers.map((drv) => {
                  const isSelected = selectedDriverId === drv.id;
                  return (
                    <button
                      key={drv.id}
                      type="button"
                      onClick={() => setSelectedDriverId(drv.id)}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                        isSelected
                          ? 'border-red-600 bg-red-50/60 ring-2 ring-red-500/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <Truck size={18} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs sm:text-sm">{drv.fullName}</div>
                          <div className="text-[11px] text-slate-500">{drv.phone || drv.email}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1 text-[11px] font-semibold text-emerald-600">
                          <Navigation size={12} />
                          <span>Available</span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={onClose} className="btn-secondary px-3 py-2 text-xs">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignInternal}
                disabled={!selectedDriverId || assignDriverMutation.isPending}
                className="btn-primary px-4 py-2 text-xs cursor-pointer disabled:opacity-50"
              >
                {assignDriverMutation.isPending ? 'Assigning...' : 'Confirm Dispatch'}
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
              Dispatch this order to a third-party or sub-contracted driver. The link presents a public form showing job details and locked payout value.
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Agreed Driver Payout ({job.currency || 'CAD'})
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-mono">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="150.00"
                  className="w-full pl-7 pr-4 py-2 text-sm rounded-xl border border-slate-200 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                This amount is locked on the public form and cannot be edited by the external driver.
              </p>
            </div>

            {generatedLink ? (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Shareable Public Form Link</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-700 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="btn-secondary px-3 py-2 text-xs flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <a
                    href={generatedLink}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 shrink-0"
                    title="Open form"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGenerateLink}
                disabled={isGeneratingLink}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <Globe size={14} />
                <span>{isGeneratingLink ? 'Generating Link...' : 'Generate External Driver Link'}</span>
              </button>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={onClose} className="btn-secondary px-3 py-2 text-xs">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

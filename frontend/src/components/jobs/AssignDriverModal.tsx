import { useState } from 'react';
import { Truck, Navigation } from 'lucide-react';
import Modal from '../ui/Modal';
import { useQuery } from '@tanstack/react-query';
import { userService, type UserItem } from '../../services/userService';
import { useAssignDriver } from '../../hooks/useJobs';
import { toast } from 'sonner';

interface AssignDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
}

export default function AssignDriverModal({ isOpen, onClose, job }: AssignDriverModalProps) {
  const assignDriverMutation = useAssignDriver();
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');

  const { data: drivers = [], isLoading } = useQuery<UserItem[]>({
    queryKey: ['drivers'],
    queryFn: () => userService.getDrivers(),
    enabled: isOpen,
  });

  if (!job) return null;

  const handleAssign = async () => {
    if (!selectedDriverId) {
      toast.error('Please select a driver to dispatch');
      return;
    }

    try {
      await assignDriverMutation.mutateAsync({
        jobId: job.id,
        driverId: selectedDriverId,
      });
      toast.success('Technician dispatched successfully');
      onClose();
    } catch (err: any) {
      toast.error('Failed to dispatch driver');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Dispatch Driver for Job #${job.jobNumber}`}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-500">
          Target Destination: <strong className="text-slate-800">{job.locationAddress || 'Roadside Call'}</strong>
        </p>

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
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition ${
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
            onClick={handleAssign}
            disabled={!selectedDriverId || assignDriverMutation.isPending}
            className="btn-primary px-4 py-2 text-xs"
          >
            {assignDriverMutation.isPending ? 'Assigning...' : 'Confirm Dispatch'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

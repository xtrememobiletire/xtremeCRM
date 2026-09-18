import { useState } from 'react';
import { Truck, Navigation, Clock } from 'lucide-react';
import Modal from '../ui/Modal';
import { useAssignDriver } from '../../hooks/useJobs';
import { toast } from 'sonner';

interface AssignDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
}

// Mock available roadside drivers (or fetched from driver roster)
const MOCK_DRIVERS = [
  { id: 'drv-1', name: 'Marcus Vance', vehicle: 'Van #04 (Ford Transit)', distance: '3.2 km', eta: '12 mins', status: 'AVAILABLE' },
  { id: 'drv-2', name: 'Devon Lee', vehicle: 'Truck #08 (RAM 3500 HD)', distance: '5.8 km', eta: '18 mins', status: 'AVAILABLE' },
  { id: 'drv-3', name: 'Tyler Ross', vehicle: 'Van #02 (Mercedes Sprinter)', distance: '8.4 km', eta: '24 mins', status: 'BUSY' },
  { id: 'drv-4', name: 'Samir Patel', vehicle: 'Service Rig #12', distance: '12.1 km', eta: '35 mins', status: 'AVAILABLE' },
];

export default function AssignDriverModal({ isOpen, onClose, job }: AssignDriverModalProps) {
  const assignDriverMutation = useAssignDriver();
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');

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

        <div className="space-y-2">
          {MOCK_DRIVERS.map((drv) => {
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
                    <div className="font-bold text-slate-900 text-xs sm:text-sm">{drv.name}</div>
                    <div className="text-[11px] text-slate-500">{drv.vehicle}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 text-[11px] font-semibold text-emerald-600">
                    <Navigation size={12} />
                    <span>{drv.distance}</span>
                  </div>
                  <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 font-mono">
                    <Clock size={11} />
                    <span>{drv.eta}</span>
                  </div>
                </div>
              </button>
            );
          })}
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

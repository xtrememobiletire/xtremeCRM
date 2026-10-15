import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Inbox } from 'lucide-react';
import { jobService, type JobItem } from '../services/jobService';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { useSocket } from '../context/SocketContext';
import { useUpdateJobStatus } from '../hooks/useJobs';

import TechnicianHeader from '../components/technician/TechnicianHeader';
import TechnicianTabs, { type TechnicianTabType } from '../components/technician/TechnicianTabs';
import TechnicianJobCard from '../components/technician/TechnicianJobCard';
import TechnicianDeclineModal from '../components/technician/TechnicianDeclineModal';
import TechnicianPaymentModal from '../components/technician/TechnicianPaymentModal';
import TechnicianLiveMapModal from '../components/technician/TechnicianLiveMapModal';
import JobChatModal from '../components/dispatch/JobChatModal';
import { useLiveJobTracker } from '../hooks/useLiveJobTracker';

export default function TechnicianPortal() {
  const { user } = useAuth();
  const { currencySymbol } = useTenant();
  const { socket } = useSocket();
  const updateStatusMutation = useUpdateJobStatus();

  // Tab State: Defaults to PENDING so new incoming dispatches are seen first
  const [activeTab, setActiveTab] = useState<TechnicianTabType>('PENDING');

  // Modal States
  const [mapModalJob, setMapModalJob] = useState<any | null>(null);
  const [declineModalJob, setDeclineModalJob] = useState<any | null>(null);
  const [paymentModalJob, setPaymentModalJob] = useState<any | null>(null);
  const [chatModalJob, setChatModalJob] = useState<JobItem | null>(null);
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);

  // Fetch driver assigned jobs
  const { data: jobsResponse, isFetching, refetch } = useQuery({
    queryKey: ['technician-jobs', user?.id],
    queryFn: () => jobService.getJobs({ limit: 50, driverId: user?.id }),
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });

  // Socket.io instant sync for driver jobs
  useEffect(() => {
    if (!socket) return;
    const handleJobUpdate = () => {
      refetch();
    };
    socket.on('job:assigned', handleJobUpdate);
    socket.on('job:status_updated', handleJobUpdate);
    socket.on('notification:job_assigned', handleJobUpdate);
    return () => {
      socket.off('job:assigned', handleJobUpdate);
      socket.off('job:status_updated', handleJobUpdate);
      socket.off('notification:job_assigned', handleJobUpdate);
    };
  }, [socket, refetch]);

  const rawJobs = jobsResponse?.data || [];
  // Strict driver isolation: include currently assigned jobs
  const driverJobs = useMemo(() => {
    if (!user?.id) return rawJobs;
    return rawJobs.filter((j: any) => {
      // Must be currently assigned to this driver
      const isAssignedToMe = (j.driverId === user.id || j.driver?.id === user.id);
      // If unassigned or declined by this driver, exclude from active/pending orders
      if (!isAssignedToMe || j.lastDeclinedDriverId === user.id) {
        return false;
      }
      return true;
    });
  }, [rawJobs, user]);

  // Split jobs into Pending and Active categories
  const { pendingJobs, activeJobs } = useMemo(() => {
    const pending: any[] = [];
    const active: any[] = [];

    driverJobs.forEach((job: any) => {
      // Completed and cancelled jobs belong in History (/history)
      if (job.status === 'COMPLETED' || job.status === 'CANCELLED') {
        return;
      }

      const disp = job.dispositionNotes;
      const isAlreadyAccepted =
        disp === 'ACCEPTED' ||
        disp === 'EN_ROUTE' ||
        disp === 'ON_SCENE' ||
        disp === 'ARRIVED' ||
        job.status === 'IN_PROGRESS';

      if (isAlreadyAccepted) {
        active.push(job);
      } else {
        pending.push(job);
      }
    });

    return {
      pendingJobs: pending,
      activeJobs: active,
    };
  }, [driverJobs]);

  // Continuous background GPS live tracker for active assignment
  const primaryActiveJob = activeJobs[0] || null;
  const currentTrackedJob = mapModalJob || primaryActiveJob;

  const {
    myLocation,
    distanceToJobMeters,
    gpsError,
    isTracking,
    requestImmediateLocation,
  } = useLiveJobTracker({
    activeJob: currentTrackedJob,
    autoStatusEnabled: true,
  });

  // Handler: Accept Job (moves job to ACTIVE and opens Live Map Pop-up)
  const handleAcceptJob = (jobId: string) => {
    setUpdatingJobId(jobId);
    const targetJob = pendingJobs.find((j: any) => j.id === jobId) || {
      id: jobId,
      status: 'ACCEPTED',
      dispositionNotes: 'ACCEPTED',
    };

    updateStatusMutation.mutate(
      { id: jobId, status: 'ACCEPTED' },
      {
        onSuccess: () => {
          toast.success('Assignment accepted! Opening Live Map...');
          setActiveTab('ACTIVE');
          refetch();
          setMapModalJob(targetJob);
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || 'Failed to accept job');
        },
        onSettled: () => {
          setUpdatingJobId(null);
        },
      }
    );
  };

  // Handler: Decline Job Confirmation (unassigns driver and resets status to PENDING on backend)
  const handleConfirmDecline = (reason: string) => {
    if (!declineModalJob) return;
    setUpdatingJobId(declineModalJob.id);
    updateStatusMutation.mutate(
      {
        id: declineModalJob.id,
        status: 'CANCELLED',
        driverDeclineReason: reason,
      },
      {
        onSuccess: () => {
          toast.success('Assignment declined. Job returned to dispatch.');
          setDeclineModalJob(null);
          refetch();
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || 'Failed to decline assignment');
        },
        onSettled: () => {
          setUpdatingJobId(null);
        },
      }
    );
  };

  // Handler: Progress Job Stage (En Route / Arrived on Scene)
  const handleProgressStage = (jobId: string, nextStatus: string) => {
    setUpdatingJobId(jobId);
    updateStatusMutation.mutate(
      { id: jobId, status: nextStatus },
      {
        onSuccess: () => {
          const label = nextStatus === 'EN_ROUTE' ? 'En Route' : 'Arrived on Scene';
          toast.success(`Job stage updated: ${label}`);
          refetch();
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || 'Failed to update stage');
        },
        onSettled: () => {
          setUpdatingJobId(null);
        },
      }
    );
  };

  // Handler: Payment Complete (completes job, collects payment, informs driver)
  const handleCompletePayment = (data: {
    paymentMethod: 'CASH' | 'POS' | 'E_TRANSFER';
    amountCents: number;
    receiptFile: File | null;
  }) => {
    if (!paymentModalJob) return;

    const formData = new FormData();
    formData.append('status', 'COMPLETED');
    formData.append('paymentMethod', data.paymentMethod);
    formData.append('amountCents', String(data.amountCents));
    if (data.paymentMethod === 'CASH') {
      formData.append('cashAmountCents', String(data.amountCents));
    }
    if (data.receiptFile) {
      formData.append('receipt', data.receiptFile);
    }

    setUpdatingJobId(paymentModalJob.id);
    updateStatusMutation.mutate(
      { id: paymentModalJob.id, formData },
      {
        onSuccess: () => {
          toast.success('Job marked completed! Payout recorded in History.');
          setPaymentModalJob(null);
          refetch();
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || 'Failed to complete job');
        },
        onSettled: () => {
          setUpdatingJobId(null);
        },
      }
    );
  };

  const currentTabJobs = activeTab === 'PENDING' ? pendingJobs : activeJobs;

  return (
    <div className="space-y-4 sm:space-y-5 max-w-6xl mx-auto pb-16 px-1 sm:px-2">
      {/* 1. Header with Driver Info & Refresh */}
      <TechnicianHeader
        user={user}
        pendingCount={pendingJobs.length}
        activeCount={activeJobs.length}
        isRefreshing={isFetching}
        onRefresh={() => refetch()}
      />

      {/* 2. Minimalist Tabs: Pending (default), Active */}
      <TechnicianTabs
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        pendingCount={pendingJobs.length}
        activeCount={activeJobs.length}
      />

      {/* 3. Tab Content */}
      <div>
        {currentTabJobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Inbox className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              {activeTab === 'PENDING'
                ? 'No pending dispatches'
                : 'No active jobs in progress'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {activeTab === 'PENDING'
                ? 'New roadside or scheduled assignments from dispatch will appear here.'
                : 'Accept a pending assignment to start working on it.'}
            </p>
          </div>
        ) : (
          /* 100% Container Layout: Stack on Mobile (1 col), Responsive Grid on Desktop */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4.5">
            {currentTabJobs.map((job) => (
              <TechnicianJobCard
                key={job.id}
                job={job}
                tabType={activeTab}
                currencySymbol={currencySymbol}
                isUpdating={updatingJobId === job.id}
                onAccept={handleAcceptJob}
                onDecline={(j) => setDeclineModalJob(j)}
                onProgressStage={handleProgressStage}
                onOpenPayment={(j) => setPaymentModalJob(j)}
                onOpenChat={(j) => setChatModalJob(j)}
                onOpenMap={(j) => setMapModalJob(j)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Live Tracking Map Popup Modal (Balanced for Mobile & Desktop) */}
      {mapModalJob && (
        <TechnicianLiveMapModal
          isOpen={true}
          onClose={() => setMapModalJob(null)}
          job={mapModalJob}
          currencySymbol={currencySymbol}
          onOpenPaymentModal={(j) => {
            setMapModalJob(null);
            setPaymentModalJob(j);
          }}
          onStatusUpdate={handleProgressStage}
          myLocation={myLocation}
          distanceToJobMeters={distanceToJobMeters}
          displacementMeters={distanceToJobMeters}
          isTracking={isTracking}
          gpsError={gpsError}
          requestImmediateLocation={requestImmediateLocation}
        />
      )}

      {/* Decline Reason Modal */}
      {declineModalJob && (
        <TechnicianDeclineModal
          isOpen={true}
          onClose={() => setDeclineModalJob(null)}
          jobCode={declineModalJob.jobCode || declineModalJob.jobNumber}
          isSubmitting={updatingJobId === declineModalJob.id}
          onConfirmDecline={handleConfirmDecline}
        />
      )}

      {/* Payment Collection & Completion Modal */}
      {paymentModalJob && (
        <TechnicianPaymentModal
          isOpen={true}
          onClose={() => setPaymentModalJob(null)}
          job={paymentModalJob}
          currencySymbol={currencySymbol}
          isSubmitting={updatingJobId === paymentModalJob.id}
          onComplete={handleCompletePayment}
        />
      )}

      {/* Two-Way Dispatcher Chat Modal */}
      {chatModalJob && (
        <JobChatModal
          jobId={chatModalJob.id}
          jobCode={chatModalJob.jobCode || chatModalJob.jobNumber}
          driverName={chatModalJob.driver?.fullName || 'Technician'}
          isOpen={true}
          onClose={() => setChatModalJob(null)}
        />
      )}
    </div>
  );
}

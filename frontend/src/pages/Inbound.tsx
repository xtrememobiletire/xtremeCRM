import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import InboundIntakeForm from '../components/pages/inbound/InboundIntakeForm';
import InboundCallStation, { type CallLogEntry } from '../components/pages/inbound/InboundCallStation';
import { useTenant } from '../context/TenantContext';
import { useSocket } from '../context/SocketContext';
import { jobService } from '../services/jobService';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { toast } from 'sonner';

export default function Inbound() {
  const { country } = useTenant();
  const { 
    incomingCall, 
    activeCall, 
    answerCall, 
    endCall, 
    transferCallToDm, 
    simulateIncomingCall 
  } = useSocket();

  // Intake Form State
  const [callerPhone, setCallerPhone] = useState('');
  const [callerName, setCallerName] = useState('');
  const [leadSource, setLeadSource] = useState('DIRECT_CALL');
  const [serviceAddress, setServiceAddress] = useState('');
  const [vehicleMakeModel, setVehicleMakeModel] = useState('');
  const [tireSize, setTireSize] = useState('');
  const [selectedService, setSelectedService] = useState('Tire Repair (plug)');
  const [urgency, setUrgency] = useState<'URGENT' | 'STANDARD' | 'FUTURE'>('URGENT');
  const [etaMinutes, setEtaMinutes] = useState('30');
  const [notes, setNotes] = useState('');
  const [isProvisionAccount, setIsProvisionAccount] = useState(true);

  // Telephony & Call State
  const [callDuration, setCallDuration] = useState(0);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [callLogs, setCallLogs] = useState<CallLogEntry[]>([]);

  // Synchronize incoming caller into form when call pops
  useEffect(() => {
    if (!incomingCall) return;
    const timer = setTimeout(() => {
      setCallerPhone(incomingCall.from || '');
      setCallerName(incomingCall.fromName || '');
    }, 0);
    return () => clearTimeout(timer);
  }, [incomingCall]);

  // Live call duration timer
  useEffect(() => {
    if (!activeCall) return;
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => {
      clearInterval(interval);
      setCallDuration(0);
    };
  }, [activeCall]);

  // Warm Transfer Call to Dispatcher Manager
  const handleWarmTransferToDm = async () => {
    if (!callerPhone) {
      toast.error('Caller phone is required for warm transfer');
      return;
    }
    setIsTransferring(true);
    try {
      const vehicleInfo = `${vehicleMakeModel || 'Vehicle'} | Tire: ${tireSize || 'Pending'}`;
      const transferNotes = `Breakdown at: ${serviceAddress || 'Address Pending'}. Service: ${selectedService}. Vehicle: ${vehicleInfo}. Notes: ${notes || 'Immediate dispatch required'}`;
      
      await transferCallToDm({
        callerPhone,
        callerName: callerName || 'Roadside Motorist',
        notes: transferNotes,
        vehicleInfo,
        transferType: 'INBOUND_MOTORIST',
      });

      setCallLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          phone: callerPhone,
          callerName: callerName || 'Roadside Motorist',
          time: 'Just now',
          service: selectedService,
          disposition: 'Transferred to DM',
          transferredToDm: true,
        },
        ...prev,
      ]);

      toast.success('Call transferred to Dispatcher Manager');
      endCall();
    } catch {
      toast.error('Failed to initiate warm transfer');
    } finally {
      setIsTransferring(false);
    }
  };

  // Direct Book Job Ticket into Dispatch Queue
  const handleDirectBookJob = async () => {
    if (!callerPhone || !serviceAddress) {
      toast.error('Caller phone and breakdown address are required');
      return;
    }
    setIsBooking(true);
    try {
      await jobService.createJob({
        customerName: callerName || 'Roadside Motorist',
        customerPhone: callerPhone,
        serviceAddress,
        notes,
        urgency,
        countryCode: country,
        source: leadSource,
        makeUserAccount: isProvisionAccount,
        services: [selectedService],
        vehicle: {
          makeModel: vehicleMakeModel,
          tireSize,
        },
      });

      setCallLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          phone: callerPhone,
          callerName: callerName || 'Roadside Motorist',
          time: 'Just now',
          service: selectedService,
          disposition: 'Booked Direct',
          transferredToDm: false,
        },
        ...prev,
      ]);

      toast.success('Job ticket created & dispatched');
      setCallerPhone('');
      setCallerName('');
      setServiceAddress('');
      setVehicleMakeModel('');
      setTireSize('');
      setNotes('');
      endCall();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create dispatch ticket');
    } finally {
      setIsBooking(false);
    }
  };

  // Quick Dispositions
  const handleQuickDisposition = (disp: string) => {
    if (!callerPhone && !activeCall && !incomingCall) {
      toast.info('No active call to disposition');
      return;
    }
    setCallLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        phone: callerPhone || incomingCall?.from || activeCall?.from || 'Unknown',
        callerName: callerName || 'Motorist',
        time: 'Just now',
        service: selectedService,
        disposition: disp,
        transferredToDm: false,
      },
      ...prev,
    ]);
    toast.info(`Call logged: ${disp}`);
    endCall();
  };

  const handleSimulateCall = () => {
    simulateIncomingCall('+1 (416) 555-0199', 'Roadside Motorist (Highway 401)');
    setServiceAddress('Hwy 401 EB shoulder near Exit 342');
    setVehicleMakeModel('2022 Ford F-150');
    setTireSize('275/65R18');
    setSelectedService('Tire Repair (plug)');
    toast.info('Simulated call incoming');
  };

  // Keyboard Shortcuts for Telephony
  useKeyboardShortcuts({
    'Alt+t': () => handleWarmTransferToDm(),
    'Alt+w': () => handleQuickDisposition('Wrong Number'),
    'Alt+p': () => handleQuickDisposition('Price Shopper'),
    'Alt+s': () => handleQuickDisposition('Spam'),
    'Escape': () => {
      if (activeCall || incomingCall) endCall();
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inbound Hotline"
        subtitle={`Live call intake & dispatch triage (${country})`}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSimulateCall}
              className="btn-primary py-1.5 px-3 text-xs cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Sparkles size={14} />
              <span>Simulate Call</span>
            </button>
          </div>
        }
      />

      {/* Main Grid: Funnel Stepper Intake Form (Left 2 Cols) + Call Station (Right 1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2">
          <InboundIntakeForm
            callerPhone={callerPhone}
            setCallerPhone={setCallerPhone}
            callerName={callerName}
            setCallerName={setCallerName}
            leadSource={leadSource}
            setLeadSource={setLeadSource}
            serviceAddress={serviceAddress}
            setServiceAddress={setServiceAddress}
            vehicleMakeModel={vehicleMakeModel}
            setVehicleMakeModel={setVehicleMakeModel}
            tireSize={tireSize}
            setTireSize={setTireSize}
            selectedService={selectedService}
            setSelectedService={setSelectedService}
            urgency={urgency}
            setUrgency={setUrgency}
            etaMinutes={etaMinutes}
            setEtaMinutes={setEtaMinutes}
            notes={notes}
            setNotes={setNotes}
            isProvisionAccount={isProvisionAccount}
            setIsProvisionAccount={setIsProvisionAccount}
            isBooking={isBooking}
            onSubmitBooking={handleDirectBookJob}
          />
        </div>

        <div className="lg:col-span-1">
          <InboundCallStation
            incomingCall={incomingCall}
            activeCall={activeCall}
            callDuration={callDuration}
            callerPhone={callerPhone}
            callerName={callerName}
            leadSource={leadSource}
            isTransferring={isTransferring}
            callLogs={callLogs}
            onAnswerCall={answerCall}
            onEndCall={endCall}
            onWarmTransferToDm={handleWarmTransferToDm}
            onQuickDisposition={handleQuickDisposition}
          />
        </div>
      </div>
    </div>
  );
}

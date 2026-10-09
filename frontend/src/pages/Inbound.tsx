import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import InboundIntakeForm from '../components/pages/inbound/InboundIntakeForm';
import InboundCallStation, { type CallLogEntry } from '../components/pages/inbound/InboundCallStation';
import { useTenant } from '../context/TenantContext';
import { useSocket } from '../context/SocketContext';
import { jobService } from '../services/jobService';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { REGIONAL_SIMULATION_DATA } from '../constants/simulation';
import { toast } from 'sonner';
import type { SelectedServiceItem } from '../components/common/MultiServiceSelector';
import type { GeocodeLocation } from '../components/common/AddressAutocompleteInput';

export default function Inbound() {
  const { country, currencySymbol, taxRate } = useTenant();
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
  const [serviceCoords, setServiceCoords] = useState<{ latitude: number | null; longitude: number | null }>({
    latitude: null,
    longitude: null,
  });
  const [vehicleMakeModel, setVehicleMakeModel] = useState('');
  const [tireSize, setTireSize] = useState('');
  
  // Multi-service work order items
  const [serviceItems, setServiceItems] = useState<SelectedServiceItem[]>([
    {
      serviceId: 'TIRE_REPAIR',
      serviceName: 'Tire Repair (Plug)',
      category: 'TIRE_SERVICE',
      unitPriceCents: 12000,
      quantity: 1,
    },
  ]);
  const [isTaxIncluded, setIsTaxIncluded] = useState(false);

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
      const primaryService = serviceItems[0]?.serviceName || 'Roadside Tire Service';
      const transferNotes = `Breakdown at: ${serviceAddress || 'Address Pending'}. Services: ${serviceItems.map(s => `${s.quantity}x ${s.serviceName}`).join(', ')}. Vehicle: ${vehicleInfo}. Notes: ${notes || 'Immediate dispatch required'}`;
      
      await transferCallToDm({
        callerPhone,
        callerName: callerName || 'Customer',
        notes: transferNotes,
        vehicleInfo,
        transferType: 'INBOUND_MOTORIST',
      });

      setCallLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          phone: callerPhone,
          callerName: callerName || 'Customer',
          time: 'Just now',
          service: primaryService,
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
      toast.error('Customer phone and breakdown address are required');
      return;
    }
    if (serviceItems.length === 0) {
      toast.error('Please add at least one service item to the ticket');
      return;
    }

    setIsBooking(true);
    try {
      const subtotalCents = serviceItems.reduce(
        (sum, item) => sum + item.unitPriceCents * item.quantity,
        0
      );
      const taxCents = isTaxIncluded ? 0 : Math.round(subtotalCents * taxRate);
      const totalCents = isTaxIncluded ? subtotalCents : subtotalCents + taxCents;

      await jobService.createJob({
        customerName: callerName || 'Valued Customer',
        customerPhone: callerPhone,
        recipientName: callerName || 'Valued Customer',
        recipientPhone: callerPhone,
        serviceAddress,
        serviceLatitude: serviceCoords.latitude ?? undefined,
        serviceLongitude: serviceCoords.longitude ?? undefined,
        notes,
        urgency,
        countryCode: country,
        source: leadSource,
        makeUserAccount: isProvisionAccount,
        serviceItems: serviceItems.map((item) => ({
          serviceName: item.serviceName,
          category: item.category,
          unitPriceCents: item.unitPriceCents,
          quantity: item.quantity,
        })),
        subtotalCents,
        taxCents,
        totalCents,
        vehicleMakeModel,
        tireSize,
        vehicle: {
          makeModel: vehicleMakeModel,
          tireSize,
        },
      });

      const primaryService = serviceItems[0]?.serviceName || 'Roadside Service';
      setCallLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          phone: callerPhone,
          callerName: callerName || 'Customer',
          time: 'Just now',
          service: `${serviceItems.length} services (${primaryService})`,
          disposition: 'Booked Direct',
          transferredToDm: false,
        },
        ...prev,
      ]);

      toast.success('Job ticket created & dispatched successfully');
      setCallerPhone('');
      setCallerName('');
      setServiceAddress('');
      setServiceCoords({ latitude: null, longitude: null });
      setVehicleMakeModel('');
      setTireSize('');
      setNotes('');
      setServiceItems([
        {
          serviceId: 'TIRE_REPAIR',
          serviceName: 'Tire Repair (Plug)',
          category: 'TIRE_SERVICE',
          unitPriceCents: 12000,
          quantity: 1,
        },
      ]);
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
        callerName: callerName || 'Customer',
        time: 'Just now',
        service: serviceItems[0]?.serviceName || 'Call Ingestion',
        disposition: disp,
        transferredToDm: false,
      },
      ...prev,
    ]);
    toast.info(`Call logged: ${disp}`);
    endCall();
  };

  const handleSimulateCall = () => {
    const list = REGIONAL_SIMULATION_DATA[country] || REGIONAL_SIMULATION_DATA.CA;
    const blueprint = list[Math.floor(Math.random() * list.length)];
    simulateIncomingCall(blueprint.phone, `${blueprint.callerName} (${country})`);
    setCallerPhone(blueprint.phone);
    setCallerName(blueprint.callerName);
    setServiceAddress(blueprint.serviceAddress);
    setVehicleMakeModel(blueprint.vehicleMakeModel);
    setTireSize(blueprint.tireSize);
    toast.info(`Simulated incoming call for ${country}: ${blueprint.serviceAddress}`);
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
            countryCode={country}
            callerPhone={callerPhone}
            setCallerPhone={setCallerPhone}
            callerName={callerName}
            setCallerName={setCallerName}
            leadSource={leadSource}
            setLeadSource={setLeadSource}
            serviceAddress={serviceAddress}
            setServiceAddress={setServiceAddress}
            onSelectLocation={(loc: GeocodeLocation) => {
              setServiceCoords({ latitude: loc.latitude, longitude: loc.longitude });
            }}
            vehicleMakeModel={vehicleMakeModel}
            setVehicleMakeModel={setVehicleMakeModel}
            tireSize={tireSize}
            setTireSize={setTireSize}
            serviceItems={serviceItems}
            setServiceItems={setServiceItems}
            isTaxIncluded={isTaxIncluded}
            setIsTaxIncluded={setIsTaxIncluded}
            currencySymbol={currencySymbol}
            taxRate={taxRate}
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

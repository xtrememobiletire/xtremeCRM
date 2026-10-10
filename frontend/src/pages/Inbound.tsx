import { useState, useEffect } from 'react';
import PageHeader from '../components/ui/PageHeader';
import InboundIntakeForm from '../components/pages/inbound/InboundIntakeForm';
import { useTenant } from '../context/TenantContext';
import { useSocket } from '../context/SocketContext';
import { jobService } from '../services/jobService';
import { toast } from 'sonner';
import type { SelectedServiceItem } from '../components/common/MultiServiceSelector';
import type { GeocodeLocation } from '../components/common/AddressAutocompleteInput';
import type { ArrivalWindowData } from '../components/common/ArrivalWindowSelector';

export default function Inbound() {
  const { country } = useTenant();
  const { incomingCall } = useSocket();

  // Intake Form State
  const [formCountry, setFormCountry] = useState<'CA' | 'US' | 'UK'>((country as any) || 'CA');
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
  const [arrivalWindow, setArrivalWindow] = useState<ArrivalWindowData>({ mode: 'ETA', estimatedArrivalMinutes: 30 });
  const [notes, setNotes] = useState('');
  const [isProvisionAccount, setIsProvisionAccount] = useState(true);

  useEffect(() => {
    setFormCountry((country as any) || 'CA');
  }, [country]);

  const effectiveCurrency = formCountry === 'US' ? '$' : formCountry === 'UK' ? '£' : '$';
  const effectiveTaxRate = formCountry === 'CA' ? 0.13 : formCountry === 'UK' ? 0.20 : 0.08;

  const [isBooking, setIsBooking] = useState(false);

  // Synchronize incoming caller into form when call pops
  useEffect(() => {
    if (!incomingCall) return;
    const timer = setTimeout(() => {
      setCallerPhone(incomingCall.from || '');
      setCallerName(incomingCall.fromName || '');
    }, 0);
    return () => clearTimeout(timer);
  }, [incomingCall]);

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
      const taxCents = isTaxIncluded ? 0 : Math.round(subtotalCents * effectiveTaxRate);
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
        countryCode: formCountry,
        source: leadSource,
        makeUserAccount: isProvisionAccount,
        arrivalWindowStart: arrivalWindow.arrivalWindowStart,
        arrivalWindowEnd: arrivalWindow.arrivalWindowEnd,
        estimatedArrivalMinutes: arrivalWindow.estimatedArrivalMinutes,
        appointmentDate: arrivalWindow.appointmentDate,
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

      toast.success('Job ticket created & dispatched successfully');
      setCallerPhone('');
      setCallerName('');
      setServiceAddress('');
      setServiceCoords({ latitude: null, longitude: null });
      setVehicleMakeModel('');
      setTireSize('');
      setNotes('');
      setArrivalWindow({ mode: 'ETA', estimatedArrivalMinutes: 30 });
      setUrgency('URGENT');
      setServiceItems([
        {
          serviceId: 'TIRE_REPAIR',
          serviceName: 'Tire Repair (Plug)',
          category: 'TIRE_SERVICE',
          unitPriceCents: 12000,
          quantity: 1,
        },
      ]);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create dispatch ticket');
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inbound Hotline"
        subtitle={`Live call intake & dispatch triage (${country})`}
      />

      <div className="max-w-4xl mx-auto">
        <InboundIntakeForm
          countryCode={formCountry}
          onCountryChange={setFormCountry}
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
          currencySymbol={effectiveCurrency}
          taxRate={effectiveTaxRate}
          urgency={urgency}
          setUrgency={setUrgency}
          arrivalWindow={arrivalWindow}
          setArrivalWindow={setArrivalWindow}
          notes={notes}
          setNotes={setNotes}
          isProvisionAccount={isProvisionAccount}
          setIsProvisionAccount={setIsProvisionAccount}
          isBooking={isBooking}
          onSubmitBooking={handleDirectBookJob}
        />
      </div>
    </div>
  );
}

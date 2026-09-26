import type { RegionCode } from './regions';

export interface SimulationBlueprint {
  phone: string;
  callerName: string;
  serviceAddress: string;
  vehicleMakeModel: string;
  tireSize: string;
  service: string;
}

export const REGIONAL_SIMULATION_DATA: Record<RegionCode, SimulationBlueprint[]> = {
  UK: [
    {
      phone: '+44 7911 123456',
      callerName: 'Liam Davies',
      serviceAddress: 'M25 Junction 14 near Heathrow Airport, London',
      vehicleMakeModel: '2021 Vauxhall Astra',
      tireSize: '205/55R16',
      service: 'Tire Replacement (New)',
    },
    {
      phone: '+44 7822 987654',
      callerName: 'Emma Watson',
      serviceAddress: 'M1 Junction 6A Northbound, Watford, UK',
      vehicleMakeModel: '2022 BMW 3 Series',
      tireSize: '225/45R18',
      service: 'Tire Repair (plug)',
    },
    {
      phone: '+44 7700 900123',
      callerName: 'Oliver Smith',
      serviceAddress: 'A1(M) Northbound near Hatfield, Hertfordshire',
      vehicleMakeModel: '2020 Nissan Qashqai',
      tireSize: '215/60R17',
      service: 'Blowout Roadside Assist',
    },
  ],
  US: [
    {
      phone: '+1 (212) 555-0199',
      callerName: 'Michael Turner',
      serviceAddress: 'I-95 Northbound near Exit 4, Fort Lee, NJ',
      vehicleMakeModel: '2022 Chevrolet Silverado 1500',
      tireSize: '275/60R20',
      service: 'Tire Repair (plug)',
    },
    {
      phone: '+1 (312) 555-0144',
      callerName: 'David Miller',
      serviceAddress: 'I-90 Westbound Mile Marker 42, Chicago, IL',
      vehicleMakeModel: '2021 Ford Explorer',
      tireSize: '255/55R20',
      service: 'Tire Replacement (New)',
    },
    {
      phone: '+1 (703) 555-0182',
      callerName: 'Robert Johnson',
      serviceAddress: 'I-66 Westbound near Exit 53, Centreville, VA',
      vehicleMakeModel: '2023 Ram 1500',
      tireSize: '275/65R18',
      service: 'Blowout Roadside Assist',
    },
  ],
  CA: [
    {
      phone: '+1 (416) 555-0199',
      callerName: 'Alex Tremblay',
      serviceAddress: 'Hwy 401 Eastbound near Hurontario St, Mississauga, ON',
      vehicleMakeModel: '2023 Ford F-150',
      tireSize: '275/65R18',
      service: 'Tire Repair (plug)',
    },
    {
      phone: '+1 (905) 555-0128',
      callerName: 'Marc Gagnon',
      serviceAddress: 'Queen Elizabeth Way near Third Line, Oakville, ON',
      vehicleMakeModel: '2022 Toyota RAV4',
      tireSize: '225/65R17',
      service: 'Tire Replacement (New)',
    },
    {
      phone: '+1 (647) 555-0165',
      callerName: 'Elena Rostova',
      serviceAddress: 'Hwy 427 Southbound near Burnhamthorpe Rd, Toronto, ON',
      vehicleMakeModel: '2021 Honda Civic',
      tireSize: '215/55R16',
      service: 'Blowout Roadside Assist',
    },
  ],
};

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
  CA: [
    {
      phone: '+14165550101',
      callerName: 'Sarah Mitchell',
      serviceAddress: '1 Bloor St W, Toronto, ON M4W 3H8',
      vehicleMakeModel: '2020 Honda Civic',
      tireSize: '205/55R16',
      service: 'Flat Tire Change',
    },
    {
      phone: '+16045550187',
      callerName: 'James Nguyen',
      serviceAddress: '701 W Georgia St, Vancouver, BC V7Y 1C6',
      vehicleMakeModel: '2018 Toyota Corolla',
      tireSize: '195/65R15',
      service: 'Tire Rotation',
    },
    {
      phone: '+15145550234',
      callerName: 'Marie Tremblay',
      serviceAddress: '1000 Rue de la Gauchetière O, Montréal, QC H3B 4W5',
      vehicleMakeModel: '2021 Ford F-150',
      tireSize: '275/65R18',
      service: 'Seasonal Swap',
    },
  ],

  US: [
    {
      phone: '+12025550143',
      callerName: 'Marcus Johnson',
      serviceAddress: '1600 Pennsylvania Ave NW, Washington, DC 20500',
      vehicleMakeModel: '2019 Chevrolet Silverado',
      tireSize: '265/70R17',
      service: 'Flat Tire Change',
    },
    {
      phone: '+13105550298',
      callerName: 'Priya Patel',
      serviceAddress: '6801 Hollywood Blvd, Los Angeles, CA 90028',
      vehicleMakeModel: '2022 Tesla Model 3',
      tireSize: '235/45R18',
      service: 'Tire Rotation',
    },
    {
      phone: '+17135550367',
      callerName: 'Carlos Rivera',
      serviceAddress: '1001 Avenida de las Americas, Houston, TX 77010',
      vehicleMakeModel: '2017 Toyota Tundra',
      tireSize: '275/60R20',
      service: 'Seasonal Swap',
    },
  ],

  UK: [
    {
      phone: '+442075550112',
      callerName: 'Oliver Thompson',
      serviceAddress: 'Trafalgar Square, London, WC2N 5DU',
      vehicleMakeModel: '2021 Vauxhall Astra',
      tireSize: '205/55R16',
      service: 'Flat Tire Change',
    },
    {
      phone: '+441615550278',
      callerName: 'Emily Clarke',
      serviceAddress: 'Piccadilly Gardens, Manchester, M1 1RG',
      vehicleMakeModel: '2020 Ford Fiesta',
      tireSize: '185/60R15',
      service: 'Tire Rotation',
    },
    {
      phone: '+441215550391',
      callerName: 'Liam Patel',
      serviceAddress: 'Victoria Square, Birmingham, B2 4BU',
      vehicleMakeModel: '2019 BMW 3 Series',
      tireSize: '225/45R18',
      service: 'Seasonal Swap',
    },
  ],
};

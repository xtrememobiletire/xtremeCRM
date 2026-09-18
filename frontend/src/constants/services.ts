export interface ServiceCatalogItem {
  id: string;
  name: string;
  category: 'TIRE' | 'ROADSIDE' | 'MAINTENANCE';
  defaultPriceCents: number;
  basePriceCents: number;
}

export const SERVICE_CATALOG: ServiceCatalogItem[] = [
  { id: 'TIRE_REPAIR', name: 'Tire Repair (Plug)', category: 'TIRE', defaultPriceCents: 12000, basePriceCents: 12000 },
  { id: 'VALVE_STEM', name: 'Stem Valve Replacement', category: 'TIRE', defaultPriceCents: 8500, basePriceCents: 8500 },
  { id: 'NEW_TIRE', name: 'New Tire Replacement', category: 'TIRE', defaultPriceCents: 24000, basePriceCents: 24000 },
  { id: 'USED_TIRE', name: 'Used Tire Replacement', category: 'TIRE', defaultPriceCents: 14000, basePriceCents: 14000 },
  { id: 'NEW_RIM', name: 'New RIM Replacement', category: 'TIRE', defaultPriceCents: 22000, basePriceCents: 22000 },
  { id: 'USED_RIM', name: 'Used RIM Replacement', category: 'TIRE', defaultPriceCents: 13000, basePriceCents: 13000 },
  { id: 'TIRE_SWAP_ON_RIM', name: 'Tire Swap (ON RIM)', category: 'TIRE', defaultPriceCents: 11000, basePriceCents: 11000 },
  { id: 'TIRE_SWAP_OFF_RIM', name: 'Tire Swap (OFF RIM)', category: 'TIRE', defaultPriceCents: 16000, basePriceCents: 16000 },
  { id: 'SPARE_TIRE', name: 'Spare Tire Change', category: 'ROADSIDE', defaultPriceCents: 10000, basePriceCents: 10000 },
  { id: 'TIRE_ROTATION', name: 'Tire Rotation', category: 'MAINTENANCE', defaultPriceCents: 8000, basePriceCents: 8000 },
  { id: 'BATTERY_INSTALL', name: 'Battery Installation', category: 'MAINTENANCE', defaultPriceCents: 15000, basePriceCents: 15000 },
  { id: 'BATTERY_REPLACE', name: 'Battery Replacement', category: 'ROADSIDE', defaultPriceCents: 21000, basePriceCents: 21000 },
  { id: 'JUMP_START', name: 'Jump Start', category: 'ROADSIDE', defaultPriceCents: 9500, basePriceCents: 9500 },
  { id: 'BATTERY_BOOSTER', name: 'Battery Booster', category: 'ROADSIDE', defaultPriceCents: 9500, basePriceCents: 9500 },
  { id: 'LOCKSMITH', name: 'Lock Smith Service', category: 'ROADSIDE', defaultPriceCents: 13500, basePriceCents: 13500 },
  { id: 'TOWING', name: 'Towing Service', category: 'ROADSIDE', defaultPriceCents: 18000, basePriceCents: 18000 },
];

export const SERVICES_CATALOG = SERVICE_CATALOG;

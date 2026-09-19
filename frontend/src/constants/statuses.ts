export const JOB_STATUS_CONFIG = {
  PENDING: { label: 'Pending', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  ASSIGNED: { label: 'Assigned', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  EN_ROUTE: { label: 'En Route', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  ON_SCENE: { label: 'On Scene', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-50 text-rose-700 border-rose-200' },
} as const;

export const JOB_STATUSES = [
  'PENDING',
  'ASSIGNED',
  'EN_ROUTE',
  'ON_SCENE',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;

export const JOB_URGENCIES = [
  'CRITICAL',
  'HIGH',
  'NORMAL',
  'LOW',
] as const;

export const URGENCIES = {
  CRITICAL: { label: 'Critical Hazard', color: 'bg-red-600 text-white' },
  HIGH: { label: 'High Priority', color: 'bg-orange-500 text-white' },
  NORMAL: { label: 'Normal Priority', color: 'bg-slate-700 text-white' },
  LOW: { label: 'Scheduled Booking', color: 'bg-sky-600 text-white' },
} as const;

export const DISPOSITIONS = [
  'Booked - Appointment Booked',
  'Relevant (Not converted) - RNC',
  'Business (Wrong Number) - WN',
  'Irrelevant (Another service) - IR',
  'Appointment Cancelled By CX',
];

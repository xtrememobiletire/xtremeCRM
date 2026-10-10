// ponytail: centralized pipeline RBAC and accessibility tier policy

export type DispatcherAccessLevel = 
  | 'FULL_PIPELINE'       // Sees all 8 tabs (Unassigned -> Assigned -> Callbacks -> Dispatcher -> Approval -> Converted -> Disqualified -> All)
  | 'OPERATIONAL_FOCUSED' // Sees Callbacks, Dispatcher Review, GM Approval, Master Ledger
  | 'REVIEW_ONLY';        // Scoped strictly to Dispatcher Review queue

/**
 * Configure active Dispatcher Accessibility Level.
 * Easily switch between 'FULL_PIPELINE' | 'OPERATIONAL_FOCUSED' | 'REVIEW_ONLY'.
 */
export const ACTIVE_DISPATCHER_ACCESS_LEVEL: DispatcherAccessLevel = 'FULL_PIPELINE';

export type LeadPoolTab = 
  | 'unassigned' 
  | 'assigned' 
  | 'callbacks' 
  | 'dispatcher' 
  | 'approval' 
  | 'converted' 
  | 'disqualified' 
  | 'all';

export type PipelineAction =
  | 'BOOK_TRIAL_JOB'
  | 'ADVANCE_TO_GM_SIGNOFF'
  | 'CONVERT_FLEET'
  | 'DISQUALIFY_LEAD'
  | 'REACTIVATE_LEAD'
  | 'EDIT_DISPATCHER_NOTES'
  | 'DISTRIBUTE_BATCH';

/**
 * Ordered sequence of all tabs strictly along the operational lifecycle.
 */
export const LIFECYCLE_TAB_ORDER: LeadPoolTab[] = [
  'unassigned',
  'assigned',
  'callbacks',
  'dispatcher',
  'approval',
  'converted',
  'disqualified',
  'all',
];

export const TAB_LABELS: Record<LeadPoolTab, string> = {
  unassigned: '1. Unassigned Leads',
  assigned: '2. Assigned / In Outreach',
  callbacks: '3. Agent Callbacks',
  dispatcher: '4. Dispatcher Review Queue',
  approval: '5. GM / Admin Approval',
  converted: '6. Converted Fleets',
  disqualified: '7. Disqualified Audit',
  all: '8. Master Ledger (All Leads)',
};

/**
 * Returns allowed tabs for user role based on configured accessibility tier.
 */
export function getAllowedPipelineTabs(role?: string): LeadPoolTab[] {
  if (['ADMIN', 'GENERAL_MANAGER'].includes(role || '')) {
    return LIFECYCLE_TAB_ORDER;
  }

  if (role === 'DISPATCHER') {
    switch (ACTIVE_DISPATCHER_ACCESS_LEVEL) {
      case 'FULL_PIPELINE':
        return LIFECYCLE_TAB_ORDER;
      case 'OPERATIONAL_FOCUSED':
        return ['callbacks', 'dispatcher', 'approval', 'all'];
      case 'REVIEW_ONLY':
        return ['dispatcher'];
      default:
        return ['dispatcher', 'all'];
    }
  }

  if (role === 'CALL_AGENT') {
    return ['callbacks', 'unassigned'];
  }

  if (role === 'VIRTUAL_ASSISTANT') {
    return ['unassigned'];
  }

  return ['all'];
}

/**
 * Checks if user role has authority to execute a specific pipeline action.
 */
export function canPerformPipelineAction(role: string | undefined, action: PipelineAction): boolean {
  if (!role) return false;
  const isAdminOrGm = ['ADMIN', 'GENERAL_MANAGER'].includes(role);
  if (isAdminOrGm) return true;

  if (role === 'DISPATCHER') {
    switch (action) {
      case 'BOOK_TRIAL_JOB':
      case 'ADVANCE_TO_GM_SIGNOFF':
      case 'DISQUALIFY_LEAD':
      case 'EDIT_DISPATCHER_NOTES':
        return true;
      case 'CONVERT_FLEET':
      case 'DISTRIBUTE_BATCH':
      case 'REACTIVATE_LEAD':
        return false;
      default:
        return false;
    }
  }

  return false;
}

import type { StatusType } from './StatusBadge';

export function getJobStatusBadgeType(status: number): StatusType {
  switch (status) {
    case 0:
      return 'open';
    case 1:
      return 'funded';
    case 2:
      return 'submitted';
    case 3:
      return 'completed';
    case 4:
      return 'rejected';
    case 5:
      return 'expired';
    default:
      return 'info';
  }
}

export function getProposalStatusBadgeType(status: number): StatusType {
  switch (status) {
    case 0:
      return 'open';
    case 1:
      return 'under-review';
    case 2:
      return 'decided';
    case 3:
      return 'cancelled';
    default:
      return 'info';
  }
}

export function getServiceStatusBadgeType(isActive: boolean): StatusType {
  return isActive ? 'active' : 'inactive';
}

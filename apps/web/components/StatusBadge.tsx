'use client';

import React from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  DollarSign,
  Briefcase,
  Scale,
  Shield,
  AlertTriangle,
} from 'lucide-react';

export type StatusType =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'completed'
  | 'rejected'
  | 'expired'
  | 'open'
  | 'funded'
  | 'submitted'
  | 'decided'
  | 'cancelled'
  | 'under-review'
  | 'warning'
  | 'success'
  | 'error'
  | 'info'
  | 'usdc'
  | 'eth';

interface StatusBadgeProps {
  status: StatusType;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const statusConfig: Record<
  StatusType,
  {
    label: string;
    color: string;
    bgColor: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  active: {
    label: 'Active',
    color: 'text-success',
    bgColor: 'bg-success/10',
    icon: CheckCircle2,
  },
  inactive: {
    label: 'Inactive',
    color: 'text-default-500',
    bgColor: 'bg-default/10',
    icon: XCircle,
  },
  pending: {
    label: 'Pending',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    icon: Clock,
  },
  completed: {
    label: 'Completed',
    color: 'text-success',
    bgColor: 'bg-success/10',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Rejected',
    color: 'text-danger',
    bgColor: 'bg-danger/10',
    icon: XCircle,
  },
  expired: {
    label: 'Expired',
    color: 'text-danger',
    bgColor: 'bg-danger/10',
    icon: AlertCircle,
  },
  open: {
    label: 'Open',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    icon: Briefcase,
  },
  funded: {
    label: 'Funded',
    color: 'text-success',
    bgColor: 'bg-success/10',
    icon: DollarSign,
  },
  submitted: {
    label: 'Submitted',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    icon: Loader2,
  },
  decided: {
    label: 'Decided',
    color: 'text-success',
    bgColor: 'bg-success/10',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-default-500',
    bgColor: 'bg-default/10',
    icon: XCircle,
  },
  'under-review': {
    label: 'Under Review',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    icon: Scale,
  },
  warning: {
    label: 'Warning',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    icon: AlertTriangle,
  },
  success: {
    label: 'Success',
    color: 'text-success',
    bgColor: 'bg-success/10',
    icon: CheckCircle2,
  },
  error: {
    label: 'Error',
    color: 'text-danger',
    bgColor: 'bg-danger/10',
    icon: AlertCircle,
  },
  info: {
    label: 'Info',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    icon: Shield,
  },
  usdc: {
    label: 'USDC',
    color: 'text-success',
    bgColor: 'bg-success/10',
    icon: DollarSign,
  },
  eth: {
    label: 'ETH',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    icon: DollarSign,
  },
};

const sizeConfig = {
  sm: {
    padding: 'px-2 py-0.5',
    text: 'text-xs',
    icon: 'w-3 h-3',
  },
  md: {
    padding: 'px-2.5 py-1',
    text: 'text-sm',
    icon: 'w-4 h-4',
  },
  lg: {
    padding: 'px-3 py-1.5',
    text: 'text-base',
    icon: 'w-5 h-5',
  },
};

export function StatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className = '',
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const sizeClasses = sizeConfig[size];
  const Icon = config.icon;

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 
        rounded-full font-medium
        ${config.bgColor} 
        ${config.color} 
        ${sizeClasses.padding} 
        ${sizeClasses.text}
        ${className}
      `}
      title={config.label}
    >
      {showIcon && (
        <Icon className={`${sizeClasses.icon} ${status === 'submitted' ? 'animate-spin' : ''}`} />
      )}
      <span>{config.label}</span>
    </span>
  );
}

// Helper function to convert job/proposal/service status numbers to StatusType
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

export default StatusBadge;

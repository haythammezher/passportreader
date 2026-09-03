import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


export type PassportStatus = 'valid' | 'expiring' | 'expired' | 'unknown';

interface StatusBadgeProps {
  status: PassportStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<PassportStatus, {
  label: string;
  className: string;
  Icon: React.ElementType;
}> = {
  valid: {
    label: 'Valid',
    className: 'status-badge-valid',
    Icon: CheckCircle,
  },
  expiring: {
    label: 'Expiring Soon',
    className: 'status-badge-expiring',
    Icon: AlertTriangle,
  },
  expired: {
    label: 'Expired',
    className: 'status-badge-expired',
    Icon: XCircle,
  },
  unknown: {
    label: 'Unknown',
    className: 'bg-muted text-muted-foreground border border-border',
    Icon: Clock,
  },
};

const sizeMap = {
  sm: 'text-xs px-2 py-0.5 gap-1',
  md: 'text-xs px-2.5 py-1 gap-1.5',
  lg: 'text-sm px-3 py-1.5 gap-2',
};

const iconSizeMap = { sm: 10, md: 12, lg: 14 };

export default function StatusBadge({ status, showIcon = true, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.Icon;
  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full ${config.className} ${sizeMap[size]}`}
    >
      {showIcon && <Icon size={iconSizeMap[size]} />}
      {config.label}
    </span>
  );
}
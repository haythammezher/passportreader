'use client';
import React from 'react';
import type { PassportStatus } from '@/components/ui/StatusBadge';

interface ValidityRingProps {
  percent: number;
  status: PassportStatus;
  daysRemaining: number;
}

export default function ValidityRing({ percent, status, daysRemaining }: ValidityRingProps) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  const strokeColor =
    status === 'expired' ? 'var(--expired)' :
    status === 'expiring' ? 'var(--expiring)' :
    'var(--valid)';

  return (
    <div className="relative w-36 h-36">
      <svg width="144" height="144" viewBox="0 0 144 144" className="-rotate-90">
        {/* Background track */}
        <circle
          cx="72"
          cy="72"
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth="10"
        />
        {/* Progress arc */}
        <circle
          cx="72"
          cy="72"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 600ms ease' }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-2xl font-bold tabular-nums"
          style={{ color: strokeColor }}
        >
          {percent}%
        </span>
        <span className="text-xs text-muted-foreground">remaining</span>
      </div>
    </div>
  );
}
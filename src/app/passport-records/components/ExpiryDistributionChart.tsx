'use client';
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,  } from 'recharts';
import type { EnrichedPassport } from '@/lib/passportData';

interface ExpiryDistributionChartProps {
  records: EnrichedPassport[];
}

interface TooltipPayload {
  value: number;
  name: string;
  payload: { label: string; count: number; color: string };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-xl shadow-elevated px-4 py-3">
      <p className="text-xs font-semibold text-foreground mb-1">{d.label}</p>
      <p className="text-lg font-bold tabular-nums text-foreground">{d.count} passport{d.count !== 1 ? 's' : ''}</p>
    </div>
  );
}

export default function ExpiryDistributionChart({ records }: ExpiryDistributionChartProps) {
  const buckets = [
    { label: 'Expired', min: -Infinity, max: 0, color: 'var(--expired)' },
    { label: '< 3 months', min: 0, max: 90, color: '#F97316' },
    { label: '3–6 months', min: 90, max: 180, color: 'var(--expiring)' },
    { label: '6–12 months', min: 180, max: 365, color: '#60A5FA' },
    { label: '1–2 years', min: 365, max: 730, color: '#34D399' },
    { label: '2–5 years', min: 730, max: 1825, color: 'var(--valid)' },
    { label: '5+ years', min: 1825, max: Infinity, color: '#1B2A4A' },
  ];

  const data = buckets.map(b => ({
    label: b.label,
    count: records.filter(r => r.daysRemaining >= b.min && r.daysRemaining < b.max).length,
    color: b.color,
  }));

  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Expiry Distribution</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Passport records grouped by days remaining until expiry
          </p>
        </div>
        <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-md font-mono-data">
          {records.length} total
        </span>
      </div>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.3 }} />
            <Bar dataKey="count" radius={[5, 5, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`bar-cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
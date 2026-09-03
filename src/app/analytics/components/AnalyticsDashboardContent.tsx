'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import {
  TrendingUp, Users, ShieldCheck, AlertTriangle, XCircle,
  Globe, RefreshCw, Loader2, Calendar, BarChart2, CheckCircle2,
} from 'lucide-react';
import { passportService } from '@/lib/services/passportService';
import { type EnrichedPassport } from '@/lib/passportData';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  valid: '#22c55e',
  expiring: '#f59e0b',
  expired: '#ef4444',
};

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#f43f5e', '#a855f7', '#14b8a6'];

function getMonthLabel(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  sub?: string;
}

function StatCard({ label, value, icon, color, bg, sub }: StatCardProps) {
  return (
    <div className="card-surface p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl ${bg} ${color} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-modal px-3 py-2.5 text-xs">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnalyticsDashboardContent() {
  const [records, setRecords] = useState<EnrichedPassport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    const data = await passportService.getAll();
    setRecords(data);
    setIsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Derived analytics ──────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = records.length;
    const valid = records.filter(r => r.status === 'valid').length;
    const expiring = records.filter(r => r.status === 'expiring').length;
    const expired = records.filter(r => r.status === 'expired').length;
    const mrzValid = records.filter(r => r.mrzValid).length;
    const mrzRate = total > 0 ? Math.round((mrzValid / total) * 100) : 0;
    return { total, valid, expiring, expired, mrzValid, mrzRate };
  }, [records]);

  const statusPieData = useMemo(() => [
    { name: 'Valid', value: stats.valid, color: STATUS_COLORS.valid },
    { name: 'Expiring', value: stats.expiring, color: STATUS_COLORS.expiring },
    { name: 'Expired', value: stats.expired, color: STATUS_COLORS.expired },
  ].filter(d => d.value > 0), [stats]);

  const nationalityData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of records) counts[r.nationality] = (counts[r.nationality] ?? 0) + 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  }, [records]);

  const issuingCountryData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of records) counts[r.issuingCountry] = (counts[r.issuingCountry] ?? 0) + 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }));
  }, [records]);

  const expiryTimelineData = useMemo(() => {
    const buckets: Record<string, { month: string; valid: number; expiring: number; expired: number }> = {};
    for (const r of records) {
      const month = getMonthLabel(r.expiryDate);
      if (!buckets[month]) buckets[month] = { month, valid: 0, expiring: 0, expired: 0 };
      buckets[month][r.status as 'valid' | 'expiring' | 'expired']++;
    }
    return Object.values(buckets).slice(0, 12);
  }, [records]);

  const daysRemainingBuckets = useMemo(() => {
    const b = { expired: 0, within30: 0, within90: 0, within180: 0, within365: 0, over365: 0 };
    for (const r of records) {
      if (r.daysRemaining < 0) b.expired++;
      else if (r.daysRemaining <= 30) b.within30++;
      else if (r.daysRemaining <= 90) b.within90++;
      else if (r.daysRemaining <= 180) b.within180++;
      else if (r.daysRemaining <= 365) b.within365++;
      else b.over365++;
    }
    return [
      { label: 'Expired', count: b.expired, color: '#ef4444' },
      { label: '≤ 30 days', count: b.within30, color: '#f97316' },
      { label: '31–90 days', count: b.within90, color: '#f59e0b' },
      { label: '91–180 days', count: b.within180, color: '#eab308' },
      { label: '181–365 days', count: b.within365, color: '#84cc16' },
      { label: '> 1 year', count: b.over365, color: '#22c55e' },
    ];
  }, [records]);

  const sexData = useMemo(() => {
    const m = records.filter(r => r.sex === 'M').length;
    const f = records.filter(r => r.sex === 'F').length;
    return [
      { name: 'Male', value: m, color: '#3b82f6' },
      { name: 'Female', value: f, color: '#ec4899' },
    ].filter(d => d.value > 0);
  }, [records]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={36} className="animate-spin text-primary/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 lg:px-8 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Portfolio Analytics</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Insights across {stats.total} passport record{stats.total !== 1 ? 's' : ''}
            </p>
          </div>
          <button type="button" onClick={load} disabled={isLoading} className="btn-secondary">
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-6 space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Passports"
            value={stats.total}
            icon={<Users size={18} />}
            color="text-foreground"
            bg="bg-secondary"
            sub="All records"
          />
          <StatCard
            label="Valid"
            value={stats.valid}
            icon={<ShieldCheck size={18} />}
            color="text-valid"
            bg="bg-valid/10"
            sub={stats.total > 0 ? `${Math.round((stats.valid / stats.total) * 100)}% of total` : '—'}
          />
          <StatCard
            label="Expiring Soon"
            value={stats.expiring}
            icon={<AlertTriangle size={18} />}
            color="text-warning"
            bg="bg-warning/10"
            sub="Within 90 days"
          />
          <StatCard
            label="Expired"
            value={stats.expired}
            icon={<XCircle size={18} />}
            color="text-expired"
            bg="bg-expired/10"
            sub="Requires renewal"
          />
        </div>

        {/* Row 2: Status Pie + MRZ + Sex */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Status Distribution */}
          <div className="card-surface p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart2 size={15} className="text-primary" />
              Status Distribution
            </h2>
            {statusPieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 justify-center mt-2">
                  {statusPieData.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                      <span className="text-xs text-muted-foreground">{d.name} ({d.value})</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[180px] flex items-center justify-center">
                <p className="text-xs text-muted-foreground">No data available</p>
              </div>
            )}
          </div>

          {/* MRZ Validity */}
          <div className="card-surface p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <CheckCircle2 size={15} className="text-primary" />
              MRZ Validity Rate
            </h2>
            <div className="flex flex-col items-center justify-center h-[180px]">
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="10" className="text-border" />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke={stats.mrzRate >= 80 ? '#22c55e' : stats.mrzRate >= 50 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="10"
                    strokeDasharray={`${stats.mrzRate * 2.51} 251`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-foreground">{stats.mrzRate}%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {stats.mrzValid} of {stats.total} records have valid MRZ
              </p>
            </div>
          </div>

          {/* Sex Distribution */}
          <div className="card-surface p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Users size={15} className="text-primary" />
              Sex Distribution
            </h2>
            {sexData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={sexData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {sexData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-4 justify-center mt-2">
                  {sexData.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                      <span className="text-xs text-muted-foreground">{d.name} ({d.value})</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[180px] flex items-center justify-center">
                <p className="text-xs text-muted-foreground">No data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Nationality Bar Chart */}
        <div className="card-surface p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Globe size={15} className="text-primary" />
            Top Nationalities
          </h2>
          {nationalityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={nationalityData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Records" radius={[4, 4, 0, 0]}>
                  {nationalityData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center">
              <p className="text-xs text-muted-foreground">No data available</p>
            </div>
          )}
        </div>

        {/* Row 4: Days Remaining Buckets + Issuing Country */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Days Remaining Breakdown */}
          <div className="card-surface p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calendar size={15} className="text-primary" />
              Validity Breakdown
            </h2>
            <div className="space-y-2.5">
              {daysRemainingBuckets.map(b => (
                <div key={b.label} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-muted-foreground flex-shrink-0">{b.label}</div>
                  <div className="flex-1 h-5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: stats.total > 0 ? `${(b.count / stats.total) * 100}%` : '0%',
                        background: b.color,
                      }}
                    />
                  </div>
                  <div className="w-8 text-xs font-semibold text-foreground text-right">{b.count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Issuing Country */}
          <div className="card-surface p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp size={15} className="text-primary" />
              Top Issuing Countries
            </h2>
            {issuingCountryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={issuingCountryData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} width={40} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Records" radius={[0, 4, 4, 0]}>
                    {issuingCountryData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center">
                <p className="text-xs text-muted-foreground">No data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Row 5: Expiry Timeline */}
        {expiryTimelineData.length > 0 && (
          <div className="card-surface p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calendar size={15} className="text-primary" />
              Expiry Timeline
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={expiryTimelineData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="valid" name="Valid" stroke={STATUS_COLORS.valid} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expiring" name="Expiring" stroke={STATUS_COLORS.expiring} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expired" name="Expired" stroke={STATUS_COLORS.expired} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

      </div>
    </div>
  );
}

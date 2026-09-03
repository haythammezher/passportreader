'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ScanLine, Database, AlertTriangle, CheckCircle2, Clock, TrendingUp,
  Upload, BarChart2, ChevronRight, Loader2, RefreshCw, FileText,
  ShieldAlert, Globe, Calendar,
} from 'lucide-react';
import { passportService } from '@/lib/services/passportService';
import { type EnrichedPassport } from '@/lib/passportData';
import { getPassportStatus, calculateDaysRemaining } from '@/lib/hijri';
import { useAuth } from '@/contexts/AuthContext';
import Icon from '@/components/ui/AppIcon';


// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  accent: string;
  bg: string;
  sub?: string;
  href?: string;
}

function StatCard({ label, value, icon: Icon, accent, bg, sub, href }: StatCardProps) {
  const inner = (
    <div className="card-surface p-5 flex items-start justify-between group cursor-pointer hover:border-accent/30 transition-all duration-200">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
        <p className={`text-3xl font-bold tabular-nums ${accent}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
      <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center flex-shrink-0 ml-3`}>
        <Icon size={20} className={accent} />
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : <div>{inner}</div>;
}

// ─── Quick Action ─────────────────────────────────────────────────────────────

interface QuickActionProps {
  label: string;
  description: string;
  icon: React.ElementType;
  href: string;
  accent: string;
}

function QuickAction({ label, description, icon: Icon, href, accent }: QuickActionProps) {
  return (
    <Link
      href={href}
      className="card-surface p-4 flex items-center gap-4 hover:border-accent/30 transition-all duration-200 group"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(56,189,248,0.08)' }}
      >
        <Icon size={18} className={accent} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
      <ChevronRight size={15} className="text-muted-foreground group-hover:text-accent transition-colors flex-shrink-0" />
    </Link>
  );
}

// ─── Expiry Row ───────────────────────────────────────────────────────────────

function ExpiryRow({ passport }: { passport: EnrichedPassport }) {
  const expiryDate = new Date(passport.expiryDate);
  const daysRemaining = calculateDaysRemaining(expiryDate);
  const status = getPassportStatus(daysRemaining);

  const statusColor =
    status === 'expired' ? 'text-expired' :
    status === 'expiring'? 'text-expiring' : 'text-valid';

  const badgeBg =
    status === 'expired' ? 'bg-expired/10 text-expired border-expired/20' :
    status === 'expiring'? 'bg-expiring/10 text-expiring border-expiring/20' : 'bg-valid/10 text-valid border-valid/20';

  return (
    <Link
      href={`/passport-details?id=${passport.id}`}
      className="flex items-center gap-3 py-2.5 border-b border-border last:border-0 hover:bg-white/[0.02] transition-colors rounded px-1 -mx-1"
    >
      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 text-sm">
        {passport.flagEmoji || '🌐'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{passport.holderName}</p>
        <p className="text-xs text-muted-foreground font-mono-data">{passport.passportNumber}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${badgeBg}`}>
          {daysRemaining < 0 ? `${Math.abs(daysRemaining)}d ago` : `${daysRemaining}d`}
        </span>
      </div>
    </Link>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardHomeContent() {
  const { user } = useAuth();
  const [records, setRecords] = useState<EnrichedPassport[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  const load = useCallback(async () => {
    setLoading(true);
    const data = await passportService.getAll();
    setRecords(data);
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Derived stats
  const total = records.length;
  const valid = records.filter(r => getPassportStatus(calculateDaysRemaining(new Date(r.expiryDate))) === 'valid').length;
  const expiring = records.filter(r => getPassportStatus(calculateDaysRemaining(new Date(r.expiryDate))) === 'expiring').length;
  const expired = records.filter(r => getPassportStatus(calculateDaysRemaining(new Date(r.expiryDate))) === 'expired').length;

  const soonExpiring = [...records]
    .filter(r => {
      const d = calculateDaysRemaining(new Date(r.expiryDate));
      return d >= 0 && d <= 365;
    })
    .sort((a, b) => calculateDaysRemaining(new Date(a.expiryDate)) - calculateDaysRemaining(new Date(b.expiryDate)))
    .slice(0, 5);

  const recentRecords = [...records]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const nationalities = [...new Set(records.map(r => r.nationality))].length;

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="bg-card border-b border-border px-6 lg:px-8 py-5">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back, {displayName} ✈
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Passport management overview — {total} record{total !== 1 ? 's' : ''} in system
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-accent" />
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Records"
                value={total}
                icon={Database}
                accent="text-accent"
                bg="bg-accent/10"
                sub="All passport records"
                href="/passport-records"
              />
              <StatCard
                label="Valid"
                value={valid}
                icon={CheckCircle2}
                accent="text-valid"
                bg="bg-valid/10"
                sub="Active passports"
                href="/passport-records"
              />
              <StatCard
                label="Expiring Soon"
                value={expiring}
                icon={Clock}
                accent="text-expiring"
                bg="bg-expiring/10"
                sub="Within 6 months"
                href="/passport-records"
              />
              <StatCard
                label="Expired"
                value={expired}
                icon={ShieldAlert}
                accent="text-expired"
                bg="bg-expired/10"
                sub="Require renewal"
                href="/passport-records"
              />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="card-surface p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <Globe size={16} className="text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nationalities</p>
                  <p className="text-xl font-bold text-foreground">{nationalities}</p>
                </div>
              </div>
              <div className="card-surface p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp size={16} className="text-sky-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Validity Rate</p>
                  <p className="text-xl font-bold text-foreground">
                    {total > 0 ? Math.round((valid / total) * 100) : 0}%
                  </p>
                </div>
              </div>
              <div className="card-surface p-4 flex items-center gap-3 col-span-2 lg:col-span-1">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <Calendar size={16} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Updated</p>
                  <p className="text-sm font-semibold text-foreground">
                    {lastRefresh ? lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              {/* Expiring Soon */}
              <div className="xl:col-span-2 card-surface p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <AlertTriangle size={14} className="text-expiring" />
                    Expiring Within 12 Months
                  </h2>
                  <Link href="/passport-records" className="text-xs text-accent hover:underline flex items-center gap-1">
                    View all <ChevronRight size={12} />
                  </Link>
                </div>
                {soonExpiring.length === 0 ? (
                  <div className="py-8 text-center">
                    <CheckCircle2 size={28} className="text-valid mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No passports expiring in the next 12 months</p>
                  </div>
                ) : (
                  <div>
                    {soonExpiring.map(p => (
                      <ExpiryRow key={p.id} passport={p} />
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground px-1">Quick Actions</h2>
                <QuickAction
                  label="Scan Passport"
                  description="OCR scan a new passport document"
                  icon={ScanLine}
                  href="/"
                  accent="text-accent"
                />
                <QuickAction
                  label="All Records"
                  description="Browse and manage passport records"
                  icon={Database}
                  href="/passport-records"
                  accent="text-accent"
                />
                <QuickAction
                  label="Bulk Import"
                  description="Upload CSV or Excel file"
                  icon={Upload}
                  href="/bulk-import"
                  accent="text-purple-400"
                />
                <QuickAction
                  label="Analytics"
                  description="Charts and expiry distribution"
                  icon={BarChart2}
                  href="/analytics"
                  accent="text-sky-400"
                />
              </div>
            </div>

            {/* Recent Records */}
            <div className="card-surface p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText size={14} className="text-accent" />
                  Recently Added
                </h2>
                <Link href="/passport-records" className="text-xs text-accent hover:underline flex items-center gap-1">
                  View all <ChevronRight size={12} />
                </Link>
              </div>
              {recentRecords.length === 0 ? (
                <div className="py-8 text-center">
                  <Database size={28} className="text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No records yet. Start by scanning a passport.</p>
                  <Link href="/" className="btn-primary mt-3 inline-flex items-center gap-2 text-sm">
                    <ScanLine size={14} />
                    Scan Passport
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {recentRecords.map(p => {
                    const days = calculateDaysRemaining(new Date(p.expiryDate));
                    const status = getPassportStatus(days);
                    const statusColor = status === 'expired' ? 'text-expired' : status === 'expiring' ? 'text-expiring' : 'text-valid';
                    const statusDot = status === 'expired' ? 'bg-expired' : status === 'expiring' ? 'bg-expiring' : 'bg-valid';
                    return (
                      <Link
                        key={p.id}
                        href={`/passport-details?id=${p.id}`}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-accent/30 transition-all bg-secondary/30"
                      >
                        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-base flex-shrink-0">
                          {p.flagEmoji || '🌐'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{p.holderName}</p>
                          <p className="text-xs text-muted-foreground font-mono-data">{p.passportNumber}</p>
                        </div>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot}`} />
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

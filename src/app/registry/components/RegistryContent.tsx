'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  Loader2,
  FileSpreadsheet,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { type EnrichedPassport } from '@/lib/passportData';
import { passportService } from '@/lib/services/passportService';
import { auditService } from '@/lib/services/auditService';
import StatusBadge from '@/components/ui/StatusBadge';
import Link from 'next/link';

type StatusFilter = 'all' | 'valid' | 'expiring' | 'expired';
const PAGE_SIZE = 25;

function datestamp() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function exportToExcel(records: EnrichedPassport[]) {
  const XLSX = await import('xlsx');
  const rows = records.map((p) => ({
    'Holder Name': p.holderName,
    'Holder Name (Arabic)': p.holderNameAr ?? '',
    Nationality: p.nationality,
    'Nationality Code': p.nationalityCode,
    'Passport Number': p.passportNumber,
    'Document Type': p.documentType,
    Sex: p.sex === 'M' ? 'Male' : 'Female',
    'Date of Birth': p.dateOfBirth,
    'Place of Birth': p.placeOfBirth,
    'Issue Date': p.issueDate,
    'Expiry Date': p.expiryDate,
    'Days Remaining': p.daysRemaining,
    'Hijri Expiry': p.expiryHijri,
    'Issuing Authority': p.issuingAuthority,
    'Issuing Country': p.issuingCountry,
    'MRZ Valid': p.mrzValid ? 'Yes' : 'No',
    Status: p.status.charAt(0).toUpperCase() + p.status.slice(1),
    Notes: p.notes ?? '',
    'Created At': p.createdAt,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 24 }, { wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 16 },
    { wch: 14 }, { wch: 8 }, { wch: 14 }, { wch: 16 }, { wch: 12 },
    { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 24 }, { wch: 14 },
    { wch: 10 }, { wch: 12 }, { wch: 30 }, { wch: 22 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Passport Registry');

  // Summary sheet
  const summary = [
    ['Passport Registry Export'],
    ['Generated At', new Date().toISOString()],
    ['Total Records', records.length],
    ['Valid', records.filter((r) => r.status === 'valid').length],
    ['Expiring Soon', records.filter((r) => r.status === 'expiring').length],
    ['Expired', records.filter((r) => r.status === 'expired').length],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summary);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  XLSX.writeFile(wb, `passport-registry-${datestamp()}.xlsx`);
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function RegistryContent() {
  const [records, setRecords] = useState<EnrichedPassport[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [nationalityFilter, setNationalityFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadRecords();
  }, []);

  async function loadRecords() {
    setLoading(true);
    const data = await passportService.getAll();
    setRecords(data);
    setLoading(false);
  }

  const nationalities = useMemo(() => {
    const set = new Set(records.map((r) => r.nationality));
    return Array.from(set).sort();
  }, [records]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        r.holderName.toLowerCase().includes(q) ||
        r.passportNumber.toLowerCase().includes(q) ||
        r.nationality.toLowerCase().includes(q) ||
        r.nationalityCode.toLowerCase().includes(q) ||
        r.issuingCountry.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchNat = !nationalityFilter || r.nationality === nationalityFilter;
      return matchSearch && matchStatus && matchNat;
    });
  }, [records, search, statusFilter, nationalityFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => ({
    total: records.length,
    valid: records.filter((r) => r.status === 'valid').length,
    expiring: records.filter((r) => r.status === 'expiring').length,
    expired: records.filter((r) => r.status === 'expired').length,
  }), [records]);

  const hasFilters = search || statusFilter !== 'all' || nationalityFilter;

  function clearFilters() {
    setSearch('');
    setStatusFilter('all');
    setNationalityFilter('');
    setPage(1);
  }

  async function handleExcelExport() {
    if (filtered.length === 0) {
      toast.error('No records to export');
      return;
    }
    setExporting(true);
    try {
      await exportToExcel(filtered);
      await auditService.log('export', `Exported ${filtered.length} records as Excel (.xlsx)`);
      toast.success(`Exported ${filtered.length} records to Excel`);
    } catch (err) {
      console.error(err);
      toast.error('Excel export failed');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen size={22} className="text-accent" />
            Passport Registry
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete registry of all passport records with Excel export
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadRecords}
            disabled={loading}
            className="btn-secondary"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleExcelExport}
            disabled={exporting || filtered.length === 0}
            className="btn-primary flex items-center gap-2"
          >
            {exporting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <FileSpreadsheet size={14} />
            )}
            {exporting ? 'Exporting…' : `Export to Excel (${filtered.length})`}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Records"
          value={stats.total}
          icon={<Users size={18} className="text-blue-400" />}
          color="bg-blue-500/10"
        />
        <StatCard
          label="Valid"
          value={stats.valid}
          icon={<CheckCircle2 size={18} className="text-emerald-400" />}
          color="bg-emerald-500/10"
        />
        <StatCard
          label="Expiring Soon"
          value={stats.expiring}
          icon={<Clock size={18} className="text-amber-400" />}
          color="bg-amber-500/10"
        />
        <StatCard
          label="Expired"
          value={stats.expired}
          icon={<AlertTriangle size={18} className="text-red-400" />}
          color="bg-red-500/10"
        />
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search name, passport no., nationality…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/50"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}
            className="text-sm bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-accent/50"
          >
            <option value="all">All Statuses</option>
            <option value="valid">Valid</option>
            <option value="expiring">Expiring Soon</option>
            <option value="expired">Expired</option>
          </select>

          {/* Nationality filter */}
          <select
            value={nationalityFilter}
            onChange={(e) => { setNationalityFilter(e.target.value); setPage(1); }}
            className="text-sm bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-accent/50"
          >
            <option value="">All Nationalities</option>
            {nationalities.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={14} />
              Clear
            </button>
          )}

          <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter size={12} />
            {filtered.length} of {records.length} records
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-accent" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <BookOpen size={40} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">No records found</p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-2 text-xs text-accent hover:underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Holder</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Passport No.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nationality</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sex</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date of Birth</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expiry Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Days Left</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">MRZ</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground tabular-nums text-xs">
                      {(page - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">{p.holderName}</p>
                        {p.holderNameAr && (
                          <p className="text-xs text-muted-foreground mt-0.5 font-arabic" dir="rtl">{p.holderNameAr}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground">{p.passportNumber}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-sm">
                        <span>{p.flagEmoji}</span>
                        <span className="text-foreground">{p.nationalityCode}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{p.sex === 'M' ? 'Male' : 'Female'}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs tabular-nums">{p.dateOfBirth}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs tabular-nums">{p.expiryDate}</td>
                    <td className="px-4 py-3 tabular-nums text-xs">
                      <span className={
                        p.daysRemaining < 0
                          ? 'text-red-400'
                          : p.daysRemaining <= 90
                          ? 'text-amber-400' :'text-emerald-400'
                      }>
                        {p.daysRemaining < 0 ? `−${Math.abs(p.daysRemaining)}` : p.daysRemaining}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        p.mrzValid
                          ? 'bg-emerald-500/10 text-emerald-400' :'bg-red-500/10 text-red-400'
                      }`}>
                        {p.mrzValid ? 'Valid' : 'Invalid'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/passport-details?id=${p.id}`}
                        className="text-xs text-accent hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-secondary disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs text-muted-foreground px-2">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-secondary disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Filter, X, RefreshCw, Loader2, Wifi, WifiOff, ChevronDown, ChevronUp, AlertTriangle, Eye, Trash2, Edit2, ChevronLeft, ChevronRight, Download, FileText, FileJson, Table2, Archive } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { type EnrichedPassport } from '@/lib/passportData';
import { passportService } from '@/lib/services/passportService';
import { auditService } from '@/lib/services/auditService';
import StatusBadge from '@/components/ui/StatusBadge';
import RecordsSummaryCards from './RecordsSummaryCards';
import ExpiryDistributionChart from './ExpiryDistributionChart';
import { useAuth } from '@/contexts/AuthContext';

type SortKey = keyof EnrichedPassport;
type SortDir = 'asc' | 'desc';
type ExportFormat = 'csv' | 'pdf' | 'json';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

// ─── Export helpers ──────────────────────────────────────────────────────────

function exportAsCSV(records: EnrichedPassport[]) {
  const headers = ['Holder Name','Nationality','Nationality Code','Passport Number','Document Type','Sex','Date of Birth','Place of Birth','Issue Date','Expiry Date','Days Remaining','Hijri Expiry','Issuing Authority','Issuing Country','MRZ Valid','Status','Notes'];
  const escape = (v: string | number | boolean | undefined) => { const s = String(v ?? ''); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s; };
  const rows = records.map(p => [p.holderName,p.nationality,p.nationalityCode,p.passportNumber,p.documentType,p.sex,p.dateOfBirth,p.placeOfBirth,p.issueDate,p.expiryDate,p.daysRemaining,p.expiryHijri,p.issuingAuthority,p.issuingCountry,p.mrzValid,p.status,p.notes??''].map(escape).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `passport-records-${datestamp()}.csv`);
}

function exportAsJSON(records: EnrichedPassport[]) {
  let data = records.map(p => ({ id: p.id, holderName: p.holderName, nationality: p.nationality, nationalityCode: p.nationalityCode, passportNumber: p.passportNumber, sex: p.sex, dateOfBirth: p.dateOfBirth, issueDate: p.issueDate, expiryDate: p.expiryDate, daysRemaining: p.daysRemaining, status: p.status, mrzValid: p.mrzValid }));
  triggerDownload(new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), count: data.length, records: data }, null, 2)], { type: 'application/json' }), `passport-records-${datestamp()}.json`);
}

function exportAsPDF(records: EnrichedPassport[]) {
  const rows = records.map(p => `<tr><td>${p.holderName}</td><td>${p.nationalityCode}</td><td>${p.passportNumber}</td><td>${p.dateOfBirth}</td><td>${p.expiryDate}</td><td>${p.daysRemaining < 0 ? `−${Math.abs(p.daysRemaining)}` : p.daysRemaining}</td><td>${p.status.toUpperCase()}</td></tr>`).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Passport Records</title><style>body{font-family:Arial,sans-serif;font-size:11px;padding:24px}table{width:100%;border-collapse:collapse}thead tr{background:#1e3a5f;color:#fff}th,td{padding:6px 8px;text-align:left;border-bottom:1px solid #e2e8f0}tr:nth-child(even) td{background:#f8fafc}</style></head><body><h1>Passport Records Report</h1><p>Generated: ${new Date().toLocaleString()} | Total: ${records.length}</p><table><thead><tr><th>Holder Name</th><th>Nationality</th><th>Passport No.</th><th>Date of Birth</th><th>Expiry Date</th><th>Days Left</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
  const win = window.open('', '_blank', 'width=1000,height=700');
  if (!win) { toast.error('Popup blocked'); return; }
  win.document.write(html); win.document.close(); win.focus();
  setTimeout(() => win.print(), 400);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

function datestamp() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

// ─── Export Dropdown ─────────────────────────────────────────────────────────

function ExportDropdown({ onExport, variant = 'header' }: { onExport: (fmt: ExportFormat) => void; variant?: 'header\' | \'bulk' }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const formats: { fmt: ExportFormat; label: string; desc: string; icon: React.ReactNode }[] = [
    { fmt: 'csv', label: 'CSV', desc: 'Spreadsheet compatible', icon: <Table2 size={14} /> },
    { fmt: 'pdf', label: 'PDF', desc: 'Printable report', icon: <FileText size={14} /> },
    { fmt: 'json', label: 'JSON', desc: 'Data backup / API ready', icon: <FileJson size={14} /> },
  ];
  if (variant === 'bulk') return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 text-sm font-medium hover:text-accent transition-colors">
        <Download size={14} />Export<ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="absolute bottom-full mb-2 left-0 bg-card border border-border rounded-xl shadow-modal w-48 py-1.5 z-50">{formats.map(({ fmt, label, desc, icon }) => (<button key={fmt} type="button" onClick={() => { onExport(fmt); setOpen(false); }} className="w-full flex items-start gap-2.5 px-3 py-2 hover:bg-secondary transition-colors text-left"><span className="text-muted-foreground mt-0.5">{icon}</span><span><span className="block text-xs font-semibold text-foreground">{label}</span><span className="block text-[10px] text-muted-foreground">{desc}</span></span></button>))}</div>}
    </div>
  );
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} className="btn-secondary"><Download size={14} />Export<ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} /></button>
      {open && <div className="absolute top-full mt-1.5 right-0 bg-card border border-border rounded-xl shadow-modal w-52 py-1.5 z-50"><p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Export Format</p>{formats.map(({ fmt, label, desc, icon }) => (<button key={fmt} type="button" onClick={() => { onExport(fmt); setOpen(false); }} className="w-full flex items-start gap-2.5 px-3 py-2 hover:bg-secondary transition-colors text-left"><span className="text-primary mt-0.5">{icon}</span><span><span className="block text-sm font-semibold text-foreground">{label}</span><span className="block text-xs text-muted-foreground">{desc}</span></span></button>))}</div>}
    </div>
  );
}

// ─── Advanced Filter Panel ────────────────────────────────────────────────────

interface FilterState {
  search: string;
  status: string;
  nationality: string;
  sex: string;
  documentType: string;
  mrzValid: string;
  issuingCountry: string;
  expiryFrom: string;
  expiryTo: string;
  dobFrom: string;
  dobTo: string;
  daysRemainingMin: string;
  daysRemainingMax: string;
}

const DEFAULT_FILTERS: FilterState = {
  search: '', status: 'all', nationality: 'all', sex: 'all',
  documentType: 'all', mrzValid: 'all', issuingCountry: 'all',
  expiryFrom: '', expiryTo: '', dobFrom: '', dobTo: '',
  daysRemainingMin: '', daysRemainingMax: '',
};

function countActiveFilters(f: FilterState): number {
  let count = 0;
  if (f.search) count++;
  if (f.status !== 'all') count++;
  if (f.nationality !== 'all') count++;
  if (f.sex !== 'all') count++;
  if (f.documentType !== 'all') count++;
  if (f.mrzValid !== 'all') count++;
  if (f.issuingCountry !== 'all') count++;
  if (f.expiryFrom || f.expiryTo) count++;
  if (f.dobFrom || f.dobTo) count++;
  if (f.daysRemainingMin || f.daysRemainingMax) count++;
  return count;
}

interface FilterPanelProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  nationalities: string[];
  issuingCountries: string[];
  documentTypes: string[];
}

function FilterPanel({ filters, onChange, nationalities, issuingCountries, documentTypes }: FilterPanelProps) {
  const [open, setOpen] = useState(false);
  const active = countActiveFilters(filters);

  const set = (key: keyof FilterState, value: string) => onChange({ ...filters, [key]: value });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`btn-secondary relative ${active > 0 ? 'border-primary text-primary' : ''}`}
      >
        <Filter size={14} />
        Filters
        {active > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
            {active}
          </span>
        )}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 z-50 bg-card border border-border rounded-xl shadow-modal w-[520px] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-foreground">Advanced Filters</p>
            <div className="flex items-center gap-2">
              {active > 0 && (
                <button type="button" onClick={() => onChange(DEFAULT_FILTERS)} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <X size={11} /> Clear all
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
              <select value={filters.status} onChange={e => set('status', e.target.value)} className="form-input py-1.5 text-sm w-full">
                <option value="all">All Statuses</option>
                <option value="valid">Valid</option>
                <option value="expiring">Expiring Soon</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            {/* Nationality */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Nationality</label>
              <select value={filters.nationality} onChange={e => set('nationality', e.target.value)} className="form-input py-1.5 text-sm w-full">
                <option value="all">All Nationalities</option>
                {nationalities.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            {/* Sex */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Sex</label>
              <select value={filters.sex} onChange={e => set('sex', e.target.value)} className="form-input py-1.5 text-sm w-full">
                <option value="all">All</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>

            {/* Document Type */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Document Type</label>
              <select value={filters.documentType} onChange={e => set('documentType', e.target.value)} className="form-input py-1.5 text-sm w-full">
                <option value="all">All Types</option>
                {documentTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* MRZ Valid */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">MRZ Validity</label>
              <select value={filters.mrzValid} onChange={e => set('mrzValid', e.target.value)} className="form-input py-1.5 text-sm w-full">
                <option value="all">All</option>
                <option value="true">Valid MRZ</option>
                <option value="false">Invalid MRZ</option>
              </select>
            </div>

            {/* Issuing Country */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Issuing Country</label>
              <select value={filters.issuingCountry} onChange={e => set('issuingCountry', e.target.value)} className="form-input py-1.5 text-sm w-full">
                <option value="all">All Countries</option>
                {issuingCountries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Expiry Date Range */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Expiry From</label>
              <input type="date" value={filters.expiryFrom} onChange={e => set('expiryFrom', e.target.value)} className="form-input py-1.5 text-sm w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Expiry To</label>
              <input type="date" value={filters.expiryTo} onChange={e => set('expiryTo', e.target.value)} className="form-input py-1.5 text-sm w-full" />
            </div>

            {/* Days Remaining Range */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Min Days Remaining</label>
              <input type="number" placeholder="e.g. 0" value={filters.daysRemainingMin} onChange={e => set('daysRemainingMin', e.target.value)} className="form-input py-1.5 text-sm w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Max Days Remaining</label>
              <input type="number" placeholder="e.g. 365" value={filters.daysRemainingMax} onChange={e => set('daysRemainingMax', e.target.value)} className="form-input py-1.5 text-sm w-full" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border flex justify-end">
            <button type="button" onClick={() => setOpen(false)} className="btn-primary text-sm">Apply Filters</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PassportRecordsContent() {
  const [records, setRecords] = useState<EnrichedPassport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [sortKey, setSortKey] = useState<SortKey>('daysRemaining');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isDeleting, setIsDeleting] = useState(false);
  const { canEdit, canDelete } = useAuth();

  const loadRecords = useCallback(async () => {
    try {
      let data = await passportService.getAll();
      setRecords(data);
      setIsConnected(true);
    } catch {
      setIsConnected(false);
      toast.error('Failed to load records', { description: 'Check your connection and try again.' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
    const unsubscribe = passportService.subscribeToChanges((updatedRecords) => {
      setRecords(updatedRecords);
      setIsConnected(true);
    });
    return unsubscribe;
  }, [loadRecords]);

  // Derived filter options
  const NATIONALITIES = React.useMemo(() => [...new Set(records.map(p => p.nationalityCode))].sort(), [records]);
  const ISSUING_COUNTRIES = React.useMemo(() => [...new Set(records.map(p => p.issuingCountry))].sort(), [records]);
  const DOCUMENT_TYPES = React.useMemo(() => [...new Set(records.map(p => p.documentType))].sort(), [records]);

  const filtered = React.useMemo(() => {
    let data = [...records];
    const { search, status, nationality, sex, documentType, mrzValid, issuingCountry, expiryFrom, expiryTo, daysRemainingMin, daysRemainingMax } = filters;

    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(p =>
        p.holderName.toLowerCase().includes(q) ||
        p.passportNumber.toLowerCase().includes(q) ||
        p.nationality.toLowerCase().includes(q) ||
        p.nationalityCode.toLowerCase().includes(q) ||
        (p.issuingAuthority?.toLowerCase().includes(q) ?? false)
      );
    }
    if (status !== 'all') data = data.filter(p => p.status === status);
    if (nationality !== 'all') data = data.filter(p => p.nationalityCode === nationality);
    if (sex !== 'all') data = data.filter(p => p.sex === sex);
    if (documentType !== 'all') data = data.filter(p => p.documentType === documentType);
    if (mrzValid !== 'all') data = data.filter(p => String(p.mrzValid) === mrzValid);
    if (issuingCountry !== 'all') data = data.filter(p => p.issuingCountry === issuingCountry);
    if (expiryFrom) data = data.filter(p => p.expiryDate >= expiryFrom);
    if (expiryTo) data = data.filter(p => p.expiryDate <= expiryTo);
    if (daysRemainingMin !== '') data = data.filter(p => p.daysRemaining >= Number(daysRemainingMin));
    if (daysRemainingMax !== '') data = data.filter(p => p.daysRemaining <= Number(daysRemainingMax));

    data.sort((a, b) => {
      const av = a[sortKey]; const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc' ? String(av ?? '').localeCompare(String(bv ?? '')) : String(bv ?? '').localeCompare(String(av ?? ''));
    });
    return data;
  }, [records, filters, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setCurrentPage(1);
  };

  const toggleRow = (id: string) => setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleAll = () => { if (selectedIds.size === paginated.length) setSelectedIds(new Set()); else setSelectedIds(new Set(paginated.map(p => p.id))); };

  const handleDeleteSingle = async (passport: EnrichedPassport) => {
    toast.error('Confirm deletion', {
      description: `Delete ${passport.holderName}'s passport record?`,
      action: {
        label: 'Delete',
        onClick: async () => {
          const ok = await passportService.delete(passport.id);
          if (ok) {
            await auditService.log('delete', passport.id, passport.holderName);
            toast.success('Record deleted');
            setRecords(prev => prev.filter(r => r.id !== passport.id));
          } else {
            toast.error('Failed to delete record');
          }
        },
      },
    });
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    const ids = [...selectedIds];
    const ok = await passportService.deleteMany(ids);
    setIsDeleting(false);
    if (ok) {
      await auditService.log('bulk_delete', null, null, { count: ids.length, ids });
      toast.success(`${ids.length} record${ids.length > 1 ? 's' : ''} deleted`);
      setRecords(prev => prev.filter(r => !ids.includes(r.id)));
      setSelectedIds(new Set());
    } else {
      toast.error('Failed to delete records');
    }
  };

  const handleExport = (fmt: ExportFormat) => {
    const exportRecords = selectedIds.size > 0 ? filtered.filter(p => selectedIds.has(p.id)) : filtered;
    const scope = selectedIds.size > 0 ? `${exportRecords.length} selected` : `all ${exportRecords.length}`;
    auditService.log('export', null, null, { format: fmt, count: exportRecords.length });
    if (fmt === 'csv') { exportAsCSV(exportRecords); toast.success('CSV export ready', { description: `Exported ${scope} records` }); }
    else if (fmt === 'json') { exportAsJSON(exportRecords); toast.success('JSON export ready', { description: `Exported ${scope} records` }); }
    else { exportAsPDF(exportRecords); toast.success('PDF report opened'); }
  };

  const activeFilterCount = countActiveFilters(filters);

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronDown size={12} className="text-muted-foreground/40" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />;
  }

  function getDaysClass(days: number) {
    if (days < 0) return 'days-critical';
    if (days <= 180) return 'days-warning';
    return 'days-good';
  }

  function ThCell({ label, col, className = '' }: { label: string; col: SortKey; className?: string }) {
    return (
      <th className={`text-left px-4 py-3 text-xs font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors whitespace-nowrap ${className}`} onClick={() => handleSort(col)}>
        <span className="flex items-center gap-1">{label}<SortIcon col={col} /></span>
      </th>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="bg-card border-b border-border px-6 lg:px-8 py-5">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Passport Records</h1>
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
              {isLoading ? (
                <><Loader2 size={12} className="animate-spin" /> Loading records...</>
              ) : (
                <>
                  {records.length} records total
                  {isConnected ? (
                    <span className="flex items-center gap-1 text-valid text-xs"><Wifi size={11} /> Live sync</span>
                  ) : (
                    <span className="flex items-center gap-1 text-expired text-xs"><WifiOff size={11} /> Offline</span>
                  )}
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ExportDropdown onExport={handleExport} variant="header" />
            <Link href="/bulk-import" className="btn-secondary">
              <Download size={14} />
              Bulk Import
            </Link>
            <Link href="/" className="btn-primary">
              + Add Passport
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 2xl:px-16 py-6 space-y-5">
        <RecordsSummaryCards records={records} />
        <ExpiryDistributionChart records={records} />

        {/* Table Controls */}
        <div className="card-surface overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name, passport number, nationality..."
                  value={filters.search}
                  onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setCurrentPage(1); }}
                  className="form-input pl-9 py-2 text-sm"
                />
                {filters.search && (
                  <button type="button" onClick={() => setFilters(f => ({ ...f, search: '' }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Advanced Filter Panel */}
              <FilterPanel
                filters={filters}
                onChange={(f) => { setFilters(f); setCurrentPage(1); }}
                nationalities={NATIONALITIES}
                issuingCountries={ISSUING_COUNTRIES}
                documentTypes={DOCUMENT_TYPES}
              />

              {/* Quick status filter */}
              <select
                value={filters.status}
                onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setCurrentPage(1); }}
                className="form-input py-2 text-sm w-auto min-w-[140px]"
              >
                <option value="all">All Statuses</option>
                <option value="valid">Valid</option>
                <option value="expiring">Expiring Soon</option>
                <option value="expired">Expired</option>
              </select>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => { setFilters(DEFAULT_FILTERS); setCurrentPage(1); }}
                  className="btn-secondary py-2 text-sm"
                >
                  <RefreshCw size={13} />
                  Reset ({activeFilterCount})
                </button>
              )}

              <div className="ml-auto text-sm text-muted-foreground">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead className="bg-secondary sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" checked={paginated.length > 0 && selectedIds.size === paginated.length} onChange={toggleAll} className="w-3.5 h-3.5 rounded border-border cursor-pointer accent-primary" />
                  </th>
                  <ThCell label="Holder Name" col="holderName" />
                  <ThCell label="Nationality" col="nationalityCode" />
                  <ThCell label="Passport No." col="passportNumber" />
                  <ThCell label="Date of Birth" col="dateOfBirth" />
                  <ThCell label="Issue Date" col="issueDate" />
                  <ThCell label="Expiry Date" col="expiryDate" />
                  <ThCell label="Days Left" col="daysRemaining" />
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Hijri Expiry</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">MRZ</th>
                  <ThCell label="Status" col="status" />
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={12} className="text-center py-16"><div className="flex flex-col items-center gap-3"><Loader2 size={32} className="animate-spin text-primary/40" /><p className="text-sm text-muted-foreground">Loading passport records...</p></div></td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={12} className="text-center py-16"><div className="flex flex-col items-center gap-3"><Search size={36} className="text-muted-foreground/30" /><p className="text-sm font-semibold text-foreground">No passport records found</p><p className="text-xs text-muted-foreground">{records.length === 0 ? 'No records yet. Add your first passport record.' : 'Try adjusting your search or filters'}</p>{records.length === 0 && <Link href="/" className="btn-primary text-sm mt-1">+ Add Passport Record</Link>}</div></td></tr>
                ) : (
                  paginated.map((passport) => (
                    <tr key={passport.id} className={`border-t border-border row-hover transition-colors duration-100 ${selectedIds.has(passport.id) ? 'bg-primary/4' : ''}`}>
                      <td className="px-4 py-3"><input type="checkbox" checked={selectedIds.has(passport.id)} onChange={() => toggleRow(passport.id)} className="w-3.5 h-3.5 rounded border-border cursor-pointer accent-primary" /></td>
                      <td className="px-4 py-3"><div><p className="text-sm font-semibold text-foreground">{passport.holderName}</p>{passport.holderNameAr && <p className="text-xs text-muted-foreground" dir="rtl">{passport.holderNameAr}</p>}</div></td>
                      <td className="px-4 py-3"><span className="flex items-center gap-1.5 text-sm"><span>{passport.flagEmoji}</span><span className="font-mono-data text-xs font-semibold text-foreground">{passport.nationalityCode}</span></span></td>
                      <td className="px-4 py-3"><span className="font-mono-data text-xs font-bold text-foreground">{passport.passportNumber}</span></td>
                      <td className="px-4 py-3"><span className="font-mono-data text-xs text-foreground">{passport.dobFormatted}</span></td>
                      <td className="px-4 py-3"><span className="font-mono-data text-xs text-foreground">{passport.issueDateFormatted}</span></td>
                      <td className="px-4 py-3"><span className={`font-mono-data text-xs font-semibold ${passport.status === 'expired' ? 'text-expired' : passport.status === 'expiring' ? 'text-expiring' : 'text-foreground'}`}>{passport.expiryFormatted}</span></td>
                      <td className="px-4 py-3"><span className={`font-mono-data text-sm font-bold tabular-nums ${getDaysClass(passport.daysRemaining)}`}>{passport.daysRemaining < 0 ? `−${Math.abs(passport.daysRemaining)}` : passport.daysRemaining}</span></td>
                      <td className="px-4 py-3"><span className="hijri-badge text-xs">{passport.expiryHijri.replace(' AH', '')}</span></td>
                      <td className="px-4 py-3">{passport.mrzValid ? <span className="flex items-center gap-1 text-xs text-valid font-medium"><span className="w-1.5 h-1.5 rounded-full bg-valid" />Valid</span> : <span className="flex items-center gap-1 text-xs text-expired font-medium"><AlertTriangle size={11} />Error</span>}</td>
                      <td className="px-4 py-3"><StatusBadge status={passport.status} size="sm" showIcon={false} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link href="/passport-details" className="tooltip-wrapper w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/8 transition-colors"><Eye size={14} /><span className="tooltip-label">View Details</span></Link>
                          {canEdit && <button type="button" className="tooltip-wrapper w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/8 transition-colors"><Edit2 size={14} /><span className="tooltip-label">Edit Record</span></button>}
                          {canDelete && <button type="button" className="tooltip-wrapper w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-expired hover:bg-expired/8 transition-colors" onClick={() => handleDeleteSingle(passport)}><Trash2 size={14} /><span className="tooltip-label">Delete Record</span></button>}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-border flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Rows per page</span>
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} className="form-input py-1 text-xs w-16">
                {PAGE_SIZE_OPTIONS.map(s => <option key={`ps-${s}`} value={s}>{s}</option>)}
              </select>
              <span className="text-xs text-muted-foreground">{filtered.length === 0 ? '0' : ((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={14} /></button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const page = i + 1;
                return <button key={`pb-${page}`} type="button" onClick={() => setCurrentPage(page)} className={`w-7 h-7 rounded-md text-xs font-medium transition-colors ${currentPage === page ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>{page}</button>;
              })}
              <button type="button" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronRight size={14} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-primary text-primary-foreground rounded-xl shadow-modal px-5 py-3 flex items-center gap-4">
            <span className="text-sm font-semibold">{selectedIds.size} record{selectedIds.size > 1 ? 's' : ''} selected</span>
            <div className="w-px h-4 bg-white/20" />
            <ExportDropdown onExport={handleExport} variant="bulk" />
            <button type="button" className="flex items-center gap-1.5 text-sm font-medium hover:text-accent transition-colors"><Archive size={14} />Archive</button>
            {canDelete && <button type="button" onClick={handleBulkDelete} disabled={isDeleting} className="flex items-center gap-1.5 text-sm font-medium text-red-300 hover:text-red-200 transition-colors disabled:opacity-60"><Trash2 size={14} />{isDeleting ? 'Deleting...' : 'Delete'}</button>}
            <button type="button" onClick={() => setSelectedIds(new Set())} className="ml-1 text-white/60 hover:text-white transition-colors"><X size={15} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
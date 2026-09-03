'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Download, FileText, FileJson, Table2, Loader2, CheckCircle2, RefreshCw, Filter, X, Database, AlertCircle,  } from 'lucide-react';
import { passportService } from '@/lib/services/passportService';
import { auditService } from '@/lib/services/auditService';
import { type EnrichedPassport } from '@/lib/passportData';
import { toast } from 'sonner';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function datestamp() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV(records: EnrichedPassport[]) {
  const headers = [
    'Holder Name', 'Nationality', 'Nationality Code', 'Passport Number',
    'Document Type', 'Sex', 'Date of Birth', 'Place of Birth',
    'Issue Date', 'Expiry Date', 'Days Remaining', 'Issuing Authority',
    'Issuing Country', 'MRZ Valid', 'Status', 'Notes',
  ];
  const escape = (v: string | number | boolean | undefined) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = records.map(p =>
    [p.holderName, p.nationality, p.nationalityCode, p.passportNumber,
      p.documentType, p.sex, p.dateOfBirth, p.placeOfBirth,
      p.issueDate, p.expiryDate, p.daysRemaining,
      p.issuingAuthority, p.issuingCountry, p.mrzValid, p.status, p.notes ?? '']
      .map(escape).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `passport-export-${datestamp()}.csv`);
}

function exportJSON(records: EnrichedPassport[]) {
  const data = records.map(p => ({
    id: p.id, holderName: p.holderName, nationality: p.nationality,
    nationalityCode: p.nationalityCode, passportNumber: p.passportNumber,
    documentType: p.documentType, sex: p.sex, dateOfBirth: p.dateOfBirth,
    placeOfBirth: p.placeOfBirth, issueDate: p.issueDate, expiryDate: p.expiryDate,
    daysRemaining: p.daysRemaining, issuingAuthority: p.issuingAuthority,
    issuingCountry: p.issuingCountry, mrzValid: p.mrzValid, status: p.status,
    notes: p.notes ?? null, createdAt: p.createdAt,
  }));
  triggerDownload(
    new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), count: data.length, records: data }, null, 2)], { type: 'application/json' }),
    `passport-export-${datestamp()}.json`
  );
}

function exportPDF(records: EnrichedPassport[]) {
  const rows = records.map(p =>
    `<tr>
      <td>${p.holderName}</td>
      <td>${p.nationalityCode}</td>
      <td>${p.passportNumber}</td>
      <td>${p.sex}</td>
      <td>${p.dateOfBirth}</td>
      <td>${p.issueDate}</td>
      <td>${p.expiryDate}</td>
      <td>${p.daysRemaining < 0 ? `−${Math.abs(p.daysRemaining)}` : p.daysRemaining}</td>
      <td style="color:${p.status === 'valid' ? '#16a34a' : p.status === 'expiring' ? '#d97706' : '#dc2626'};font-weight:600">${p.status.toUpperCase()}</td>
      <td>${p.mrzValid ? '✓' : '✗'}</td>
    </tr>`
  ).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Passport Data Export</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 10px; padding: 24px; color: #1e293b; }
    h1 { font-size: 18px; margin-bottom: 4px; color: #0f172a; }
    .meta { font-size: 11px; color: #64748b; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #1e3a5f; color: #fff; }
    th { padding: 7px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; }
    td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) td { background: #f8fafc; }
    .footer { margin-top: 16px; font-size: 9px; color: #94a3b8; }
  </style>
</head>
<body>
  <h1>Passport Data Export</h1>
  <p class="meta">Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Total Records: ${records.length}</p>
  <table>
    <thead>
      <tr>
        <th>Holder Name</th><th>Nationality</th><th>Passport No.</th>
        <th>Sex</th><th>Date of Birth</th><th>Issue Date</th>
        <th>Expiry Date</th><th>Days Left</th><th>Status</th><th>MRZ</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="footer">PassportReader — Confidential Export</p>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=1100,height=750');
  if (!win) { toast.error('Popup blocked — please allow popups'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

// ─── Format Card ─────────────────────────────────────────────────────────────

interface FormatCardProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  detail: string;
  color: string;
  bg: string;
  selected: boolean;
  onSelect: () => void;
}

function FormatCard({ icon, label, description, detail, color, bg, selected, onSelect }: FormatCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-150 ${
        selected
          ? `border-primary bg-primary/5`
          : 'border-border bg-card hover:border-primary/40 hover:bg-secondary/40'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg ${bg} ${color} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{label}</p>
            {selected && <CheckCircle2 size={16} className="text-primary flex-shrink-0" />}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">{detail}</p>
        </div>
      </div>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type ExportFormat = 'csv' | 'json' | 'pdf';
type StatusFilter = 'all' | 'valid' | 'expiring' | 'expired';

export default function DataExportContent() {
  const [records, setRecords] = useState<EnrichedPassport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [nationalityFilter, setNationalityFilter] = useState('all');

  const load = useCallback(async () => {
    setIsLoading(true);
    const data = await passportService.getAll();
    setRecords(data);
    setIsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const nationalities = Array.from(new Set(records.map(r => r.nationality))).sort();

  const filtered = records.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (nationalityFilter !== 'all' && r.nationality !== nationalityFilter) return false;
    return true;
  });

  const handleExport = async () => {
    if (filtered.length === 0) { toast.error('No records to export'); return; }
    setIsExporting(true);
    try {
      if (format === 'csv') exportCSV(filtered);
      else if (format === 'json') exportJSON(filtered);
      else exportPDF(filtered);

      await auditService.log('export', null, null, {
        format,
        count: filtered.length,
        filters: { status: statusFilter, nationality: nationalityFilter },
      });
      toast.success(`Exported ${filtered.length} records as ${format.toUpperCase()}`);
    } catch {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const stats = {
    total: records.length,
    valid: records.filter(r => r.status === 'valid').length,
    expiring: records.filter(r => r.status === 'expiring').length,
    expired: records.filter(r => r.status === 'expired').length,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 lg:px-8 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Passport Data Export</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Export your passport records in multiple formats
            </p>
          </div>
          <button type="button" onClick={load} disabled={isLoading} className="btn-secondary">
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Records', value: stats.total, color: 'text-foreground', bg: 'bg-secondary' },
            { label: 'Valid', value: stats.valid, color: 'text-valid', bg: 'bg-valid/10' },
            { label: 'Expiring Soon', value: stats.expiring, color: 'text-warning', bg: 'bg-warning/10' },
            { label: 'Expired', value: stats.expired, color: 'text-expired', bg: 'bg-expired/10' },
          ].map(s => (
            <div key={s.label} className="card-surface p-4">
              <p className={`text-2xl font-bold ${s.color}`}>{isLoading ? '—' : s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Config */}
          <div className="lg:col-span-2 space-y-5">

            {/* Format Selection */}
            <div className="card-surface p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileText size={15} className="text-primary" />
                Export Format
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormatCard
                  icon={<Table2 size={18} />}
                  label="CSV"
                  description="Spreadsheet compatible"
                  detail="Excel, Google Sheets, Numbers"
                  color="text-valid"
                  bg="bg-valid/10"
                  selected={format === 'csv'}
                  onSelect={() => setFormat('csv')}
                />
                <FormatCard
                  icon={<FileJson size={18} />}
                  label="JSON"
                  description="Structured data format"
                  detail="API ready, data backup"
                  color="text-primary"
                  bg="bg-primary/10"
                  selected={format === 'json'}
                  onSelect={() => setFormat('json')}
                />
                <FormatCard
                  icon={<FileText size={18} />}
                  label="PDF"
                  description="Printable report"
                  detail="Print or save as PDF"
                  color="text-expired"
                  bg="bg-expired/10"
                  selected={format === 'pdf'}
                  onSelect={() => setFormat('pdf')}
                />
              </div>
            </div>

            {/* Filters */}
            <div className="card-surface p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Filter size={15} className="text-primary" />
                Filter Records
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                    className="form-input py-2 text-sm w-full"
                  >
                    <option value="all">All Statuses</option>
                    <option value="valid">Valid Only</option>
                    <option value="expiring">Expiring Soon</option>
                    <option value="expired">Expired Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nationality</label>
                  <select
                    value={nationalityFilter}
                    onChange={e => setNationalityFilter(e.target.value)}
                    className="form-input py-2 text-sm w-full"
                  >
                    <option value="all">All Nationalities</option>
                    {nationalities.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>

              {(statusFilter !== 'all' || nationalityFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => { setStatusFilter('all'); setNationalityFilter('all'); }}
                  className="mt-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <X size={11} /> Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Right: Summary & Export */}
          <div className="space-y-4">
            <div className="card-surface p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Database size={15} className="text-primary" />
                Export Summary
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-xs text-muted-foreground">Records to export</span>
                  <span className="text-sm font-bold text-foreground">{isLoading ? '—' : filtered.length}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-xs text-muted-foreground">Format</span>
                  <span className="text-sm font-semibold text-primary uppercase">{format}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-xs text-muted-foreground">Status filter</span>
                  <span className="text-xs font-medium text-foreground capitalize">{statusFilter}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs text-muted-foreground">Nationality filter</span>
                  <span className="text-xs font-medium text-foreground truncate max-w-[100px]">
                    {nationalityFilter === 'all' ? 'All' : nationalityFilter}
                  </span>
                </div>
              </div>

              {filtered.length === 0 && !isLoading && (
                <div className="mt-4 p-3 rounded-lg bg-warning/10 flex items-start gap-2">
                  <AlertCircle size={14} className="text-warning flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-warning">No records match the current filters.</p>
                </div>
              )}

              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting || isLoading || filtered.length === 0}
                className="btn-primary w-full mt-5 justify-center"
              >
                {isExporting ? (
                  <><Loader2 size={14} className="animate-spin" />Exporting...</>
                ) : (
                  <><Download size={14} />Export {filtered.length > 0 ? `${filtered.length} Records` : ''}</>
                )}
              </button>
            </div>

            <div className="card-surface p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Format Details</p>
              {format === 'csv' && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Exports all fields as comma-separated values. Compatible with Excel, Google Sheets, and most data tools.
                </p>
              )}
              {format === 'json' && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Exports structured JSON with metadata. Ideal for data backups, API integrations, and developer use.
                </p>
              )}
              {format === 'pdf' && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Opens a print-ready HTML report in a new tab. Use your browser's print dialog to save as PDF.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ClipboardList, Search, RefreshCw, Loader2, Trash2, Download, Filter, X, ChevronDown, User, Calendar, FileText, Database, Upload, Eye } from 'lucide-react';
import { auditService, type AuditLogEntry, type AuditAction } from '@/lib/services/auditService';


// ─── Action config ────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<AuditAction, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  create:       { label: 'Created',      color: 'text-valid',    bg: 'bg-valid/10',    icon: <FileText size={12} /> },
  update:       { label: 'Updated',      color: 'text-primary',  bg: 'bg-primary/10',  icon: <FileText size={12} /> },
  delete:       { label: 'Deleted',      color: 'text-expired',  bg: 'bg-expired/10',  icon: <Trash2 size={12} /> },
  bulk_delete:  { label: 'Bulk Delete',  color: 'text-expired',  bg: 'bg-expired/10',  icon: <Trash2 size={12} /> },
  bulk_import:  { label: 'Bulk Import',  color: 'text-valid',    bg: 'bg-valid/10',    icon: <Upload size={12} /> },
  export:       { label: 'Exported',     color: 'text-primary',  bg: 'bg-primary/10',  icon: <Download size={12} /> },
  view:         { label: 'Viewed',       color: 'text-muted-foreground', bg: 'bg-secondary', icon: <Eye size={12} /> },
};

function ActionBadge({ action }: { action: AuditAction }) {
  const cfg = ACTION_CONFIG[action] ?? { label: action, color: 'text-muted-foreground', bg: 'bg-secondary', icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color} ${cfg.bg}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function groupByDate(entries: AuditLogEntry[]): { date: string; items: AuditLogEntry[] }[] {
  const groups: Record<string, AuditLogEntry[]> = {};
  for (const entry of entries) {
    const date = new Date(entry.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    if (!groups[date]) groups[date] = [];
    groups[date].push(entry);
  }
  return Object.entries(groups).map(([date, items]) => ({ date, items }));
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

function exportAuditPDF(entries: AuditLogEntry[]) {
  const rows = entries.map(e => {
    const cfg = ACTION_CONFIG[e.action];
    return `<tr>
      <td>${new Date(e.createdAt).toLocaleString()}</td>
      <td><span style="font-weight:600;color:${cfg?.color?.includes('valid') ? '#16a34a' : cfg?.color?.includes('expired') ? '#dc2626' : '#3b82f6'}">${cfg?.label ?? e.action}</span></td>
      <td>${e.entityLabel ?? (e.action === 'bulk_import' ? `${(e.details as Record<string,unknown>)?.['imported'] ?? ''} records` : e.action === 'export' ? `${(e.details as Record<string,unknown>)?.['count'] ?? ''} records` : '—')}</td>
      <td>${e.userEmail ?? '—'}</td>
      <td style="font-size:9px;color:#64748b">${e.entityId ?? '—'}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Audit Log Report</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 10px; padding: 24px; color: #1e293b; }
    h1 { font-size: 18px; margin-bottom: 4px; color: #0f172a; }
    .meta { font-size: 11px; color: #64748b; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #1e3a5f; color: #fff; }
    th { padding: 7px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; }
    td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }
    .footer { margin-top: 16px; font-size: 9px; color: #94a3b8; }
  </style>
</head>
<body>
  <h1>Audit Log Report</h1>
  <p class="meta">Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Total Entries: ${entries.length}</p>
  <table>
    <thead>
      <tr><th>Timestamp</th><th>Action</th><th>Record / Details</th><th>User</th><th>Record ID</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="footer">PassportReader — Audit Log Export (Confidential)</p>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=1100,height=750');
  if (!win) { return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuditLogContent() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    let data = await auditService.getAll(500);
    setEntries(data);
    setIsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let data = [...entries];
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(e =>
        (e.entityLabel?.toLowerCase().includes(q) ?? false) ||
        (e.entityId?.toLowerCase().includes(q) ?? false) ||
        e.action.toLowerCase().includes(q) ||
        (e.userEmail?.toLowerCase().includes(q) ?? false)
      );
    }
    if (actionFilter !== 'all') data = data.filter(e => e.action === actionFilter);
    return data;
  }, [entries, search, actionFilter]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  // Stats
  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of entries) counts[e.action] = (counts[e.action] ?? 0) + 1;
    return counts;
  }, [entries]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 lg:px-8 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Audit Log</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isLoading ? 'Loading...' : `${entries.length} actions recorded`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportAuditPDF(filtered)}
              disabled={isLoading || filtered.length === 0}
              className="btn-secondary"
              title="Export as PDF"
            >
              <FileText size={14} />
              Export PDF
            </button>
            <button type="button" onClick={load} disabled={isLoading} className="btn-secondary">
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(['create', 'delete', 'bulk_import', 'export'] as AuditAction[]).map(action => {
            const cfg = ACTION_CONFIG[action];
            return (
              <div key={action} className="card-surface p-4">
                <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center mb-2 ${cfg.color}`}>
                  {cfg.icon}
                </div>
                <p className="text-xl font-bold text-foreground">{stats[action] ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{cfg.label}</p>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="card-surface p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by record, user, action..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="form-input pl-9 py-2 text-sm"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Filter size={14} className="text-muted-foreground" />
              <select
                value={actionFilter}
                onChange={e => setActionFilter(e.target.value)}
                className="form-input py-2 text-sm w-auto min-w-[150px]"
              >
                <option value="all">All Actions</option>
                {Object.entries(ACTION_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>

            {(search || actionFilter !== 'all') && (
              <button type="button" onClick={() => { setSearch(''); setActionFilter('all'); }} className="btn-secondary py-2 text-sm">
                <RefreshCw size={13} /> Reset
              </button>
            )}

            <div className="ml-auto text-sm text-muted-foreground">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Log Entries */}
        {isLoading ? (
          <div className="card-surface p-16 text-center">
            <Loader2 size={32} className="animate-spin text-primary/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading audit log...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-surface p-16 text-center">
            <ClipboardList size={40} className="text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">No audit entries found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {entries.length === 0 ? 'Actions on passport records will appear here.' : 'Try adjusting your filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ date, items }) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-3">
                  <Calendar size={13} className="text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{date}</p>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">{items.length} action{items.length !== 1 ? 's' : ''}</span>
                </div>

                <div className="card-surface divide-y divide-border overflow-hidden">
                  {items.map(entry => (
                    <div key={entry.id} className="px-4 py-3 hover:bg-secondary/30 transition-colors">
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${ACTION_CONFIG[entry.action]?.bg ?? 'bg-secondary'} ${ACTION_CONFIG[entry.action]?.color ?? 'text-muted-foreground'}`}>
                          {ACTION_CONFIG[entry.action]?.icon ?? <Database size={12} />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <ActionBadge action={entry.action} />
                            {entry.entityLabel && (
                              <span className="text-sm font-medium text-foreground truncate">{entry.entityLabel}</span>
                            )}
                            {!entry.entityLabel && entry.details && (
                              <span className="text-sm text-muted-foreground">
                                {entry.action === 'bulk_import' && `${(entry.details as Record<string, unknown>)['imported'] ?? ''} records from ${(entry.details as Record<string, unknown>)['fileName'] ?? 'file'}`}
                                {entry.action === 'bulk_delete' && `${(entry.details as Record<string, unknown>)['count'] ?? ''} records`}
                                {entry.action === 'export' && `${(entry.details as Record<string, unknown>)['count'] ?? ''} records as ${String((entry.details as Record<string, unknown>)['format'] ?? '').toUpperCase()}`}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {entry.userEmail && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <User size={10} />
                                {entry.userEmail}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">{formatRelativeTime(entry.createdAt)}</span>
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                              {new Date(entry.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>

                        {/* Expand details */}
                        {entry.details && Object.keys(entry.details).length > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                          >
                            <ChevronDown size={14} className={`transition-transform ${expandedId === entry.id ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>

                      {/* Expanded details */}
                      {expandedId === entry.id && entry.details && (
                        <div className="mt-2 ml-10 bg-secondary/50 rounded-lg p-3">
                          <p className="text-xs font-semibold text-muted-foreground mb-1.5">Details</p>
                          <pre className="text-xs text-foreground font-mono overflow-x-auto whitespace-pre-wrap break-all">
                            {JSON.stringify(entry.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Upload, FileText, CheckCircle, XCircle, AlertTriangle, Download,
  Loader2, X, ChevronDown, ChevronUp, ArrowRight, RefreshCw, FileSpreadsheet,
  Table2, FileDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { passportService } from '@/lib/services/passportService';
import { auditService } from '@/lib/services/auditService';
import type { PassportRecord } from '@/lib/passportData';
import * as XLSX from 'xlsx';

// ─── Constants ────────────────────────────────────────────────────────────────

const SYSTEM_FIELDS: { key: string; label: string; required: boolean }[] = [
  { key: 'holder_name', label: 'Holder Name', required: true },
  { key: 'holder_name_ar', label: 'Holder Name (Arabic)', required: false },
  { key: 'nationality', label: 'Nationality', required: true },
  { key: 'nationality_code', label: 'Nationality Code', required: true },
  { key: 'flag_emoji', label: 'Flag Emoji', required: false },
  { key: 'passport_number', label: 'Passport Number', required: true },
  { key: 'document_type', label: 'Document Type', required: false },
  { key: 'sex', label: 'Sex (M/F)', required: false },
  { key: 'date_of_birth', label: 'Date of Birth', required: true },
  { key: 'place_of_birth', label: 'Place of Birth', required: false },
  { key: 'issue_date', label: 'Issue Date', required: true },
  { key: 'expiry_date', label: 'Expiry Date', required: true },
  { key: 'issuing_authority', label: 'Issuing Authority', required: false },
  { key: 'issuing_country', label: 'Issuing Country', required: true },
  { key: 'personal_number', label: 'Personal Number', required: false },
  { key: 'mrz_line1', label: 'MRZ Line 1', required: false },
  { key: 'mrz_line2', label: 'MRZ Line 2', required: false },
  { key: 'mrz_valid', label: 'MRZ Valid', required: false },
  { key: 'notes', label: 'Notes', required: false },
];

const REQUIRED_FIELDS = SYSTEM_FIELDS.filter(f => f.required).map(f => f.key);

const CSV_HEADERS = SYSTEM_FIELDS.map(f => f.key);
const SAMPLE_ROW = [
  'John Smith', '', 'United States', 'USA',
  '🇺🇸', 'A12345678', 'P', 'M',
  '1985-06-15', 'New York', '2020-01-10', '2030-01-09',
  'U.S. Department of State', 'USA', '',
  'P<USASMITH<<JOHN<<<<<<<<<<<<<<<<<<<<<<<<<<<<',
  'A123456781USA8506151M3001099<<<<<<<<<<<<<<<6', 'true', '',
];

// ─── Template Downloads ───────────────────────────────────────────────────────

function downloadCSVTemplate() {
  const csv = [
    CSV_HEADERS.join(','),
    SAMPLE_ROW.map(v => (v.includes(',') ? `"${v}"` : v)).join(','),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'passport-import-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function downloadExcelTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([CSV_HEADERS, SAMPLE_ROW]);
  // Style header row width
  ws['!cols'] = CSV_HEADERS.map(() => ({ wch: 20 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Passport Import');
  XLSX.writeFile(wb, 'passport-import-template.xlsx');
}

// ─── Export to Excel ──────────────────────────────────────────────────────────

async function exportPassportsToExcel() {
  try {
    const records = await passportService.getAll();
    if (!records.length) {
      toast.error('No records to export');
      return;
    }
    const headers = [
      'ID', 'Holder Name', 'Holder Name (AR)', 'Nationality', 'Code',
      'Passport Number', 'Document Type', 'Sex', 'Date of Birth', 'Place of Birth',
      'Issue Date', 'Expiry Date', 'Issuing Authority', 'Issuing Country',
      'Personal Number', 'MRZ Line 1', 'MRZ Line 2', 'MRZ Valid', 'Notes', 'Created At',
    ];
    const rows = records.map(r => [
      r.id, r.holderName, r.holderNameAr ?? '', r.nationality, r.nationalityCode,
      r.passportNumber, r.documentType, r.sex, r.dateOfBirth, r.placeOfBirth,
      r.issueDate, r.expiryDate, r.issuingAuthority, r.issuingCountry,
      r.personalNumber ?? '', r.mrzLine1, r.mrzLine2, r.mrzValid ? 'true' : 'false',
      r.notes ?? '', r.createdAt,
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = headers.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Passport Records');
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `passport-records-${date}.xlsx`);
    toast.success(`Exported ${records.length} records to Excel`);
  } catch {
    toast.error('Export failed');
  }
}

// ─── File Parsers ─────────────────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  for (const line of lines) {
    const cols: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        cols.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

function parseExcel(buffer: ArrayBuffer): string[][] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' });
  return (data as string[][]).filter(row => row.some(cell => String(cell).trim() !== ''));
}

// ─── Auto-mapping ─────────────────────────────────────────────────────────────

function autoMapColumns(fileHeaders: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const sysField of SYSTEM_FIELDS) {
    const normalized = sysField.key.replace(/_/g, '').toLowerCase();
    const match = fileHeaders.find(h => {
      const hn = h.replace(/[\s_-]/g, '').toLowerCase();
      return hn === normalized || hn === sysField.label.replace(/[\s()]/g, '').toLowerCase();
    });
    if (match) mapping[sysField.key] = match;
  }
  return mapping;
}

// ─── Row Validation ───────────────────────────────────────────────────────────

interface ParsedRow {
  rowIndex: number;
  data: Omit<PassportRecord, 'id' | 'createdAt'> | null;
  errors: string[];
  raw: Record<string, string>;
}

function validateAndParseRow(
  mapping: Record<string, string>,
  fileHeaders: string[],
  cols: string[],
  rowIndex: number
): ParsedRow {
  // Build raw using mapping: sysField -> value from file column
  const raw: Record<string, string> = {};
  for (const sysField of SYSTEM_FIELDS) {
    const fileCol = mapping[sysField.key];
    if (fileCol) {
      const colIdx = fileHeaders.indexOf(fileCol);
      raw[sysField.key] = colIdx >= 0 ? String(cols[colIdx] ?? '').trim() : '';
    } else {
      raw[sysField.key] = '';
    }
  }

  const errors: string[] = [];
  for (const field of REQUIRED_FIELDS) {
    if (!raw[field]) errors.push(`Missing required field: ${field}`);
  }

  const dateFields = ['date_of_birth', 'issue_date', 'expiry_date'];
  for (const f of dateFields) {
    if (raw[f] && !/^\d{4}-\d{2}-\d{2}$/.test(raw[f])) {
      errors.push(`${f} must be YYYY-MM-DD format`);
    }
  }

  if (raw['sex'] && !['M', 'F'].includes(raw['sex'].toUpperCase())) {
    errors.push('sex must be M or F');
  }

  if (errors.length > 0) return { rowIndex, data: null, errors, raw };

  const data: Omit<PassportRecord, 'id' | 'createdAt'> = {
    holderName: raw['holder_name'],
    holderNameAr: raw['holder_name_ar'] || undefined,
    nationality: raw['nationality'],
    nationalityCode: raw['nationality_code'].toUpperCase(),
    flagEmoji: raw['flag_emoji'] || '',
    passportNumber: raw['passport_number'],
    documentType: raw['document_type'] || 'P',
    sex: (raw['sex']?.toUpperCase() as 'M' | 'F') || 'M',
    dateOfBirth: raw['date_of_birth'],
    placeOfBirth: raw['place_of_birth'] || '',
    issueDate: raw['issue_date'],
    expiryDate: raw['expiry_date'],
    issuingAuthority: raw['issuing_authority'] || '',
    issuingCountry: raw['issuing_country'],
    personalNumber: raw['personal_number'] || undefined,
    mrzLine1: raw['mrz_line1'] || '',
    mrzLine2: raw['mrz_line2'] || '',
    mrzValid: raw['mrz_valid']?.toLowerCase() !== 'false',
    notes: raw['notes'] || undefined,
  };

  return { rowIndex, data, errors: [], raw };
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'done';

interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; message: string }[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BulkImportContent() {
  const [step, setStep] = useState<ImportStep>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const validRows = parsedRows.filter(r => r.errors.length === 0);
  const invalidRows = parsedRows.filter(r => r.errors.length > 0);

  const processRawData = useCallback((rows: string[][], name: string) => {
    if (rows.length < 2) {
      toast.error('Empty file', { description: 'The file has no data rows.' });
      return;
    }
    const headers = rows[0].map(h => String(h).trim());
    const dataRows = rows.slice(1);
    setFileHeaders(headers);
    setRawRows(dataRows);
    setFileName(name);
    const autoMap = autoMapColumns(headers);
    setColumnMapping(autoMap);
    setStep('mapping');
  }, []);

  function processFile(file: File) {
    const isCSV = file.name.endsWith('.csv');
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    if (!isCSV && !isExcel) {
      toast.error('Invalid file type', { description: 'Please upload a .csv, .xlsx, or .xls file.' });
      return;
    }
    if (isCSV) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        processRawData(parseCSV(text), file.name);
      };
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        processRawData(parseExcel(buffer), file.name);
      };
      reader.readAsArrayBuffer(file);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function applyMapping() {
    // Check all required fields are mapped
    const unmapped = REQUIRED_FIELDS.filter(f => !columnMapping[f]);
    if (unmapped.length > 0) {
      toast.error('Missing required mappings', {
        description: `Please map: ${unmapped.map(f => SYSTEM_FIELDS.find(s => s.key === f)?.label).join(', ')}`,
      });
      return;
    }
    const parsed = rawRows.map((cols, i) => validateAndParseRow(columnMapping, fileHeaders, cols, i + 2));
    setParsedRows(parsed);
    setStep('preview');
  }

  async function handleImport() {
    setStep('importing');
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    for (const row of validRows) {
      if (!row.data) continue;
      try {
        const created = await passportService.create(row.data);
        if (created) {
          result.success++;
          await auditService.log('create', created.id, created.holderName, { source: 'bulk_import', fileName });
        } else {
          result.failed++;
          result.errors.push({ row: row.rowIndex, message: 'Failed to save record' });
        }
      } catch (err) {
        result.failed++;
        result.errors.push({ row: row.rowIndex, message: String(err) });
      }
    }

    if (result.success > 0) {
      await auditService.log('bulk_import', null, null, {
        fileName,
        totalRows: parsedRows.length,
        imported: result.success,
        failed: result.failed,
      });
    }

    setImportResult(result);
    setStep('done');
  }

  async function handleExport() {
    setIsExporting(true);
    await exportPassportsToExcel();
    setIsExporting(false);
  }

  function reset() {
    setStep('upload');
    setFileName('');
    setFileHeaders([]);
    setRawRows([]);
    setColumnMapping({});
    setParsedRows([]);
    setImportResult(null);
    setExpandedErrors(new Set());
    if (fileRef.current) fileRef.current.value = '';
  }

  const STEP_LABELS = ['Upload File', 'Map Columns', 'Review & Import', 'Complete'];
  const STEP_KEYS: ImportStep[] = ['upload', 'mapping', 'preview', 'done'];
  const currentStepIndex = STEP_KEYS.indexOf(step === 'importing' ? 'preview' : step);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 lg:px-8 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Bulk Import</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Import passport records from CSV or Excel files</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Export button */}
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="btn-secondary flex items-center gap-2"
            >
              {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
              Export to Excel
            </button>
            {/* Template downloads */}
            <div className="relative group">
              <button type="button" className="btn-secondary flex items-center gap-2">
                <Download size={14} />
                Download Template
                <ChevronDown size={12} />
              </button>
              <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-10 overflow-hidden opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-150">
                <button
                  type="button"
                  onClick={downloadCSVTemplate}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  <FileText size={14} className="text-muted-foreground" />
                  CSV Template
                </button>
                <button
                  type="button"
                  onClick={downloadExcelTemplate}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  <FileSpreadsheet size={14} className="text-muted-foreground" />
                  Excel Template
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-8 space-y-6">

        {/* Step Indicator */}
        <div className="flex items-center gap-2">
          {STEP_KEYS.map((s, i) => {
            const isDone = i < currentStepIndex || step === 'done';
            const isActive = i === currentStepIndex;
            return (
              <React.Fragment key={s}>
                {i > 0 && <div className={`flex-1 h-px ${isDone ? 'bg-primary' : 'bg-border'}`} />}
                <div className={`flex items-center gap-2 text-sm font-medium whitespace-nowrap ${isActive ? 'text-primary' : isDone ? 'text-valid' : 'text-muted-foreground'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 flex-shrink-0 ${isActive ? 'border-primary bg-primary text-primary-foreground' : isDone ? 'border-valid bg-valid text-white' : 'border-border'}`}>
                    {isDone && s !== step ? <CheckCircle size={12} /> : i + 1}
                  </span>
                  <span className="hidden sm:inline">{STEP_LABELS[i]}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* ── Step: Upload ── */}
        {step === 'upload' && (
          <div className="card-surface p-8">
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ${
                isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-secondary/50'
              }`}
            >
              <div className="flex items-center justify-center gap-4 mb-4">
                <FileText size={36} className={isDragging ? 'text-primary' : 'text-muted-foreground/40'} />
                <span className="text-muted-foreground/30 text-2xl font-light">|</span>
                <FileSpreadsheet size={36} className={isDragging ? 'text-primary' : 'text-muted-foreground/40'} />
              </div>
              <p className="text-base font-semibold text-foreground mb-1">Drop your file here</p>
              <p className="text-sm text-muted-foreground mb-4">Supports CSV, XLSX, and XLS formats</p>
              <span className="btn-secondary text-sm pointer-events-none">Choose File</span>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
            </div>

            <div className="mt-6 p-4 bg-secondary/50 rounded-xl">
              <p className="text-xs font-semibold text-foreground mb-2">File Requirements</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• First row must be column headers — download a template above to get started</li>
                <li>• Required fields: <span className="font-mono text-foreground">holder_name, nationality, nationality_code, passport_number, date_of_birth, issue_date, expiry_date, issuing_country</span></li>
                <li>• Dates must be in <span className="font-mono text-foreground">YYYY-MM-DD</span> format</li>
                <li>• Sex field must be <span className="font-mono text-foreground">M</span> or <span className="font-mono text-foreground">F</span></li>
                <li>• Column names will be auto-detected and mapped — you can adjust them in the next step</li>
              </ul>
            </div>
          </div>
        )}

        {/* ── Step: Column Mapping ── */}
        {step === 'mapping' && (
          <div className="space-y-4">
            {/* File info */}
            <div className="card-surface p-4 flex items-center gap-3">
              <FileSpreadsheet size={18} className="text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{fileName}</p>
                <p className="text-xs text-muted-foreground">{rawRows.length} data rows · {fileHeaders.length} columns detected</p>
              </div>
              <button type="button" onClick={reset} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="card-surface overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                <Table2 size={16} className="text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Map File Columns to System Fields</h2>
                <span className="ml-auto text-xs text-muted-foreground">Auto-detected where possible</span>
              </div>

              <div className="divide-y divide-border">
                {SYSTEM_FIELDS.map(sysField => {
                  const mapped = columnMapping[sysField.key] || '';
                  const isMapped = !!mapped;
                  return (
                    <div key={sysField.key} className="px-5 py-3 flex items-center gap-4">
                      <div className="w-52 flex-shrink-0">
                        <p className="text-sm font-medium text-foreground">{sysField.label}</p>
                        <p className="text-xs font-mono text-muted-foreground">{sysField.key}</p>
                      </div>
                      <ArrowRight size={14} className="text-muted-foreground flex-shrink-0" />
                      <div className="flex-1">
                        <select
                          value={mapped}
                          onChange={e => setColumnMapping(prev => ({ ...prev, [sysField.key]: e.target.value }))}
                          className={`w-full text-sm rounded-lg px-3 py-2 border transition-colors bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary ${
                            isMapped ? 'border-primary/40' : sysField.required ? 'border-expired/40' : 'border-border'
                          }`}
                        >
                          <option value="">— not mapped —</option>
                          {fileHeaders.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-20 flex-shrink-0 text-right">
                        {sysField.required ? (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isMapped ? 'bg-valid/10 text-valid' : 'bg-expired/10 text-expired'}`}>
                            {isMapped ? 'Mapped' : 'Required'}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Optional</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Preview of first 3 rows */}
            {rawRows.length > 0 && (
              <div className="card-surface overflow-hidden">
                <div className="px-5 py-3 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">File Preview (first 3 rows)</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-max">
                    <thead className="bg-secondary">
                      <tr>
                        {fileHeaders.map(h => (
                          <th key={h} className="text-left px-3 py-2 text-muted-foreground font-semibold whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rawRows.slice(0, 3).map((row, ri) => (
                        <tr key={ri} className="border-t border-border">
                          {fileHeaders.map((h, ci) => (
                            <td key={ci} className="px-3 py-2 text-foreground whitespace-nowrap max-w-[160px] truncate">{row[ci] ?? ''}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={reset} className="btn-secondary">
                Cancel
              </button>
              <button type="button" onClick={applyMapping} className="btn-primary flex items-center gap-2">
                Apply Mapping & Validate
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Preview ── */}
        {(step === 'preview' || step === 'importing') && (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="card-surface p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{parsedRows.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Rows</p>
              </div>
              <div className="card-surface p-4 text-center">
                <p className="text-2xl font-bold text-valid">{validRows.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Ready to Import</p>
              </div>
              <div className="card-surface p-4 text-center">
                <p className="text-2xl font-bold text-expired">{invalidRows.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Rows with Errors</p>
              </div>
            </div>

            {/* File info */}
            <div className="card-surface p-4 flex items-center gap-3">
              <FileSpreadsheet size={18} className="text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{fileName}</p>
                <p className="text-xs text-muted-foreground">{parsedRows.length} data rows parsed</p>
              </div>
              {step === 'preview' && (
                <button
                  type="button"
                  onClick={() => setStep('mapping')}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <RefreshCw size={12} /> Re-map columns
                </button>
              )}
              {step === 'preview' && (
                <button type="button" onClick={reset} className="text-muted-foreground hover:text-foreground transition-colors ml-2">
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Error rows */}
            {invalidRows.length > 0 && (
              <div className="card-surface overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-expired/5 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-expired" />
                  <p className="text-sm font-semibold text-expired">{invalidRows.length} row{invalidRows.length > 1 ? 's' : ''} will be skipped due to errors</p>
                </div>
                <div className="divide-y divide-border max-h-48 overflow-y-auto">
                  {invalidRows.map(row => (
                    <div key={`err-row-${row.rowIndex}`} className="px-4 py-2.5">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between text-left"
                        onClick={() => setExpandedErrors(prev => {
                          const next = new Set(prev);
                          next.has(row.rowIndex) ? next.delete(row.rowIndex) : next.add(row.rowIndex);
                          return next;
                        })}
                      >
                        <span className="text-xs font-medium text-foreground">Row {row.rowIndex}: {row.raw['holder_name'] || '(unnamed)'}</span>
                        {expandedErrors.has(row.rowIndex) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                      {expandedErrors.has(row.rowIndex) && (
                        <ul className="mt-1.5 space-y-0.5">
                          {row.errors.map((e, i) => (
                            <li key={i} className="text-xs text-expired flex items-start gap-1.5">
                              <XCircle size={11} className="mt-0.5 flex-shrink-0" />
                              {e}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Valid rows preview */}
            {validRows.length > 0 && (
              <div className="card-surface overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <CheckCircle size={14} className="text-valid" />
                  <p className="text-sm font-semibold text-foreground">{validRows.length} records ready to import</p>
                </div>
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full min-w-[600px] text-xs">
                    <thead className="bg-secondary sticky top-0">
                      <tr>
                        <th className="text-left px-4 py-2 text-muted-foreground font-semibold">Row</th>
                        <th className="text-left px-4 py-2 text-muted-foreground font-semibold">Holder Name</th>
                        <th className="text-left px-4 py-2 text-muted-foreground font-semibold">Nationality</th>
                        <th className="text-left px-4 py-2 text-muted-foreground font-semibold">Passport No.</th>
                        <th className="text-left px-4 py-2 text-muted-foreground font-semibold">Expiry Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validRows.slice(0, 50).map(row => (
                        <tr key={`valid-${row.rowIndex}`} className="border-t border-border">
                          <td className="px-4 py-2 text-muted-foreground">{row.rowIndex}</td>
                          <td className="px-4 py-2 font-medium text-foreground">{row.raw['holder_name']}</td>
                          <td className="px-4 py-2 text-foreground">{row.raw['nationality_code']}</td>
                          <td className="px-4 py-2 font-mono text-foreground">{row.raw['passport_number']}</td>
                          <td className="px-4 py-2 text-foreground">{row.raw['expiry_date']}</td>
                        </tr>
                      ))}
                      {validRows.length > 50 && (
                        <tr className="border-t border-border">
                          <td colSpan={5} className="px-4 py-2 text-center text-muted-foreground">
                            +{validRows.length - 50} more rows not shown
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={reset} disabled={step === 'importing'} className="btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={validRows.length === 0 || step === 'importing'}
                className="btn-primary disabled:opacity-60 flex items-center gap-2"
              >
                {step === 'importing' ? (
                  <><Loader2 size={14} className="animate-spin" /> Importing...</>
                ) : (
                  <>Import {validRows.length} Record{validRows.length !== 1 ? 's' : ''}</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Done ── */}
        {step === 'done' && importResult && (
          <div className="card-surface p-8 text-center space-y-6">
            {importResult.success > 0 ? (
              <CheckCircle size={48} className="mx-auto text-valid" />
            ) : (
              <XCircle size={48} className="mx-auto text-expired" />
            )}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">Import Complete</h2>
              <p className="text-sm text-muted-foreground">
                {importResult.success} record{importResult.success !== 1 ? 's' : ''} imported successfully
                {importResult.failed > 0 && `, ${importResult.failed} failed`}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
              <div className="bg-valid/10 rounded-xl p-4">
                <p className="text-2xl font-bold text-valid">{importResult.success}</p>
                <p className="text-xs text-muted-foreground mt-1">Imported</p>
              </div>
              <div className="bg-expired/10 rounded-xl p-4">
                <p className="text-2xl font-bold text-expired">{importResult.failed}</p>
                <p className="text-xs text-muted-foreground mt-1">Failed</p>
              </div>
            </div>
            {importResult.errors.length > 0 && (
              <div className="text-left bg-secondary/50 rounded-xl p-4 max-h-40 overflow-y-auto">
                {importResult.errors.map((e, i) => (
                  <p key={i} className="text-xs text-expired">Row {e.row}: {e.message}</p>
                ))}
              </div>
            )}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button type="button" onClick={reset} className="btn-secondary">Import More</button>
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                className="btn-secondary flex items-center gap-2"
              >
                {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                Export All to Excel
              </button>
              <a href="/passport-records" className="btn-primary">View Records</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

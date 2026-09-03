'use client';
import React, { useState } from 'react';
import { Moon, Calendar, ArrowLeftRight, RefreshCw } from 'lucide-react';
import { gregorianToHijri } from '@/lib/hijri';

interface DateConversionsTabProps {
  dateOfBirth: string;
  issueDate: string;
  expiryDate: string;
}

const HIJRI_MONTHS = [
  'Muharram', 'Safar', "Rabi\' al-Awwal", "Rabi\' al-Thani",
  'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha\'ban",
  'Ramadan', 'Shawwal', "Dhu al-Qi\'dah", 'Dhu al-Hijjah',
];

const HIJRI_MONTHS_AR = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
  'جمادى الأولى', 'جمادى الثانية', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
];

function formatGregorianFull(iso: string): string {
  const d = new Date(iso);
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatGregorianShort(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

interface ConversionCardProps {
  label: string;
  gregorianISO: string;
  color: 'blue' | 'amber' | 'green';
}

function ConversionCard({ label, gregorianISO, color }: ConversionCardProps) {
  const hijri = gregorianToHijri(new Date(gregorianISO));
  const colorMap = {
    blue: 'border-blue-200 bg-blue-50',
    amber: 'border-amber-200 bg-amber-50',
    green: 'border-green-200 bg-green-50',
  };
  const headerMap = {
    blue: 'bg-blue-100 text-blue-800',
    amber: 'bg-amber-100 text-amber-800',
    green: 'bg-green-100 text-green-800',
  };

  return (
    <div className={`rounded-xl border-2 overflow-hidden ${colorMap[color]}`}>
      <div className={`px-4 py-2.5 ${headerMap[color]}`}>
        <p className="text-xs font-bold uppercase tracking-wider">{label}</p>
      </div>
      <div className="p-4 space-y-4">
        {/* Gregorian */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Calendar size={13} className="text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gregorian Calendar</span>
          </div>
          <p className="text-base font-bold text-foreground">{formatGregorianFull(gregorianISO)}</p>
          <p className="font-mono-data text-sm text-muted-foreground mt-0.5">{gregorianISO}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-border" />
          <ArrowLeftRight size={14} className="text-muted-foreground" />
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Hijri */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Moon size={13} className="text-accent" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hijri Calendar</span>
          </div>
          <p className="text-base font-bold text-foreground">{hijri.formatted}</p>
          <p className="text-sm text-muted-foreground mt-0.5" dir="rtl">{hijri.formattedAr}</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <div className="text-center bg-white/70 rounded-lg p-2">
              <p className="text-lg font-bold tabular-nums text-foreground">{hijri.day}</p>
              <p className="text-xs text-muted-foreground">Day</p>
            </div>
            <div className="text-center bg-white/70 rounded-lg p-2">
              <p className="text-xs font-bold text-foreground leading-tight">{hijri.monthName}</p>
              <p className="text-xs text-muted-foreground">Month {hijri.month}</p>
            </div>
            <div className="text-center bg-white/70 rounded-lg p-2">
              <p className="text-lg font-bold tabular-nums text-foreground">{hijri.year}</p>
              <p className="text-xs text-muted-foreground">AH</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DateConversionsTab({ dateOfBirth, issueDate, expiryDate }: DateConversionsTabProps) {
  const [customDate, setCustomDate] = useState('');
  const customHijri = customDate ? gregorianToHijri(new Date(customDate)) : null;

  return (
    <div className="space-y-6">
      {/* Passport Date Conversions */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Moon size={15} className="text-accent" />
          Passport Date Conversions — Gregorian ↔ Hijri
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-4">
          <ConversionCard label="Date of Birth" gregorianISO={dateOfBirth} color="blue" />
          <ConversionCard label="Issue Date" gregorianISO={issueDate} color="green" />
          <ConversionCard label="Expiry Date" gregorianISO={expiryDate} color="amber" />
        </div>
      </div>

      {/* Hijri Month Reference */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Calendar size={15} className="text-primary" />
          Hijri Month Reference
        </h3>
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">#</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Month (English)</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Month (Arabic)</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Significance</th>
              </tr>
            </thead>
            <tbody>
              {HIJRI_MONTHS.map((month, i) => {
                const expiryH = gregorianToHijri(new Date(expiryDate));
                const isExpiryMonth = expiryH.month === i + 1;
                const significance: Record<number, string> = {
                  1: 'Islamic New Year',
                  3: 'Birth of the Prophet',
                  7: 'Sacred month',
                  8: 'Month before Ramadan',
                  9: 'Ramadan — Fasting month',
                  10: 'Eid al-Fitr (1st)',
                  11: 'Sacred month',
                  12: 'Hajj — Eid al-Adha (10th)',
                };
                return (
                  <tr
                    key={`hijri-month-${i + 1}`}
                    className={`border-t border-border row-hover ${isExpiryMonth ? 'bg-accent/8' : ''}`}
                  >
                    <td className="px-4 py-2.5 font-mono-data text-xs text-muted-foreground">{String(i + 1).padStart(2, '0')}</td>
                    <td className="px-4 py-2.5 text-xs font-semibold text-foreground">
                      {month}
                      {isExpiryMonth && (
                        <span className="ml-2 text-xs font-medium text-accent bg-accent/15 px-1.5 py-0.5 rounded">
                          ← Expiry month
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-foreground" dir="rtl">{HIJRI_MONTHS_AR[i]}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{significance[i + 1] || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Date Converter */}
      <div className="card-surface p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <RefreshCw size={14} className="text-primary" />
          Custom Date Converter
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Convert any Gregorian date to its Hijri equivalent
        </p>
        <div className="flex items-end gap-4">
          <div className="flex-1 max-w-xs">
            <label className="form-label">Gregorian Date</label>
            <input
              type="date"
              value={customDate}
              onChange={e => setCustomDate(e.target.value)}
              className="form-input"
            />
          </div>
        </div>
        {customHijri && (
          <div className="mt-4 p-4 bg-primary/5 border border-primary/15 rounded-xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Day</p>
                <p className="text-2xl font-bold tabular-nums text-primary">{customHijri.day}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Month</p>
                <p className="text-sm font-bold text-primary leading-tight">{customHijri.monthName}</p>
                <p className="text-xs text-muted-foreground">#{customHijri.month}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Year (AH)</p>
                <p className="text-2xl font-bold tabular-nums text-primary">{customHijri.year}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Arabic</p>
                <p className="text-sm font-semibold text-primary" dir="rtl">{customHijri.formattedAr}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-primary/15 text-center">
              <p className="font-mono-data text-sm font-semibold text-primary">{customHijri.formatted}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
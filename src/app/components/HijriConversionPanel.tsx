'use client';
import React from 'react';
import { Moon, Calendar } from 'lucide-react';
import { gregorianToHijri } from '@/lib/hijri';

interface HijriConversionPanelProps {
  issueDate?: string;
  expiryDate?: string;
  dateOfBirth?: string;
}

interface DateRowProps {
  label: string;
  gregorian: string;
  hijri: string;
  hijriAr: string;
}

function DateRow({ label, gregorian, hijri, hijriAr }: DateRowProps) {
  return (
    <div className="py-3 border-b border-border last:border-0">
      <p className="text-xs text-muted-foreground font-medium mb-1.5">{label}</p>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar size={11} />
            Gregorian
          </span>
          <span className="text-xs font-semibold font-mono-data text-foreground">{gregorian}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Moon size={11} />
            Hijri
          </span>
          <span className="hijri-badge">{hijri}</span>
        </div>
        <div className="flex justify-end">
          <span className="text-xs text-muted-foreground font-mono-data" dir="rtl">{hijriAr}</span>
        </div>
      </div>
    </div>
  );
}

function formatGregorianDisplay(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export default function HijriConversionPanel({ issueDate, expiryDate, dateOfBirth }: HijriConversionPanelProps) {
  const hasAnyDate = issueDate || expiryDate || dateOfBirth;

  return (
    <div className="card-surface p-4">
      <div className="flex items-center gap-2 mb-3">
        <Moon size={15} className="text-accent" />
        <p className="section-header">Hijri Date Conversion</p>
      </div>

      {!hasAnyDate ? (
        <div className="text-center py-6">
          <Moon size={28} className="text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Enter dates in the form to see Hijri conversions</p>
        </div>
      ) : (
        <div>
          {dateOfBirth && (
            <DateRow
              label="Date of Birth"
              gregorian={formatGregorianDisplay(dateOfBirth)}
              hijri={gregorianToHijri(new Date(dateOfBirth)).formatted}
              hijriAr={gregorianToHijri(new Date(dateOfBirth)).formattedAr}
            />
          )}
          {issueDate && (
            <DateRow
              label="Issue Date"
              gregorian={formatGregorianDisplay(issueDate)}
              hijri={gregorianToHijri(new Date(issueDate)).formatted}
              hijriAr={gregorianToHijri(new Date(issueDate)).formattedAr}
            />
          )}
          {expiryDate && (
            <DateRow
              label="Expiry Date"
              gregorian={formatGregorianDisplay(expiryDate)}
              hijri={gregorianToHijri(new Date(expiryDate)).formatted}
              hijriAr={gregorianToHijri(new Date(expiryDate)).formattedAr}
            />
          )}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
          <span className="mt-0.5">ℹ</span>
          Uses Tabular Islamic Calendar (Kuwaiti algorithm). Dates may vary ±1 day from official observations.
        </p>
      </div>
    </div>
  );
}
'use client';
import React from 'react';
import { Shield } from 'lucide-react';

interface PassportCardPreviewProps {
  holderName?: string;
  passportNumber?: string;
  nationality?: string;
  expiryDate?: string;
  issueDate?: string;
  dateOfBirth?: string;
  sex?: string;
  issuingCountry?: string;
  mrzLine1?: string;
  mrzLine2?: string;
}

function formatDateShort(iso?: string): string {
  if (!iso) return '— — ——';
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day} ${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getMonth()]} ${year}`;
}

export default function PassportCardPreview({
  holderName, passportNumber, nationality, expiryDate,
  issueDate, dateOfBirth, sex, issuingCountry, mrzLine1, mrzLine2,
}: PassportCardPreviewProps) {
  const displayMrz1 = mrzLine1?.padEnd(44, '<').substring(0, 44) || 'P<XXX<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<';
  const displayMrz2 = mrzLine2?.padEnd(44, '<').substring(0, 44) || '<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<';

  return (
    <div className="card-surface p-4">
      <p className="section-header mb-3">Live Preview</p>
      <div className="passport-card p-5 text-white">
        {/* Header */}
        <div className="flex items-start justify-between mb-4 relative z-10">
          <div>
            <p className="text-xs text-slate-400 font-medium tracking-widest uppercase">
              {issuingCountry || 'XXX'} — PASSPORT
            </p>
            <p className="text-xs text-accent font-semibold mt-0.5">
              {issuingCountry === 'SAU' ? 'المملكة العربية السعودية' :
               issuingCountry === 'ARE' ? 'الإمارات العربية المتحدة' :
               issuingCountry === 'QAT'? 'دولة قطر' : issuingCountry ?'Official Travel Document' : '— — —'}
            </p>
          </div>
          <Shield size={22} className="text-accent/70" />
        </div>

        {/* Photo + Data */}
        <div className="flex gap-4 relative z-10">
          {/* Photo Placeholder */}
          <div className="w-16 h-20 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
            <div className="text-center">
              <div className="w-8 h-8 rounded-full bg-white/20 mx-auto mb-1" />
              <div className="w-10 h-2 rounded-full bg-white/10 mx-auto" />
            </div>
          </div>

          {/* Fields */}
          <div className="flex-1 space-y-2 min-w-0">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Surname / Given Names</p>
              <p className="text-sm font-semibold truncate text-white">
                {holderName || '— — — — — — — — — —'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Passport No.</p>
                <p className="text-xs font-bold font-mono-data text-accent">
                  {passportNumber || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Nationality</p>
                <p className="text-xs font-semibold font-mono-data">
                  {nationality || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Date of Birth</p>
                <p className="text-xs font-semibold font-mono-data">
                  {formatDateShort(dateOfBirth)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Sex</p>
                <p className="text-xs font-semibold">{sex || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Date of Issue</p>
                <p className="text-xs font-semibold font-mono-data">
                  {formatDateShort(issueDate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Date of Expiry</p>
                <p className="text-xs font-semibold font-mono-data text-accent">
                  {formatDateShort(expiryDate)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MRZ Zone */}
        <div className="mt-4 pt-3 border-t border-white/10 relative z-10">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Machine Readable Zone</p>
          <div className="space-y-1">
            <p className="font-mono-data text-xs text-slate-300 tracking-widest break-all leading-relaxed">
              {displayMrz1}
            </p>
            <p className="font-mono-data text-xs text-slate-300 tracking-widest break-all leading-relaxed">
              {displayMrz2}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
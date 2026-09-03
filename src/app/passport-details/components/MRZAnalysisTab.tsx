'use client';
import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { validateMRZCheckDigit } from '@/lib/hijri';
import type { PassportRecord } from '@/lib/passportData';

interface MRZAnalysisTabProps {
  passport: PassportRecord;
}

interface MRZField {
  id: string;
  label: string;
  position: string;
  raw: string;
  decoded: string;
  hasCheck: boolean;
  checkDigit?: string;
  checkData?: string;
  valid?: boolean;
}

export default function MRZAnalysisTab({ passport }: MRZAnalysisTabProps) {
  const l1 = passport.mrzLine1.padEnd(44, '<');
  const l2 = passport.mrzLine2.padEnd(44, '<');

  const pnCheckValid = validateMRZCheckDigit(l2.substring(0, 9), l2.substring(9, 10));
  const dobCheckValid = validateMRZCheckDigit(l2.substring(13, 19), l2.substring(19, 20));
  const expiryCheckValid = validateMRZCheckDigit(l2.substring(21, 27), l2.substring(27, 28));

  const line1Fields: MRZField[] = [
    {
      id: 'mrz-doc-type',
      label: 'Document Type',
      position: 'L1: 1–2',
      raw: l1.substring(0, 2),
      decoded: `${l1.substring(0, 1)} — Passport`,
      hasCheck: false,
    },
    {
      id: 'mrz-issuing-country',
      label: 'Issuing Country',
      position: 'L1: 3–5',
      raw: l1.substring(2, 5),
      decoded: l1.substring(2, 5),
      hasCheck: false,
    },
    {
      id: 'mrz-name',
      label: 'Name (Surname << Given Names)',
      position: 'L1: 6–44',
      raw: l1.substring(5, 44),
      decoded: l1.substring(5, 44).replace('<<', ' / ').replace(/</g, ' ').trim(),
      hasCheck: false,
    },
  ];

  const line2Fields: MRZField[] = [
    {
      id: 'mrz-passport-no',
      label: 'Passport Number',
      position: 'L2: 1–9',
      raw: l2.substring(0, 9),
      decoded: l2.substring(0, 9).replace(/</g, ''),
      hasCheck: true,
      checkDigit: l2.substring(9, 10),
      checkData: l2.substring(0, 9),
      valid: pnCheckValid,
    },
    {
      id: 'mrz-nationality',
      label: 'Nationality Code',
      position: 'L2: 11–13',
      raw: l2.substring(10, 13),
      decoded: l2.substring(10, 13),
      hasCheck: false,
    },
    {
      id: 'mrz-dob',
      label: 'Date of Birth (YYMMDD)',
      position: 'L2: 14–19',
      raw: l2.substring(13, 19),
      decoded: `${l2.substring(17, 19)}/${l2.substring(15, 17)}/19${l2.substring(13, 15)}`,
      hasCheck: true,
      checkDigit: l2.substring(19, 20),
      checkData: l2.substring(13, 19),
      valid: dobCheckValid,
    },
    {
      id: 'mrz-sex',
      label: 'Sex',
      position: 'L2: 21',
      raw: l2.substring(20, 21),
      decoded: l2.substring(20, 21) === 'M' ? 'Male' : l2.substring(20, 21) === 'F' ? 'Female' : 'Unspecified',
      hasCheck: false,
    },
    {
      id: 'mrz-expiry',
      label: 'Expiry Date (YYMMDD)',
      position: 'L2: 22–27',
      raw: l2.substring(21, 27),
      decoded: `${l2.substring(25, 27)}/${l2.substring(23, 25)}/20${l2.substring(21, 23)}`,
      hasCheck: true,
      checkDigit: l2.substring(27, 28),
      checkData: l2.substring(21, 27),
      valid: expiryCheckValid,
    },
    {
      id: 'mrz-personal',
      label: 'Personal Number',
      position: 'L2: 29–42',
      raw: l2.substring(28, 42),
      decoded: l2.substring(28, 42).replace(/</g, '') || 'Not provided',
      hasCheck: false,
    },
  ];

  function CheckBadge({ valid }: { valid: boolean }) {
    return valid ? (
      <span className="flex items-center gap-1 text-xs font-medium text-valid bg-valid/10 px-2 py-0.5 rounded-full">
        <CheckCircle size={11} /> Valid
      </span>
    ) : (
      <span className="flex items-center gap-1 text-xs font-medium text-expired bg-expired/10 px-2 py-0.5 rounded-full">
        <XCircle size={11} /> Invalid
      </span>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall MRZ Status */}
      <div className={`flex items-center gap-3 p-4 rounded-lg border ${
        passport.mrzValid
          ? 'bg-valid/8 border-valid/25' :'bg-expired/8 border-expired/25'
      }`}>
        {passport.mrzValid ? (
          <CheckCircle size={20} className="text-valid flex-shrink-0" />
        ) : (
          <AlertTriangle size={20} className="text-expired flex-shrink-0" />
        )}
        <div>
          <p className={`text-sm font-semibold ${passport.mrzValid ? 'text-valid' : 'text-expired'}`}>
            {passport.mrzValid ? 'MRZ Integrity Verified — All check digits match' : 'MRZ Integrity Warning — One or more check digits failed'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            TD3 format (2 × 44 characters) — ICAO Doc 9303 compliant
          </p>
        </div>
      </div>

      {/* Raw MRZ Display */}
      <div>
        <p className="section-header mb-2">Raw MRZ Data</p>
        <div className="bg-primary rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-6 flex-shrink-0">L1</span>
            <p className="mrz-line flex-1 bg-white/5 border-white/10 text-slate-200">{l1}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-6 flex-shrink-0">L2</span>
            <p className="mrz-line flex-1 bg-white/5 border-white/10 text-slate-200">{l2}</p>
          </div>
        </div>
      </div>

      {/* Line 1 Fields */}
      <div>
        <p className="section-header mb-3">Line 1 — Document & Holder Identity</p>
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Field</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Position</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Raw Value</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Decoded</th>
              </tr>
            </thead>
            <tbody>
              {line1Fields.map((field) => (
                <tr key={field.id} className="border-t border-border row-hover">
                  <td className="px-4 py-3 text-xs font-medium text-foreground">{field.label}</td>
                  <td className="px-4 py-3 font-mono-data text-xs text-muted-foreground">{field.position}</td>
                  <td className="px-4 py-3 font-mono-data text-xs text-foreground max-w-xs truncate">{field.raw}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-foreground max-w-xs truncate">{field.decoded}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Line 2 Fields */}
      <div>
        <p className="section-header mb-3">Line 2 — Document Details & Check Digits</p>
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Field</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Position</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Raw Value</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Decoded</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Check Digit</th>
              </tr>
            </thead>
            <tbody>
              {line2Fields.map((field) => (
                <tr key={field.id} className="border-t border-border row-hover">
                  <td className="px-4 py-3 text-xs font-medium text-foreground">{field.label}</td>
                  <td className="px-4 py-3 font-mono-data text-xs text-muted-foreground">{field.position}</td>
                  <td className="px-4 py-3 font-mono-data text-xs text-foreground">{field.raw}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-foreground">{field.decoded}</td>
                  <td className="px-4 py-3">
                    {field.hasCheck && field.valid !== undefined ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono-data text-xs font-bold text-foreground">{field.checkDigit}</span>
                        <CheckBadge valid={field.valid} />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 bg-secondary rounded-lg">
        <Info size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          Check digit validation uses the ICAO Doc 9303 weighted modulo-10 algorithm (weights 7, 3, 1).
          A failed check digit indicates possible data corruption or transcription error — verify against the physical document.
        </p>
      </div>
    </div>
  );
}
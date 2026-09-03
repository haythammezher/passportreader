'use client';
import React, { useState } from 'react';
import { ScanLine, AlertCircle, CheckCircle, ArrowRight, Info, Zap } from 'lucide-react';
import { parseMRZDate, validateMRZCheckDigit, formatDateISO } from '@/lib/hijri';
import type { PassportFormData } from './PassportScannerContent';

interface MRZParserPanelProps {
  onParsed: (data: Partial<PassportFormData>) => void;
}

interface ParsedField {
  label: string;
  raw: string;
  parsed: string;
  valid?: boolean;
}

export default function MRZParserPanel({ onParsed }: MRZParserPanelProps) {
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [parseResult, setParseResult] = useState<ParsedField[] | null>(null);
  const [parseError, setParseError] = useState('');

  const SAMPLE_MRZ = {
    line1: 'P<SAUALMRASHIDI<<MOHAMMED<<<<<<<<<<<<<<<<<<<<',
    line2: 'A123456781SAU8503142M3006094<<<<<<<<<<<<<<<2',
  };

  const parseMRZ = () => {
    setParseError('');
    const l1 = line1.trim().toUpperCase();
    const l2 = line2.trim().toUpperCase();

    if (l1.length !== 44 || l2.length !== 44) {
      setParseError(`Both MRZ lines must be exactly 44 characters. Line 1: ${l1.length} chars, Line 2: ${l2.length} chars.`);
      return;
    }

    try {
      // Line 1 parsing
      const docType = l1.substring(0, 2).replace('<', '');
      const issuingCountry = l1.substring(2, 5);
      const namePart = l1.substring(5, 44);
      const nameSplit = namePart.split('<<');
      const surname = (nameSplit[0] || '').replace(/</g, ' ').trim();
      const givenNames = (nameSplit[1] || '').replace(/</g, ' ').trim();
      const fullName = `${surname} ${givenNames}`.trim();

      // Line 2 parsing
      const passportNumber = l2.substring(0, 9).replace(/</g, '');
      const pnCheckDigit = l2.substring(9, 10);
      const nationality = l2.substring(10, 13);
      const dobRaw = l2.substring(13, 19);
      const dobCheck = l2.substring(19, 20);
      const sex = l2.substring(20, 21);
      const expiryRaw = l2.substring(21, 27);
      const expiryCheck = l2.substring(27, 28);
      const personalNumber = l2.substring(28, 42).replace(/</g, '');
      const compositeCheck = l2.substring(43, 44);

      const dobDate = parseMRZDate(dobRaw);
      const expiryDate = parseMRZDate(expiryRaw);

      const pnValid = validateMRZCheckDigit(l2.substring(0, 9), pnCheckDigit);
      const dobValid = validateMRZCheckDigit(dobRaw, dobCheck);
      const expiryValid = validateMRZCheckDigit(expiryRaw, expiryCheck);

      const fields: ParsedField[] = [
        { label: 'Document Type', raw: docType, parsed: docType === 'P' ? 'P — Passport' : docType },
        { label: 'Issuing Country', raw: issuingCountry, parsed: issuingCountry },
        { label: 'Full Name', raw: namePart.substring(0, 30) + '...', parsed: fullName },
        { label: 'Passport Number', raw: l2.substring(0, 9), parsed: passportNumber, valid: pnValid },
        { label: 'Nationality', raw: nationality, parsed: nationality },
        { label: 'Date of Birth', raw: dobRaw, parsed: dobDate ? `${String(dobDate.getDate()).padStart(2,'0')}/${String(dobDate.getMonth()+1).padStart(2,'0')}/${dobDate.getFullYear()}` : 'Invalid', valid: dobValid },
        { label: 'Sex', raw: sex, parsed: sex === 'M' ? 'Male' : sex === 'F' ? 'Female' : 'Unspecified' },
        { label: 'Expiry Date', raw: expiryRaw, parsed: expiryDate ? `${String(expiryDate.getDate()).padStart(2,'0')}/${String(expiryDate.getMonth()+1).padStart(2,'0')}/${expiryDate.getFullYear()}` : 'Invalid', valid: expiryValid },
        { label: 'Personal Number', raw: personalNumber || '—', parsed: personalNumber || 'Not provided' },
      ];

      setParseResult(fields);

      // Build form data
      const formData: Partial<PassportFormData> = {
        documentType: docType,
        issuingCountry,
        holderName: fullName,
        passportNumber,
        nationality,
        sex: sex === 'M' ? 'M' : sex === 'F' ? 'F' : 'X',
        dateOfBirth: dobDate ? formatDateISO(dobDate) : '',
        expiryDate: expiryDate ? formatDateISO(expiryDate) : '',
        personalNumber,
        mrzLine1: l1,
        mrzLine2: l2,
      };

      onParsed(formData);
    } catch {
      setParseError('Failed to parse MRZ data. Ensure both lines are valid TD3 format.');
    }
  };

  const loadSample = () => {
    setLine1(SAMPLE_MRZ.line1);
    setLine2(SAMPLE_MRZ.line2);
    setParseResult(null);
    setParseError('');
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Input Panel */}
      <div className="card-surface p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ScanLine size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">MRZ Input</h2>
          </div>
          <button
            type="button"
            onClick={loadSample}
            className="text-xs text-accent font-medium hover:underline flex items-center gap-1"
          >
            <Zap size={11} />
            Load Sample
          </button>
        </div>

        <div className="bg-primary/5 border border-primary/15 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <Info size={13} className="text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-primary/80">
              Enter the two lines from the Machine Readable Zone at the bottom of the passport photo page.
              Each line must be exactly 44 characters (TD3 format).
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="form-label">MRZ Line 1</label>
            <textarea
              value={line1}
              onChange={e => {
                setLine1(e.target.value.toUpperCase().replace(/\s/g, ''));
                setParseResult(null);
              }}
              rows={2}
              maxLength={44}
              className="mrz-line w-full resize-none"
              placeholder="P<SAUALMRASHIDI<<MOHAMMED<<<<<<<<<<<<<<<<<<<<"
            />
            <div className="flex justify-between mt-1">
              <span className={`text-xs font-mono-data ${line1.length === 44 ? 'text-valid' : 'text-muted-foreground'}`}>
                {line1.length}/44 chars
              </span>
              {line1.length === 44 && <CheckCircle size={12} className="text-valid mt-0.5" />}
            </div>
          </div>

          <div>
            <label className="form-label">MRZ Line 2</label>
            <textarea
              value={line2}
              onChange={e => {
                setLine2(e.target.value.toUpperCase().replace(/\s/g, ''));
                setParseResult(null);
              }}
              rows={2}
              maxLength={44}
              className="mrz-line w-full resize-none"
              placeholder="A123456781SAU8503142M3006094<<<<<<<<<<<<<<<2"
            />
            <div className="flex justify-between mt-1">
              <span className={`text-xs font-mono-data ${line2.length === 44 ? 'text-valid' : 'text-muted-foreground'}`}>
                {line2.length}/44 chars
              </span>
              {line2.length === 44 && <CheckCircle size={12} className="text-valid mt-0.5" />}
            </div>
          </div>
        </div>

        {parseError && (
          <div className="mt-3 p-3 bg-expired/8 border border-expired/25 rounded-lg flex items-start gap-2">
            <AlertCircle size={14} className="text-expired flex-shrink-0 mt-0.5" />
            <p className="text-xs text-expired">{parseError}</p>
          </div>
        )}

        <button
          type="button"
          onClick={parseMRZ}
          disabled={line1.length !== 44 || line2.length !== 44}
          className="btn-primary w-full mt-4 justify-center"
        >
          <ScanLine size={15} />
          Parse MRZ Data
        </button>
      </div>

      {/* Results Panel */}
      <div className="card-surface p-5">
        <div className="flex items-center gap-2 mb-4">
          <ArrowRight size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Parsed Fields</h2>
        </div>

        {!parseResult ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <ScanLine size={36} className="text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              Enter MRZ lines and click Parse to extract passport fields
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Check digits will be validated automatically
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {parseResult.map((field, i) => (
              <div
                key={`parsed-field-${i}`}
                className="flex items-start justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{field.label}</p>
                  <p className="text-sm font-semibold text-foreground truncate">{field.parsed}</p>
                  <p className="font-mono-data text-xs text-muted-foreground/60 truncate">{field.raw}</p>
                </div>
                {field.valid !== undefined && (
                  <div className="ml-3 flex-shrink-0">
                    {field.valid ? (
                      <div className="flex items-center gap-1 text-valid">
                        <CheckCircle size={13} />
                        <span className="text-xs font-medium">✓ Check</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-expired">
                        <AlertCircle size={13} />
                        <span className="text-xs font-medium">✗ Check</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div className="pt-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CheckCircle size={11} className="text-valid" />
                Fields auto-filled in the Manual Entry form
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
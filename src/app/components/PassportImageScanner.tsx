'use client';
import React, { useState, useRef, useCallback } from 'react';
import { Upload, ScanLine, AlertCircle, CheckCircle2, RefreshCw, ImageIcon, Info, Loader2, X, Sparkles } from 'lucide-react';
import { PassportFormData } from './PassportScannerContent';

interface PassportImageScannerProps {
  onFieldsExtracted: (fields: Partial<PassportFormData>) => void;
}

interface ScanResult {
  confidence: 'high' | 'medium' | 'low';
  field: keyof PassportFormData;
  label: string;
  value: string;
}

const FIELD_LABELS: Partial<Record<keyof PassportFormData, string>> = {
  documentType: 'Document Type',
  issuingCountry: 'Issuing Country',
  holderName: 'Holder Name',
  passportNumber: 'Passport Number',
  nationality: 'Nationality',
  dateOfBirth: 'Date of Birth',
  sex: 'Sex',
  expiryDate: 'Expiry Date',
  issueDate: 'Issue Date',
  placeOfBirth: 'Place of Birth',
  issuingAuthority: 'Issuing Authority',
  personalNumber: 'Personal Number',
  mrzLine1: 'MRZ Line 1',
  mrzLine2: 'MRZ Line 2',
};

async function fileToBase64DataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
}

export default function PassportImageScanner({ onFieldsExtracted }: PassportImageScannerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [mrzDetected, setMrzDetected] = useState(false);
  const [scanDone, setScanDone] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [extractedFields, setExtractedFields] = useState<Partial<PassportFormData>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = useCallback(async (file: File) => {
    setIsScanning(true);
    setScanDone(false);
    setScanResults([]);
    setMrzDetected(false);
    setScanError(null);

    const url = URL.createObjectURL(file);
    setImageUrl(url);

    try {
      // Convert image to base64 data URI
      const imageBase64 = await fileToBase64DataUri(file);

      // Call AI-powered passport scan API
      const response = await fetch('/api/passport-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Scan failed');
      }

      const fields: Partial<PassportFormData> = data.fields || {};

      // Build scan results for display
      const results: ScanResult[] = [];
      for (const [key, value] of Object.entries(fields)) {
        if (value && FIELD_LABELS[key as keyof PassportFormData]) {
          const isMrz = key === 'mrzLine1' || key === 'mrzLine2';
          results.push({
            field: key as keyof PassportFormData,
            label: FIELD_LABELS[key as keyof PassportFormData]!,
            value: isMrz ? `${String(value).substring(0, 20)}…` : String(value),
            confidence: 'high',
          });
        }
      }

      // Detect MRZ
      if (fields.mrzLine1 || fields.mrzLine2) {
        setMrzDetected(true);
      }

      setScanResults(results);
      setExtractedFields(fields);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Scan failed';
      setScanError(message);
    } finally {
      setIsScanning(false);
      setScanDone(true);
    }
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    setImageFile(file);
    processImage(file);
  }, [processImage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleApplyFields = () => {
    onFieldsExtracted(extractedFields);
  };

  const handleReset = () => {
    setImageFile(null);
    setImageUrl(null);
    setScanResults([]);
    setScanDone(false);
    setMrzDetected(false);
    setExtractedFields({});
    setScanError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confidenceColor = (c: ScanResult['confidence']) => {
    if (c === 'high') return 'text-valid bg-valid/10 border-valid/20';
    if (c === 'medium') return 'text-expiring bg-expiring/10 border-expiring/20';
    return 'text-expired bg-expired/10 border-expired/20';
  };

  const confidenceIcon = (c: ScanResult['confidence']) => {
    if (c === 'high') return <CheckCircle2 size={12} className="text-valid" />;
    if (c === 'medium') return <AlertCircle size={12} className="text-expiring" />;
    return <AlertCircle size={12} className="text-expired" />;
  };

  return (
    <div className="space-y-5">
      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <Sparkles size={16} className="text-primary mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">AI-Powered Passport Scan</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload a passport image and our AI will automatically extract all visible fields including MRZ data.
            For best results, use a clear, well-lit scan with all text visible.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Upload Zone */}
        <div>
          {!imageUrl ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200 min-h-[280px] ${
                isDragging
                  ? 'border-primary bg-primary/5 scale-[1.01]'
                  : 'border-border hover:border-primary/50 hover:bg-primary/3 bg-card'
              }`}
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${isDragging ? 'bg-primary/15' : 'bg-muted'}`}>
                <Upload size={28} className={isDragging ? 'text-primary' : 'text-muted-foreground'} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Drop passport image here</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse files</p>
                <p className="text-xs text-muted-foreground mt-2">Supports JPG, PNG, WEBP</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleInputChange}
              />
            </div>
          ) : (
            <div className="card-surface overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <ImageIcon size={15} className="text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground truncate max-w-[180px]">{imageFile?.name}</span>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="relative bg-muted/30 flex items-center justify-center min-h-[220px] p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Uploaded passport scan"
                  className="max-h-[220px] max-w-full object-contain rounded-md shadow-sm"
                />
                {isScanning && (
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 rounded-md">
                    <div className="relative">
                      <ScanLine size={32} className="text-primary animate-pulse" />
                      <div className="absolute inset-0 border-2 border-primary/40 rounded animate-ping" />
                    </div>
                    <p className="text-sm font-medium text-foreground">AI scanning passport...</p>
                    <div className="w-40 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full animate-[scan_1.4s_ease-in-out_infinite]" style={{ width: '60%' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Scan Results */}
        <div className="space-y-4">
          {!scanDone && !isScanning && (
            <div className="card-surface p-6 flex flex-col items-center justify-center gap-3 min-h-[280px] text-center">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                <ScanLine size={22} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No image scanned yet</p>
              <p className="text-xs text-muted-foreground">Upload a passport image to begin AI extraction</p>
            </div>
          )}

          {isScanning && (
            <div className="card-surface p-6 flex flex-col items-center justify-center gap-3 min-h-[280px]">
              <Loader2 size={28} className="text-primary animate-spin" />
              <p className="text-sm font-medium text-foreground">AI is reading your passport...</p>
              <p className="text-xs text-muted-foreground">Extracting all visible fields</p>
            </div>
          )}

          {scanDone && scanError && (
            <div className="card-surface p-5 space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-expired" />
                <span className="text-sm font-semibold text-foreground">Scan Failed</span>
              </div>
              <div className="bg-expired/8 border border-expired/20 rounded-lg p-3">
                <p className="text-xs text-expired">{scanError}</p>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="btn-secondary w-full justify-center"
              >
                <RefreshCw size={14} />
                Try Again
              </button>
            </div>
          )}

          {scanDone && !scanError && (
            <div className="card-surface p-5 space-y-4">
              {/* Scan Summary */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-valid" />
                  <span className="text-sm font-semibold text-foreground">Scan Complete</span>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RefreshCw size={12} />
                  Rescan
                </button>
              </div>

              {/* MRZ Detection Status */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border ${
                mrzDetected
                  ? 'bg-valid/8 border-valid/20 text-valid' :'bg-muted border-border text-muted-foreground'
              }`}>
                <ScanLine size={13} />
                {mrzDetected
                  ? 'MRZ data extracted from image' :'No MRZ detected — visual fields extracted only'}
              </div>

              {/* Extracted Fields */}
              {scanResults.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Extracted Fields ({scanResults.length})
                  </p>
                  <div className="max-h-[240px] overflow-y-auto space-y-1.5 pr-1">
                    {scanResults.map((r, i) => (
                      <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${confidenceColor(r.confidence)}`}>
                        <div className="flex items-center gap-2">
                          {confidenceIcon(r.confidence)}
                          <span className="font-medium">{r.label}</span>
                        </div>
                        <span className="font-mono font-semibold truncate max-w-[120px]">{r.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-muted-foreground">No fields could be extracted from this image.</p>
                  <p className="text-xs text-muted-foreground mt-1">Please ensure the image is clear and try again, or fill in the form manually.</p>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                <p className="text-xs font-semibold text-foreground">Next Steps</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li className="flex items-start gap-1.5">
                    <span className="text-primary font-bold mt-0.5">1.</span>
                    Click "Apply to Form" to pre-fill all detected fields
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-primary font-bold mt-0.5">2.</span>
                    Switch to "Manual Entry" tab to review and complete remaining fields
                  </li>
                </ul>
              </div>

              {/* Apply Button */}
              {scanResults.length > 0 && (
                <button
                  type="button"
                  onClick={handleApplyFields}
                  className="btn-primary w-full justify-center"
                >
                  <CheckCircle2 size={15} />
                  Apply to Form
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

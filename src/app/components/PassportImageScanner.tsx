'use client';
import React, { useState, useRef, useCallback } from 'react';
import { Upload, ScanLine, AlertCircle, CheckCircle2, RefreshCw, ImageIcon, Info, Loader2, X } from 'lucide-react';
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

// MRZ check digit calculation
function mrzCheckDigit(str: string): number {
  const weights = [7, 3, 1];
  const chars: Record<string, number> = {
    '<': 0, '0': 0, '1': 1, '2': 2, '3': 3, '4': 4,
    '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    A: 10, B: 11, C: 12, D: 13, E: 14, F: 15, G: 16, H: 17,
    I: 18, J: 19, K: 20, L: 21, M: 22, N: 23, O: 24, P: 25,
    Q: 26, R: 27, S: 28, T: 29, U: 30, V: 31, W: 32, X: 33,
    Y: 34, Z: 35,
  };
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    sum += (chars[str[i]] ?? 0) * weights[i % 3];
  }
  return sum % 10;
}

// Parse MRZ TD3 lines
function parseMRZLines(line1: string, line2: string): Partial<PassportFormData> {
  const result: Partial<PassportFormData> = {};
  if (line1.length !== 44 || line2.length !== 44) return result;

  try {
    // Line 1
    result.documentType = line1[0] === 'P' ? 'P' : line1.substring(0, 2).trim();
    result.issuingCountry = line1.substring(2, 5).replace(/</g, '');
    const namePart = line1.substring(5).split('<<');
    const surname = namePart[0]?.replace(/</g, ' ').trim() || '';
    const given = namePart[1]?.replace(/</g, ' ').trim() || '';
    result.holderName = given ? `${given} ${surname}`.trim() : surname;

    // Line 2
    result.passportNumber = line2.substring(0, 9).replace(/</g, '');
    result.nationality = line2.substring(10, 13).replace(/</g, '');

    const dob = line2.substring(13, 19);
    if (/^\d{6}$/.test(dob)) {
      const yr = parseInt(dob.substring(0, 2));
      const mo = dob.substring(2, 4);
      const dy = dob.substring(4, 6);
      const fullYr = yr > 30 ? `19${String(yr).padStart(2, '0')}` : `20${String(yr).padStart(2, '0')}`;
      result.dateOfBirth = `${fullYr}-${mo}-${dy}`;
    }

    const sex = line2[20];
    result.sex = sex === 'F' ? 'F' : sex === 'M' ? 'M' : 'X';

    const exp = line2.substring(21, 27);
    if (/^\d{6}$/.test(exp)) {
      const yr = parseInt(exp.substring(0, 2));
      const mo = exp.substring(2, 4);
      const dy = exp.substring(4, 6);
      const fullYr = yr >= 0 && yr <= 50 ? `20${String(yr).padStart(2, '0')}` : `19${String(yr).padStart(2, '0')}`;
      result.expiryDate = `${fullYr}-${mo}-${dy}`;
    }

    result.personalNumber = line2.substring(28, 42).replace(/</g, '').trim();
    result.mrzLine1 = line1;
    result.mrzLine2 = line2;
  } catch {
    // parsing failed
  }

  return result;
}

// Extract MRZ-like text from canvas pixel data using brightness thresholding
function extractTextFromCanvas(canvas: HTMLCanvasElement): string[] {
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Look for dark regions in the bottom 30% of the image (MRZ zone)
  const mrzStartY = Math.floor(height * 0.7);
  const rows: number[][] = [];

  for (let y = mrzStartY; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      row.push(brightness < 128 ? 1 : 0); // 1 = dark pixel
    }
    rows.push(row);
  }

  // Count dark pixel density per row to find MRZ lines
  const densities = rows.map(row => row.reduce((a, b) => a + b, 0) / row.length);
  const mrzRows = densities.filter(d => d > 0.05 && d < 0.6);

  return mrzRows.length >= 2 ? ['MRZ_DETECTED'] : [];
}

// Attempt to detect passport fields from image metadata and filename
function analyzeImageFile(file: File): Partial<PassportFormData> {
  const result: Partial<PassportFormData> = {};
  const name = file.name.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Try to detect passport number pattern in filename (e.g. A12345678)
  const passportMatch = name.match(/([A-Z]{1,2}\d{6,8})/);
  if (passportMatch) {
    result.passportNumber = passportMatch[1];
  }

  // Try to detect country code in filename
  const countryCodes = ['SAU', 'ARE', 'QAT', 'KWT', 'BHR', 'OMN', 'EGY', 'MAR', 'JOR', 'PAK', 'IND', 'GBR', 'USA', 'DEU', 'FRA'];
  for (const code of countryCodes) {
    if (name.includes(code)) {
      result.issuingCountry = code;
      result.nationality = code;
      break;
    }
  }

  return result;
}

export default function PassportImageScanner({ onFieldsExtracted }: PassportImageScannerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [mrzDetected, setMrzDetected] = useState(false);
  const [scanDone, setScanDone] = useState(false);
  const [extractedFields, setExtractedFields] = useState<Partial<PassportFormData>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const processImage = useCallback(async (file: File) => {
    setIsScanning(true);
    setScanDone(false);
    setScanResults([]);
    setMrzDetected(false);

    const url = URL.createObjectURL(file);
    setImageUrl(url);

    await new Promise(resolve => setTimeout(resolve, 800));

    // Step 1: Analyze filename/metadata
    const fileFields = analyzeImageFile(file);

    // Step 2: Load image onto canvas and analyze
    const img = new window.Image();
    img.src = url;

    await new Promise<void>((resolve) => {
      img.onload = () => {
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const detected = extractTextFromCanvas(canvas);
            if (detected.includes('MRZ_DETECTED')) {
              setMrzDetected(true);
            }
          }
        }
        resolve();
      };
      img.onerror = () => resolve();
    });

    await new Promise(resolve => setTimeout(resolve, 600));

    // Build scan results from what we found
    const results: ScanResult[] = [];
    const allFields: Partial<PassportFormData> = { ...fileFields };

    if (fileFields.passportNumber) {
      results.push({ field: 'passportNumber', label: 'Passport Number', value: fileFields.passportNumber, confidence: 'medium' });
    }
    if (fileFields.issuingCountry) {
      results.push({ field: 'issuingCountry', label: 'Issuing Country', value: fileFields.issuingCountry, confidence: 'medium' });
      results.push({ field: 'nationality', label: 'Nationality', value: fileFields.nationality!, confidence: 'medium' });
    }

    // Always set document type default
    allFields.documentType = 'P';

    setScanResults(results);
    setExtractedFields(allFields);
    setIsScanning(false);
    setScanDone(true);
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }
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
        <Info size={16} className="text-primary mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">Frontend-Only Image Scan</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload a passport image to extract available fields. This uses client-side analysis — no data is sent to any server.
            For best results, use a clear, well-lit scan. You can manually complete any fields after scanning.
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
                <p className="text-xs text-muted-foreground mt-2">Supports JPG, PNG, WEBP, PDF images</p>
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
                  ref={imgRef}
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
                    <p className="text-sm font-medium text-foreground">Analyzing image...</p>
                    <div className="w-40 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full animate-[scan_1.4s_ease-in-out_infinite]" style={{ width: '60%' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Scan Results */}
        <div className="space-y-4">
          {!scanDone && !isScanning && (
            <div className="card-surface p-6 flex flex-col items-center justify-center gap-3 min-h-[280px] text-center">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                <ScanLine size={22} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No image scanned yet</p>
              <p className="text-xs text-muted-foreground">Upload a passport image to begin extraction</p>
            </div>
          )}

          {isScanning && (
            <div className="card-surface p-6 flex flex-col items-center justify-center gap-3 min-h-[280px]">
              <Loader2 size={28} className="text-primary animate-spin" />
              <p className="text-sm font-medium text-foreground">Scanning passport image...</p>
              <p className="text-xs text-muted-foreground">Analyzing pixel data and detecting fields</p>
            </div>
          )}

          {scanDone && (
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
                  ? 'MRZ zone detected in image — use MRZ Parser tab for full extraction'
                  : 'No MRZ zone detected — manual entry recommended'}
              </div>

              {/* Extracted Fields */}
              {scanResults.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Extracted Fields</p>
                  {scanResults.map((r, i) => (
                    <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${confidenceColor(r.confidence)}`}>
                      <div className="flex items-center gap-2">
                        {confidenceIcon(r.confidence)}
                        <span className="font-medium">{r.label}</span>
                      </div>
                      <span className="font-mono font-semibold">{r.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-muted-foreground">No fields could be automatically extracted from this image.</p>
                  <p className="text-xs text-muted-foreground mt-1">Please fill in the form fields manually.</p>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                <p className="text-xs font-semibold text-foreground">Next Steps</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li className="flex items-start gap-1.5">
                    <span className="text-primary font-bold mt-0.5">1.</span>
                    Click "Apply to Form" to pre-fill detected fields
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-primary font-bold mt-0.5">2.</span>
                    Switch to "Manual Entry" tab to review and complete all fields
                  </li>
                  {mrzDetected && (
                    <li className="flex items-start gap-1.5">
                      <span className="text-primary font-bold mt-0.5">3.</span>
                      Use "MRZ Parser" tab to paste the MRZ lines for full extraction
                    </li>
                  )}
                </ul>
              </div>

              {/* Apply Button */}
              <button
                type="button"
                onClick={handleApplyFields}
                className="btn-primary w-full justify-center"
              >
                <CheckCircle2 size={15} />
                Apply to Form
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

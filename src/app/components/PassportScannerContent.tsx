'use client';
import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { ScanLine, Upload, RefreshCw, Save, AlertCircle, FileText, Info, Loader2, Trash2,  } from 'lucide-react';
import { toast } from 'sonner';
import { gregorianToHijri, calculateDaysRemaining, getPassportStatus, formatDateDisplay,  } from '@/lib/hijri';
import { passportService } from '@/lib/services/passportService';
import StatusBadge from '@/components/ui/StatusBadge';
import PassportCardPreview from './PassportCardPreview';
import HijriConversionPanel from './HijriConversionPanel';
import MRZParserPanel from './MRZParserPanel';
import PassportImageScanner from './PassportImageScanner';

export interface PassportFormData {
  documentType: string;
  issuingCountry: string;
  holderName: string;
  passportNumber: string;
  nationality: string;
  dateOfBirth: string;
  sex: string;
  expiryDate: string;
  issueDate: string;
  placeOfBirth: string;
  issuingAuthority: string;
  personalNumber: string;
  mrzLine1: string;
  mrzLine2: string;
  notes: string;
}

const COUNTRIES = [
  { code: 'AFG', name: 'Afghanistan' },
  { code: 'ALB', name: 'Albania' },
  { code: 'DZA', name: 'Algeria' },
  { code: 'AND', name: 'Andorra' },
  { code: 'AGO', name: 'Angola' },
  { code: 'ATG', name: 'Antigua and Barbuda' },
  { code: 'ARG', name: 'Argentina' },
  { code: 'ARM', name: 'Armenia' },
  { code: 'AUS', name: 'Australia' },
  { code: 'AUT', name: 'Austria' },
  { code: 'AZE', name: 'Azerbaijan' },
  { code: 'BHS', name: 'Bahamas' },
  { code: 'BHR', name: 'Bahrain' },
  { code: 'BGD', name: 'Bangladesh' },
  { code: 'BRB', name: 'Barbados' },
  { code: 'BLR', name: 'Belarus' },
  { code: 'BEL', name: 'Belgium' },
  { code: 'BLZ', name: 'Belize' },
  { code: 'BEN', name: 'Benin' },
  { code: 'BTN', name: 'Bhutan' },
  { code: 'BOL', name: 'Bolivia' },
  { code: 'BIH', name: 'Bosnia and Herzegovina' },
  { code: 'BWA', name: 'Botswana' },
  { code: 'BRA', name: 'Brazil' },
  { code: 'BRN', name: 'Brunei' },
  { code: 'BGR', name: 'Bulgaria' },
  { code: 'BFA', name: 'Burkina Faso' },
  { code: 'BDI', name: 'Burundi' },
  { code: 'CPV', name: 'Cabo Verde' },
  { code: 'KHM', name: 'Cambodia' },
  { code: 'CMR', name: 'Cameroon' },
  { code: 'CAN', name: 'Canada' },
  { code: 'CAF', name: 'Central African Republic' },
  { code: 'TCD', name: 'Chad' },
  { code: 'CHL', name: 'Chile' },
  { code: 'CHN', name: 'China' },
  { code: 'COL', name: 'Colombia' },
  { code: 'COM', name: 'Comoros' },
  { code: 'COD', name: 'Congo (DRC)' },
  { code: 'COG', name: 'Congo (Republic)' },
  { code: 'CRI', name: 'Costa Rica' },
  { code: 'CIV', name: "Côte d\'Ivoire" },
  { code: 'HRV', name: 'Croatia' },
  { code: 'CUB', name: 'Cuba' },
  { code: 'CYP', name: 'Cyprus' },
  { code: 'CZE', name: 'Czech Republic' },
  { code: 'DNK', name: 'Denmark' },
  { code: 'DJI', name: 'Djibouti' },
  { code: 'DMA', name: 'Dominica' },
  { code: 'DOM', name: 'Dominican Republic' },
  { code: 'ECU', name: 'Ecuador' },
  { code: 'EGY', name: 'Egypt' },
  { code: 'SLV', name: 'El Salvador' },
  { code: 'GNQ', name: 'Equatorial Guinea' },
  { code: 'ERI', name: 'Eritrea' },
  { code: 'EST', name: 'Estonia' },
  { code: 'SWZ', name: 'Eswatini' },
  { code: 'ETH', name: 'Ethiopia' },
  { code: 'FJI', name: 'Fiji' },
  { code: 'FIN', name: 'Finland' },
  { code: 'FRA', name: 'France' },
  { code: 'GAB', name: 'Gabon' },
  { code: 'GMB', name: 'Gambia' },
  { code: 'GEO', name: 'Georgia' },
  { code: 'DEU', name: 'Germany' },
  { code: 'GHA', name: 'Ghana' },
  { code: 'GRC', name: 'Greece' },
  { code: 'GRD', name: 'Grenada' },
  { code: 'GTM', name: 'Guatemala' },
  { code: 'GIN', name: 'Guinea' },
  { code: 'GNB', name: 'Guinea-Bissau' },
  { code: 'GUY', name: 'Guyana' },
  { code: 'HTI', name: 'Haiti' },
  { code: 'HND', name: 'Honduras' },
  { code: 'HUN', name: 'Hungary' },
  { code: 'ISL', name: 'Iceland' },
  { code: 'IND', name: 'India' },
  { code: 'IDN', name: 'Indonesia' },
  { code: 'IRN', name: 'Iran' },
  { code: 'IRQ', name: 'Iraq' },
  { code: 'IRL', name: 'Ireland' },
  { code: 'ISR', name: 'Israel' },
  { code: 'ITA', name: 'Italy' },
  { code: 'JAM', name: 'Jamaica' },
  { code: 'JPN', name: 'Japan' },
  { code: 'JOR', name: 'Jordan' },
  { code: 'KAZ', name: 'Kazakhstan' },
  { code: 'KEN', name: 'Kenya' },
  { code: 'KIR', name: 'Kiribati' },
  { code: 'PRK', name: 'Korea (North)' },
  { code: 'KOR', name: 'Korea (South)' },
  { code: 'XKX', name: 'Kosovo' },
  { code: 'KWT', name: 'Kuwait' },
  { code: 'KGZ', name: 'Kyrgyzstan' },
  { code: 'LAO', name: 'Laos' },
  { code: 'LVA', name: 'Latvia' },
  { code: 'LBN', name: 'Lebanon' },
  { code: 'LSO', name: 'Lesotho' },
  { code: 'LBR', name: 'Liberia' },
  { code: 'LBY', name: 'Libya' },
  { code: 'LIE', name: 'Liechtenstein' },
  { code: 'LTU', name: 'Lithuania' },
  { code: 'LUX', name: 'Luxembourg' },
  { code: 'MDG', name: 'Madagascar' },
  { code: 'MWI', name: 'Malawi' },
  { code: 'MYS', name: 'Malaysia' },
  { code: 'MDV', name: 'Maldives' },
  { code: 'MLI', name: 'Mali' },
  { code: 'MLT', name: 'Malta' },
  { code: 'MHL', name: 'Marshall Islands' },
  { code: 'MRT', name: 'Mauritania' },
  { code: 'MUS', name: 'Mauritius' },
  { code: 'MEX', name: 'Mexico' },
  { code: 'FSM', name: 'Micronesia' },
  { code: 'MDA', name: 'Moldova' },
  { code: 'MCO', name: 'Monaco' },
  { code: 'MNG', name: 'Mongolia' },
  { code: 'MNE', name: 'Montenegro' },
  { code: 'MAR', name: 'Morocco' },
  { code: 'MOZ', name: 'Mozambique' },
  { code: 'MMR', name: 'Myanmar' },
  { code: 'NAM', name: 'Namibia' },
  { code: 'NRU', name: 'Nauru' },
  { code: 'NPL', name: 'Nepal' },
  { code: 'NLD', name: 'Netherlands' },
  { code: 'NZL', name: 'New Zealand' },
  { code: 'NIC', name: 'Nicaragua' },
  { code: 'NER', name: 'Niger' },
  { code: 'NGA', name: 'Nigeria' },
  { code: 'MKD', name: 'North Macedonia' },
  { code: 'NOR', name: 'Norway' },
  { code: 'OMN', name: 'Oman' },
  { code: 'PAK', name: 'Pakistan' },
  { code: 'PLW', name: 'Palau' },
  { code: 'PSE', name: 'Palestine' },
  { code: 'PAN', name: 'Panama' },
  { code: 'PNG', name: 'Papua New Guinea' },
  { code: 'PRY', name: 'Paraguay' },
  { code: 'PER', name: 'Peru' },
  { code: 'PHL', name: 'Philippines' },
  { code: 'POL', name: 'Poland' },
  { code: 'PRT', name: 'Portugal' },
  { code: 'QAT', name: 'Qatar' },
  { code: 'ROU', name: 'Romania' },
  { code: 'RUS', name: 'Russia' },
  { code: 'RWA', name: 'Rwanda' },
  { code: 'KNA', name: 'Saint Kitts and Nevis' },
  { code: 'LCA', name: 'Saint Lucia' },
  { code: 'VCT', name: 'Saint Vincent and the Grenadines' },
  { code: 'WSM', name: 'Samoa' },
  { code: 'SMR', name: 'San Marino' },
  { code: 'STP', name: 'Sao Tome and Principe' },
  { code: 'SAU', name: 'Saudi Arabia' },
  { code: 'SEN', name: 'Senegal' },
  { code: 'SRB', name: 'Serbia' },
  { code: 'SYC', name: 'Seychelles' },
  { code: 'SLE', name: 'Sierra Leone' },
  { code: 'SGP', name: 'Singapore' },
  { code: 'SVK', name: 'Slovakia' },
  { code: 'SVN', name: 'Slovenia' },
  { code: 'SLB', name: 'Solomon Islands' },
  { code: 'SOM', name: 'Somalia' },
  { code: 'ZAF', name: 'South Africa' },
  { code: 'SSD', name: 'South Sudan' },
  { code: 'ESP', name: 'Spain' },
  { code: 'LKA', name: 'Sri Lanka' },
  { code: 'SDN', name: 'Sudan' },
  { code: 'SUR', name: 'Suriname' },
  { code: 'SWE', name: 'Sweden' },
  { code: 'CHE', name: 'Switzerland' },
  { code: 'SYR', name: 'Syria' },
  { code: 'TWN', name: 'Taiwan' },
  { code: 'TJK', name: 'Tajikistan' },
  { code: 'TZA', name: 'Tanzania' },
  { code: 'THA', name: 'Thailand' },
  { code: 'TLS', name: 'Timor-Leste' },
  { code: 'TGO', name: 'Togo' },
  { code: 'TON', name: 'Tonga' },
  { code: 'TTO', name: 'Trinidad and Tobago' },
  { code: 'TUN', name: 'Tunisia' },
  { code: 'TUR', name: 'Turkey' },
  { code: 'TKM', name: 'Turkmenistan' },
  { code: 'TUV', name: 'Tuvalu' },
  { code: 'UGA', name: 'Uganda' },
  { code: 'UKR', name: 'Ukraine' },
  { code: 'ARE', name: 'United Arab Emirates' },
  { code: 'GBR', name: 'United Kingdom' },
  { code: 'USA', name: 'United States' },
  { code: 'URY', name: 'Uruguay' },
  { code: 'UZB', name: 'Uzbekistan' },
  { code: 'VUT', name: 'Vanuatu' },
  { code: 'VAT', name: 'Vatican City' },
  { code: 'VEN', name: 'Venezuela' },
  { code: 'VNM', name: 'Vietnam' },
  { code: 'YEM', name: 'Yemen' },
  { code: 'ZMB', name: 'Zambia' },
  { code: 'ZWE', name: 'Zimbabwe' },
];

export default function PassportScannerContent() {
  const [activeSection, setActiveSection] = useState<'manual' | 'mrz' | 'image'>('manual');
  const [isSaving, setIsSaving] = useState(false);
  const [previewData, setPreviewData] = useState<Partial<PassportFormData>>({});

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<PassportFormData>({
    defaultValues: {
      documentType: 'P',
      sex: 'M',
    },
  });

  const watchedValues = watch();

  const expiryDate = watchedValues.expiryDate ? new Date(watchedValues.expiryDate) : null;
  const daysRemaining = expiryDate ? calculateDaysRemaining(expiryDate) : null;
  const status = daysRemaining !== null ? getPassportStatus(daysRemaining) : 'unknown';
  const expiryHijri = expiryDate ? gregorianToHijri(expiryDate) : null;
  const issueHijri = watchedValues.issueDate ? gregorianToHijri(new Date(watchedValues.issueDate)) : null;
  const dobHijri = watchedValues.dateOfBirth ? gregorianToHijri(new Date(watchedValues.dateOfBirth)) : null;

  const onSubmit = async (data: PassportFormData) => {
    setIsSaving(true);
    try {
      const record = await passportService.create({
        holderName: data.holderName,
        holderNameAr: undefined,
        nationality: data.nationality,
        nationalityCode: data.nationality,
        flagEmoji: '',
        passportNumber: data.passportNumber,
        documentType: data.documentType,
        sex: data.sex as 'M' | 'F',
        dateOfBirth: data.dateOfBirth,
        placeOfBirth: data.placeOfBirth,
        issueDate: data.issueDate,
        expiryDate: data.expiryDate,
        issuingAuthority: data.issuingAuthority,
        issuingCountry: data.issuingCountry,
        personalNumber: data.personalNumber,
        mrzLine1: data.mrzLine1,
        mrzLine2: data.mrzLine2,
        mrzValid: data.mrzLine1?.length === 44 && data.mrzLine2?.length === 44,
        notes: data.notes,
      });

      if (record) {
        toast.success('Passport record saved successfully', {
          description: `${data.holderName} — ${data.passportNumber}`,
        });
        reset({ documentType: 'P', sex: 'M' });
      } else {
        toast.error('Failed to save passport record', {
          description: 'Please check your connection and try again.',
        });
      }
    } catch {
      toast.error('Failed to save passport record', {
        description: 'An unexpected error occurred.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMRZParse = useCallback((parsed: Partial<PassportFormData>) => {
    Object.entries(parsed).forEach(([key, value]) => {
      setValue(key as keyof PassportFormData, value as string);
    });
    setActiveSection('manual');
    toast.success('MRZ parsed successfully', { description: 'Fields have been populated from MRZ data' });
  }, [setValue]);

  const handleImageScan = useCallback((fields: Partial<PassportFormData>) => {
    const filledCount = Object.values(fields).filter(v => v).length;
    Object.entries(fields).forEach(([key, value]) => {
      if (value) setValue(key as keyof PassportFormData, value as string);
    });
    setActiveSection('manual');
    toast.success(`Auto-filled ${filledCount} field${filledCount !== 1 ? 's' : ''} from passport scan`, {
      description: 'Please review the pre-filled data and complete any missing fields.',
    });
  }, [setValue]);

  const handleClearForm = () => {
    reset({ documentType: 'P', sex: 'M' });
    toast.info('Form cleared');
  };

  const getDaysClass = (days: number) => {
    if (days < 0) return 'days-critical';
    if (days <= 180) return 'days-warning';
    return 'days-good';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="bg-card border-b border-border px-6 lg:px-8 py-5">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Passport Scanner</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Enter passport data manually or parse from MRZ lines
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClearForm}
              className="btn-secondary"
            >
              <Trash2 size={15} />
              Clear Form
            </button>
            <button
              type="button"
              className="btn-secondary"
            >
              <Upload size={15} />
              Import CSV
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 2xl:px-16 py-6">
        {/* Mode Toggle */}
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 w-fit mb-6">
          <button
            type="button"
            onClick={() => setActiveSection('manual')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
              activeSection === 'manual' ?'bg-primary text-primary-foreground shadow-sm' :'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText size={15} />
            Manual Entry
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('image')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
              activeSection === 'image' ?'bg-primary text-primary-foreground shadow-sm' :'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Upload size={15} />
            Image Scan
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('mrz')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
              activeSection === 'mrz' ?'bg-primary text-primary-foreground shadow-sm' :'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ScanLine size={15} />
            MRZ Parser
          </button>
        </div>

        {activeSection === 'mrz' ? (
          <MRZParserPanel onParsed={handleMRZParse} />
        ) : activeSection === 'image' ? (
          <PassportImageScanner onFieldsExtracted={handleImageScan} />
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 xl:grid-cols-3 2xl:grid-cols-3 gap-6">
              {/* LEFT: Form Sections */}
              <div className="xl:col-span-2 space-y-5">
                {/* Section 1: Document Info */}
                <div className="card-surface p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-white text-xs font-bold">1</span>
                    </div>
                    <h2 className="text-sm font-semibold text-foreground">Document Information</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="form-label">Document Type</label>
                      <select
                        {...register('documentType', { required: 'Required' })}
                        className="form-input"
                      >
                        <option value="P">P — Passport</option>
                        <option value="PD">PD — Diplomatic</option>
                        <option value="PS">PS — Service</option>
                        <option value="PC">PC — Official</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Issuing Country</label>
                      <select
                        {...register('issuingCountry', { required: 'Issuing country is required' })}
                        className={`form-input ${errors.issuingCountry ? 'form-input-error' : ''}`}
                      >
                        <option value="">Select country...</option>
                        {COUNTRIES.map(c => (
                          <option key={`country-${c.code}`} value={c.code}>{c.code} — {c.name}</option>
                        ))}
                      </select>
                      {errors.issuingCountry && (
                        <p className="text-xs text-expired mt-1 flex items-center gap-1">
                          <AlertCircle size={11} /> {errors.issuingCountry.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="form-label">Passport Number</label>
                      <input
                        {...register('passportNumber', {
                          required: 'Passport number is required',
                          pattern: { value: /^[A-Z0-9]{6,9}$/, message: 'Must be 6–9 alphanumeric chars' },
                        })}
                        placeholder="e.g. A12345678"
                        className={`form-input font-mono-data uppercase ${errors.passportNumber ? 'form-input-error' : ''}`}
                        onChange={e => {
                          e.target.value = e.target.value.toUpperCase();
                          register('passportNumber').onChange(e);
                        }}
                      />
                      {errors.passportNumber && (
                        <p className="text-xs text-expired mt-1 flex items-center gap-1">
                          <AlertCircle size={11} /> {errors.passportNumber.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="form-label">Issue Date</label>
                      <input
                        type="date"
                        {...register('issueDate', { required: 'Issue date is required' })}
                        className={`form-input ${errors.issueDate ? 'form-input-error' : ''}`}
                      />
                      {errors.issueDate && (
                        <p className="text-xs text-expired mt-1 flex items-center gap-1">
                          <AlertCircle size={11} /> {errors.issueDate.message}
                        </p>
                      )}
                      {issueHijri && (
                        <p className="text-xs text-muted-foreground mt-1 font-mono-data">
                          ☽ {issueHijri.formatted}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="form-label">Expiry Date</label>
                      <input
                        type="date"
                        {...register('expiryDate', { required: 'Expiry date is required' })}
                        className={`form-input ${errors.expiryDate ? 'form-input-error' : ''}`}
                      />
                      {errors.expiryDate && (
                        <p className="text-xs text-expired mt-1 flex items-center gap-1">
                          <AlertCircle size={11} /> {errors.expiryDate.message}
                        </p>
                      )}
                      {expiryHijri && (
                        <p className="text-xs text-muted-foreground mt-1 font-mono-data">
                          ☽ {expiryHijri.formatted}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="form-label">Issuing Authority</label>
                      <input
                        {...register('issuingAuthority')}
                        placeholder="e.g. Directorate of Passports"
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Personal Information */}
                <div className="card-surface p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-white text-xs font-bold">2</span>
                    </div>
                    <h2 className="text-sm font-semibold text-foreground">Personal Information</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="form-label">Full Name (as on passport)</label>
                      <input
                        {...register('holderName', {
                          required: 'Holder name is required',
                          minLength: { value: 2, message: 'Name must be at least 2 characters' },
                        })}
                        placeholder="e.g. MOHAMMED AL-RASHIDI"
                        className={`form-input ${errors.holderName ? 'form-input-error' : ''}`}
                      />
                      {errors.holderName && (
                        <p className="text-xs text-expired mt-1 flex items-center gap-1">
                          <AlertCircle size={11} /> {errors.holderName.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="form-label">Sex</label>
                      <select {...register('sex')} className="form-input">
                        <option value="M">M — Male</option>
                        <option value="F">F — Female</option>
                        <option value="X">X — Unspecified</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Date of Birth</label>
                      <input
                        type="date"
                        {...register('dateOfBirth', { required: 'Date of birth is required' })}
                        className={`form-input ${errors.dateOfBirth ? 'form-input-error' : ''}`}
                      />
                      {errors.dateOfBirth && (
                        <p className="text-xs text-expired mt-1 flex items-center gap-1">
                          <AlertCircle size={11} /> {errors.dateOfBirth.message}
                        </p>
                      )}
                      {dobHijri && (
                        <p className="text-xs text-muted-foreground mt-1 font-mono-data">
                          ☽ {dobHijri.formatted}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="form-label">Nationality</label>
                      <select
                        {...register('nationality', { required: 'Nationality is required' })}
                        className={`form-input ${errors.nationality ? 'form-input-error' : ''}`}
                      >
                        <option value="">Select nationality...</option>
                        {COUNTRIES.map(c => (
                          <option key={`nat-${c.code}`} value={c.code}>{c.code} — {c.name}</option>
                        ))}
                      </select>
                      {errors.nationality && (
                        <p className="text-xs text-expired mt-1 flex items-center gap-1">
                          <AlertCircle size={11} /> {errors.nationality.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="form-label">Place of Birth</label>
                      <input
                        {...register('placeOfBirth')}
                        placeholder="e.g. Riyadh"
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="form-label">Personal Number</label>
                      <p className="text-xs text-muted-foreground mb-1">Optional — national ID or tax number</p>
                      <input
                        {...register('personalNumber')}
                        placeholder="e.g. SAU8503142M"
                        className="form-input font-mono-data"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: MRZ Data */}
                <div className="card-surface p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-white text-xs font-bold">3</span>
                    </div>
                    <h2 className="text-sm font-semibold text-foreground">Machine Readable Zone (MRZ)</h2>
                  </div>
                  <p className="text-xs text-muted-foreground ml-8 mb-4">
                    TD3 format — 2 lines of 44 characters each. Use the MRZ Parser tab to auto-fill from raw MRZ.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="form-label">MRZ Line 1 (44 chars)</label>
                      <input
                        {...register('mrzLine1', {
                          minLength: { value: 44, message: 'MRZ line 1 must be exactly 44 characters' },
                          maxLength: { value: 44, message: 'MRZ line 1 must be exactly 44 characters' },
                        })}
                        placeholder="P<SAUALMRASHIDI<<MOHAMMED<<<<<<<<<<<<<<<<<<<<"
                        className={`mrz-line w-full ${errors.mrzLine1 ? 'form-input-error' : ''}`}
                        maxLength={44}
                      />
                      <div className="flex justify-between mt-1">
                        {errors.mrzLine1 && (
                          <p className="text-xs text-expired flex items-center gap-1">
                            <AlertCircle size={11} /> {errors.mrzLine1.message}
                          </p>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto font-mono-data">
                          {(watchedValues.mrzLine1 || '').length}/44
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="form-label">MRZ Line 2 (44 chars)</label>
                      <input
                        {...register('mrzLine2', {
                          minLength: { value: 44, message: 'MRZ line 2 must be exactly 44 characters' },
                          maxLength: { value: 44, message: 'MRZ line 2 must be exactly 44 characters' },
                        })}
                        placeholder="A123456781SAU8503142M3006094<<<<<<<<<<<<<<2"
                        className={`mrz-line w-full ${errors.mrzLine2 ? 'form-input-error' : ''}`}
                        maxLength={44}
                      />
                      <div className="flex justify-between mt-1">
                        {errors.mrzLine2 && (
                          <p className="text-xs text-expired flex items-center gap-1">
                            <AlertCircle size={11} /> {errors.mrzLine2.message}
                          </p>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto font-mono-data">
                          {(watchedValues.mrzLine2 || '').length}/44
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4: Notes */}
                <div className="card-surface p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-white text-xs font-bold">4</span>
                    </div>
                    <h2 className="text-sm font-semibold text-foreground">Internal Notes</h2>
                  </div>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    placeholder="Add any processing notes, flags, or remarks..."
                    className="form-input resize-none"
                  />
                </div>

                {/* Submit Bar */}
                <div className="card-surface p-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Info size={14} />
                    All fields marked with * are required
                  </p>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={handleClearForm} className="btn-secondary">
                      <RefreshCw size={14} />
                      Reset
                    </button>
                    <button type="submit" disabled={isSaving} className="btn-primary">
                      {isSaving ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={15} />
                          Save Passport Record
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT: Live Preview + Hijri Panel */}
              <div className="xl:col-span-1 space-y-5">
                {/* Passport Card Preview */}
                <PassportCardPreview
                  holderName={watchedValues.holderName}
                  passportNumber={watchedValues.passportNumber}
                  nationality={watchedValues.nationality}
                  expiryDate={watchedValues.expiryDate}
                  issueDate={watchedValues.issueDate}
                  dateOfBirth={watchedValues.dateOfBirth}
                  sex={watchedValues.sex}
                  issuingCountry={watchedValues.issuingCountry}
                  mrzLine1={watchedValues.mrzLine1}
                  mrzLine2={watchedValues.mrzLine2}
                />

                {/* Validity Status Card */}
                {daysRemaining !== null && (
                  <div className={`card-surface p-4 ${
                    status === 'expired' ? 'border-expired/30 bg-expired/5' :
                    status === 'expiring'? 'border-expiring/30 bg-expiring/5' : 'border-valid/30 bg-valid/5'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Validity Status</span>
                      <StatusBadge status={status} />
                    </div>
                    <div className="text-center py-2">
                      <p className={`text-5xl font-bold tabular-nums ${getDaysClass(daysRemaining)}`}>
                        {Math.abs(daysRemaining)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {daysRemaining < 0 ? 'days past expiry' : 'days remaining'}
                      </p>
                    </div>
                    {expiryDate && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Expiry Date</span>
                          <span className="font-semibold font-mono-data">{formatDateDisplay(expiryDate)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Hijri Conversion Panel */}
                <HijriConversionPanel
                  issueDate={watchedValues.issueDate}
                  expiryDate={watchedValues.expiryDate}
                  dateOfBirth={watchedValues.dateOfBirth}
                />
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Edit2, Printer, Download, Share2, User, Globe, Calendar, Hash, MapPin, FileText, Shield, Clock, StickyNote, ChevronRight, X, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { enrichedPassports } from '@/lib/passportData';
import { gregorianToHijri, calculateDaysRemaining, getPassportStatus } from '@/lib/hijri';
import StatusBadge from '@/components/ui/StatusBadge';
import ValidityRing from './ValidityRing';
import MRZAnalysisTab from './MRZAnalysisTab';
import DateConversionsTab from './DateConversionsTab';
import { passportService } from '@/lib/services/passportService';
import type { EnrichedPassport } from '@/lib/passportData';
import PhotoUpload from './PhotoUpload';

type TabId = 'overview' | 'mrz' | 'dates' | 'notes';

interface EditFormData {
  holderName: string;
  holderNameAr: string;
  passportNumber: string;
  nationality: string;
  nationalityCode: string;
  sex: 'M' | 'F';
  dateOfBirth: string;
  placeOfBirth: string;
  issueDate: string;
  expiryDate: string;
  issuingCountry: string;
  issuingAuthority: string;
  personalNumber: string;
  notes: string;
}

export default function PassportDetailsContent() {
  const searchParams = useSearchParams();
  const passportId = searchParams.get('id');

  const [passport, setPassport] = useState<EnrichedPassport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>({
    holderName: '',
    holderNameAr: '',
    passportNumber: '',
    nationality: '',
    nationalityCode: '',
    sex: 'M',
    dateOfBirth: '',
    placeOfBirth: '',
    issueDate: '',
    expiryDate: '',
    issuingCountry: '',
    issuingAuthority: '',
    personalNumber: '',
    notes: '',
  });

  const loadPassport = useCallback(async () => {
    setLoading(true);
    if (passportId) {
      const record = await passportService.getById(passportId);
      if (record) {
        setPassport(record);
      } else {
        // fallback to mock
        setPassport(enrichedPassports[0]);
      }
    } else {
      setPassport(enrichedPassports[0]);
    }
    setLoading(false);
  }, [passportId]);

  useEffect(() => {
    loadPassport();
  }, [loadPassport]);

  useEffect(() => {
    if (passport) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPhotoUrl((passport as any).photo_url ?? null);
    }
  }, [passport]);

  function openEdit() {
    if (!passport) return;
    setEditForm({
      holderName: passport.holderName,
      holderNameAr: passport.holderNameAr ?? '',
      passportNumber: passport.passportNumber,
      nationality: passport.nationality,
      nationalityCode: passport.nationalityCode,
      sex: passport.sex,
      dateOfBirth: passport.dateOfBirth,
      placeOfBirth: passport.placeOfBirth,
      issueDate: passport.issueDate,
      expiryDate: passport.expiryDate,
      issuingCountry: passport.issuingCountry,
      issuingAuthority: passport.issuingAuthority,
      personalNumber: passport.personalNumber ?? '',
      notes: passport.notes ?? '',
    });
    setSaveError(null);
    setIsEditOpen(true);
  }

  async function handleSave() {
    if (!passport) return;
    setIsSaving(true);
    setSaveError(null);
    const updated = await passportService.update(passport.id, {
      holderName: editForm.holderName,
      holderNameAr: editForm.holderNameAr || undefined,
      passportNumber: editForm.passportNumber,
      nationality: editForm.nationality,
      nationalityCode: editForm.nationalityCode,
      sex: editForm.sex,
      dateOfBirth: editForm.dateOfBirth,
      placeOfBirth: editForm.placeOfBirth,
      issueDate: editForm.issueDate,
      expiryDate: editForm.expiryDate,
      issuingCountry: editForm.issuingCountry,
      issuingAuthority: editForm.issuingAuthority,
      personalNumber: editForm.personalNumber || undefined,
      notes: editForm.notes || undefined,
    });
    setIsSaving(false);
    if (updated) {
      setPassport(updated);
      setIsEditOpen(false);
    } else {
      setSaveError('Failed to save changes. Please try again.');
    }
  }

  function handleField(field: keyof EditFormData, value: string) {
    setEditForm(prev => ({ ...prev, [field]: value }));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!passport) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Passport record not found.</p>
      </div>
    );
  }

  const expiryDate = new Date(passport.expiryDate);
  const issueDate = new Date(passport.issueDate);
  const dob = new Date(passport.dateOfBirth);
  const daysRemaining = calculateDaysRemaining(expiryDate);
  const status = getPassportStatus(daysRemaining);

  const totalValidity = Math.floor((expiryDate.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24));
  const validityPercent = Math.max(0, Math.min(100, Math.round((daysRemaining / totalValidity) * 100)));

  const expiryHijri = gregorianToHijri(expiryDate);
  const issueHijri = gregorianToHijri(issueDate);
  const dobHijri = gregorianToHijri(dob);

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'mrz', label: 'MRZ Analysis', icon: Shield },
    { id: 'dates', label: 'Date Conversions', icon: Calendar },
    { id: 'notes', label: 'Notes', icon: StickyNote },
  ];

  function formatDisplay(d: Date): string {
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function calcAge(dob: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  }

  const getDaysClass = () => {
    if (daysRemaining < 0) return 'text-expired';
    if (daysRemaining <= 180) return 'text-expiring';
    return 'text-valid';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="bg-card border-b border-border px-6 lg:px-8 py-4">
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Link
              href="/passport-records"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={15} />
              Back to Records
            </Link>
            <ChevronRight size={13} className="text-muted-foreground" />
            <span className="text-sm text-foreground font-medium">{passport.holderName}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{passport.holderName}</h1>
              <StatusBadge status={status} size="lg" />
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-secondary" type="button">
                <Printer size={14} />
                Print
              </button>
              <button className="btn-secondary" type="button">
                <Download size={14} />
                Export PDF
              </button>
              <button className="btn-secondary" type="button">
                <Share2 size={14} />
                Share
              </button>
              <button className="btn-primary" type="button" onClick={openEdit}>
                <Edit2 size={14} />
                Edit Record
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 2xl:px-16 py-6">
        {/* Hero Section */}
        <div className="grid grid-cols-1 xl:grid-cols-4 2xl:grid-cols-4 gap-5 mb-6">
          {/* Passport Card */}
          <div className="xl:col-span-2 passport-card p-6 text-white">
            <div className="flex items-start justify-between mb-5 relative z-10">
              <div>
                <p className="text-xs text-slate-400 font-medium tracking-widest uppercase">
                  {passport.issuingCountry} — PASSPORT
                </p>
                {passport.holderNameAr && (
                  <p className="text-sm text-accent font-semibold mt-1" dir="rtl">
                    {passport.holderNameAr}
                  </p>
                )}
              </div>

              <Shield size={24} className="text-accent/70" />
            </div>

            <div className="flex gap-5 relative z-10">
              <div className="w-20 h-24 rounded-xl bg-white/10 border-2 border-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={`Photo of ${passport.holderName}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-full bg-white/20 mx-auto mb-1.5" />
                    <div className="w-12 h-2 rounded-full bg-white/10 mx-auto mb-1" />
                    <div className="w-8 h-1.5 rounded-full bg-white/10 mx-auto" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Surname / Given Names</p>
                  <p className="text-base font-bold text-white">{passport.holderName}</p>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Passport No.</p>
                    <p className="text-sm font-bold font-mono-data text-accent">{passport.passportNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Nationality</p>
                    <p className="text-sm font-semibold font-mono-data">{passport.nationalityCode}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Date of Birth</p>
                    <p className="text-xs font-semibold font-mono-data">{formatDisplay(dob)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Sex</p>
                    <p className="text-xs font-semibold">{passport.sex === 'M' ? 'Male' : 'Female'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Date of Issue</p>
                    <p className="text-xs font-semibold font-mono-data">{formatDisplay(issueDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Date of Expiry</p>
                    <p className="text-xs font-semibold font-mono-data text-accent">{formatDisplay(expiryDate)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 relative z-10">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Machine Readable Zone</p>
              <p className="font-mono-data text-xs text-slate-300 tracking-widest break-all mb-1">{passport.mrzLine1}</p>
              <p className="font-mono-data text-xs text-slate-300 tracking-widest break-all">{passport.mrzLine2}</p>
            </div>
          </div>

          {/* Validity Ring Card */}
          <div className="card-surface p-5 flex flex-col items-center justify-center">
            <p className="section-header mb-4">Validity Status</p>
            <ValidityRing percent={validityPercent} status={status} daysRemaining={daysRemaining} />
            <div className="text-center mt-4">
              <p className={`text-4xl font-bold tabular-nums ${getDaysClass()}`}>
                {Math.abs(daysRemaining)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {daysRemaining < 0 ? 'days past expiry' : 'days remaining'}
              </p>
              <div className="mt-3 text-xs text-muted-foreground">
                <p>Valid: {formatDisplay(issueDate)}</p>
                <p>Expires: {formatDisplay(expiryDate)}</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="card-surface p-5">
            <p className="section-header mb-4">Key Details</p>
            <div className="space-y-3">
              {[
                { icon: Hash, label: 'Passport Number', value: passport.passportNumber, mono: true },
                { icon: Globe, label: 'Nationality', value: `${passport.flagEmoji} ${passport.nationality}`, mono: false },
                { icon: MapPin, label: 'Place of Birth', value: passport.placeOfBirth, mono: false },
                { icon: User, label: 'Age', value: `${calcAge(dob)} years`, mono: false },
                { icon: Shield, label: 'Issuing Authority', value: passport.issuingAuthority, mono: false },
                { icon: FileText, label: 'MRZ Validity', value: passport.mrzValid ? 'All check digits valid' : 'Check digit error', mono: false, alert: !passport.mrzValid },
                { icon: Clock, label: 'Record Created', value: new Date(passport.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), mono: false },
              ].map((item, i) => {
                const ItemIcon = item.icon;
                return (
                  <div key={`detail-stat-${i}`} className="flex items-start gap-2.5">
                    <ItemIcon size={14} className={`mt-0.5 flex-shrink-0 ${item.alert ? 'text-expired' : 'text-muted-foreground'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className={`text-sm font-semibold truncate ${item.alert ? 'text-expired' : 'text-foreground'} ${item.mono ? 'font-mono-data' : ''}`}>
                        {item.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="card-surface overflow-hidden">
          <div className="border-b border-border px-5">
            <div className="flex gap-0">
              {tabs.map(tab => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={`tab-${tab.id}`}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3.5 text-sm transition-all duration-150 ${
                      activeTab === tab.id ? 'tab-active' : 'tab-inactive'
                    }`}
                  >
                    <TabIcon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-6">
                {/* Personal Details */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <User size={14} className="text-primary" />
                    Personal Details
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Full Name', value: passport.holderName },
                      { label: 'Sex', value: passport.sex === 'M' ? 'Male' : 'Female' },
                      { label: 'Date of Birth', value: formatDisplay(dob) },
                      { label: 'Place of Birth', value: passport.placeOfBirth },
                      { label: 'Age', value: `${calcAge(dob)} years old` },
                      { label: 'Nationality', value: `${passport.flagEmoji} ${passport.nationality}` },
                    ].map((row, i) => (
                      <div key={`ov-personal-${i}`} className="flex justify-between py-1.5 border-b border-border last:border-0">
                        <span className="text-xs text-muted-foreground">{row.label}</span>
                        <span className="text-xs font-semibold text-foreground text-right max-w-[60%]">{row.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Photo Upload */}
                  <div className="mt-5 pt-4 border-t border-border">
                    <PhotoUpload
                      passportId={passport.id}
                      currentPhotoUrl={photoUrl}
                      holderName={passport.holderName}
                      onPhotoUpdated={(url) => setPhotoUrl(url)}
                    />
                  </div>
                </div>

                {/* Document Details */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <FileText size={14} className="text-primary" />
                    Document Details
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Document Type', value: 'P — Passport' },
                      { label: 'Passport Number', value: passport.passportNumber, mono: true },
                      { label: 'Issuing Country', value: passport.issuingCountry },
                      { label: 'Issuing Authority', value: passport.issuingAuthority },
                      { label: 'Issue Date', value: formatDisplay(issueDate) },
                      { label: 'Expiry Date', value: formatDisplay(expiryDate) },
                      { label: 'Total Validity', value: `${totalValidity} days (${Math.round(totalValidity/365)} years)` },
                    ].map((row, i) => (
                      <div key={`ov-doc-${i}`} className="flex justify-between py-1.5 border-b border-border last:border-0">
                        <span className="text-xs text-muted-foreground">{row.label}</span>
                        <span className={`text-xs font-semibold text-foreground text-right max-w-[60%] ${row.mono ? 'font-mono-data' : ''}`}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hijri Dates Summary */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Calendar size={14} className="text-accent" />
                    Hijri Calendar Dates
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Date of Birth (Hijri)', value: dobHijri.formatted },
                      { label: 'Issue Date (Hijri)', value: issueHijri.formatted },
                      { label: 'Expiry Date (Hijri)', value: expiryHijri.formatted },
                      { label: 'Expiry Month', value: expiryHijri.monthName },
                      { label: 'Hijri Year of Expiry', value: `${expiryHijri.year} AH` },
                      { label: 'Arabic Expiry', value: expiryHijri.formattedAr },
                    ].map((row, i) => (
                      <div key={`ov-hijri-${i}`} className="flex justify-between py-1.5 border-b border-border last:border-0">
                        <span className="text-xs text-muted-foreground">{row.label}</span>
                        <span className="text-xs font-semibold text-foreground text-right max-w-[60%] font-mono-data">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'mrz' && <MRZAnalysisTab passport={passport} />}
            {activeTab === 'dates' && (
              <DateConversionsTab
                dateOfBirth={passport.dateOfBirth}
                issueDate={passport.issueDate}
                expiryDate={passport.expiryDate}
              />
            )}
            {activeTab === 'notes' && (
              <div className="max-w-2xl">
                <h3 className="text-sm font-semibold text-foreground mb-3">Processing Notes</h3>
                <div className="bg-secondary rounded-lg p-4 text-sm text-foreground leading-relaxed">
                  {passport.notes || 'No notes recorded for this passport.'}
                </div>
                <div className="mt-4">
                  <textarea
                    rows={4}
                    placeholder="Add a new note..."
                    className="form-input resize-none"
                  />
                  <button type="button" className="btn-primary mt-3">
                    Save Note
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsEditOpen(false)} />
          <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <Edit2 size={16} className="text-primary" />
                <h2 className="text-base font-semibold text-foreground">Edit Passport Record</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              {/* Personal Info */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <User size={12} />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Full Name <span className="text-expired">*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      value={editForm.holderName}
                      onChange={e => handleField('holderName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Arabic Name</label>
                    <input
                      type="text"
                      className="form-input"
                      dir="rtl"
                      value={editForm.holderNameAr}
                      onChange={e => handleField('holderNameAr', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Sex <span className="text-expired">*</span></label>
                    <select
                      className="form-input"
                      value={editForm.sex}
                      onChange={e => handleField('sex', e.target.value as 'M' | 'F')}
                    >
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Date of Birth <span className="text-expired">*</span></label>
                    <input
                      type="date"
                      className="form-input"
                      value={editForm.dateOfBirth}
                      onChange={e => handleField('dateOfBirth', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Place of Birth</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editForm.placeOfBirth}
                      onChange={e => handleField('placeOfBirth', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Nationality</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editForm.nationality}
                      onChange={e => handleField('nationality', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Nationality Code (3-letter)</label>
                    <input
                      type="text"
                      maxLength={3}
                      className="form-input font-mono-data uppercase"
                      value={editForm.nationalityCode}
                      onChange={e => handleField('nationalityCode', e.target.value.toUpperCase())}
                    />
                  </div>
                </div>
              </div>

              {/* Document Info */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FileText size={12} />
                  Document Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Passport Number <span className="text-expired">*</span></label>
                    <input
                      type="text"
                      className="form-input font-mono-data uppercase"
                      value={editForm.passportNumber}
                      onChange={e => handleField('passportNumber', e.target.value.toUpperCase())}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Personal Number</label>
                    <input
                      type="text"
                      className="form-input font-mono-data"
                      value={editForm.personalNumber}
                      onChange={e => handleField('personalNumber', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Issuing Country (3-letter code)</label>
                    <input
                      type="text"
                      maxLength={3}
                      className="form-input font-mono-data uppercase"
                      value={editForm.issuingCountry}
                      onChange={e => handleField('issuingCountry', e.target.value.toUpperCase())}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Issuing Authority</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editForm.issuingAuthority}
                      onChange={e => handleField('issuingAuthority', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Issue Date <span className="text-expired">*</span></label>
                    <input
                      type="date"
                      className="form-input"
                      value={editForm.issueDate}
                      onChange={e => handleField('issueDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Expiry Date <span className="text-expired">*</span></label>
                    <input
                      type="date"
                      className="form-input"
                      value={editForm.expiryDate}
                      onChange={e => handleField('expiryDate', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <StickyNote size={12} />
                  Notes
                </h3>
                <textarea
                  rows={3}
                  className="form-input resize-none w-full"
                  placeholder="Add processing notes..."
                  value={editForm.notes}
                  onChange={e => handleField('notes', e.target.value)}
                />
              </div>

              {saveError && (
                <p className="text-xs text-expired bg-expired/10 border border-expired/20 rounded-lg px-3 py-2">{saveError}</p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsEditOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary flex items-center gap-2"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
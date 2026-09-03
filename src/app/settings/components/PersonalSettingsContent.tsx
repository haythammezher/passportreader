'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  User,
  Mail,
  Palette,
  Calendar,
  Globe,
  Save,
  Loader2,
  Shield,
  SunMedium,
  Moon,
  Monitor,
  Check,
} from 'lucide-react';

type Theme = 'system' | 'dark' | 'light';
type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'DD MMM YYYY';
type HijriTimezone = 'UTC' | 'Asia/Riyadh' | 'Asia/Dubai' | 'Asia/Kuwait' | 'Asia/Qatar' | 'Asia/Bahrain' | 'Asia/Muscat' | 'Africa/Cairo' | 'Asia/Baghdad';

interface DisplayPreferences {
  theme: Theme;
  dateFormat: DateFormat;
  hijriTimezone: HijriTimezone;
}

const DATE_FORMAT_OPTIONS: { value: DateFormat; label: string; example: string }[] = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '25/09/2024' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '09/25/2024' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2024-09-25' },
  { value: 'DD MMM YYYY', label: 'DD MMM YYYY', example: '25 Sep 2024' },
];

const TIMEZONE_OPTIONS: { value: HijriTimezone; label: string; offset: string }[] = [
  { value: 'UTC', label: 'UTC', offset: '+00:00' },
  { value: 'Asia/Riyadh', label: 'Riyadh (Saudi Arabia)', offset: '+03:00' },
  { value: 'Asia/Dubai', label: 'Dubai (UAE)', offset: '+04:00' },
  { value: 'Asia/Kuwait', label: 'Kuwait', offset: '+03:00' },
  { value: 'Asia/Qatar', label: 'Qatar', offset: '+03:00' },
  { value: 'Asia/Bahrain', label: 'Bahrain', offset: '+03:00' },
  { value: 'Asia/Muscat', label: 'Muscat (Oman)', offset: '+04:00' },
  { value: 'Africa/Cairo', label: 'Cairo (Egypt)', offset: '+02:00' },
  { value: 'Asia/Baghdad', label: 'Baghdad (Iraq)', offset: '+03:00' },
];

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Light', icon: <SunMedium size={16} /> },
  { value: 'dark', label: 'Dark', icon: <Moon size={16} /> },
  { value: 'system', label: 'System', icon: <Monitor size={16} /> },
];

const PREF_STORAGE_KEY = 'passport_display_prefs';

function loadPrefs(): DisplayPreferences {
  if (typeof window === 'undefined') return { theme: 'system', dateFormat: 'DD/MM/YYYY', hijriTimezone: 'Asia/Riyadh' };
  try {
    const raw = localStorage.getItem(PREF_STORAGE_KEY);
    if (raw) return { theme: 'system', dateFormat: 'DD/MM/YYYY', hijriTimezone: 'Asia/Riyadh', ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { theme: 'system', dateFormat: 'DD/MM/YYYY', hijriTimezone: 'Asia/Riyadh' };
}

export default function PersonalSettingsContent() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [prefs, setPrefs] = useState<DisplayPreferences>({ theme: 'system', dateFormat: 'DD/MM/YYYY', hijriTimezone: 'Asia/Riyadh' });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  useEffect(() => {
    if (!user) return;
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    setLoadingProfile(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      const name = data?.full_name ?? user?.user_metadata?.full_name ?? '';
      setFullName(name);
      setOriginalName(name);
    } catch { /* ignore */ } finally {
      setLoadingProfile(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, email: user.email, full_name: fullName, updated_at: new Date().toISOString() });
      if (error) throw error;
      setOriginalName(fullName);
      toast.success('Account details saved');
    } catch (err: any) {
      toast.error('Failed to save', { description: err?.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePrefs = () => {
    setSavingPrefs(true);
    try {
      localStorage.setItem(PREF_STORAGE_KEY, JSON.stringify(prefs));
      setPrefsSaved(true);
      toast.success('Display preferences saved');
      setTimeout(() => setPrefsSaved(false), 2000);
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  const profileDirty = fullName !== originalName;

  const getInitials = () => {
    const name = fullName || user?.email || '';
    if (fullName) return fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    return (user?.email ?? '').slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 lg:px-8 py-5">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Personal Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your account and display preferences</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 lg:px-8 py-8 space-y-6">

        {/* ── Account Details ── */}
        <section className="card-surface p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <User size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-foreground">Account Details</h2>
          </div>

          {loadingProfile ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
              <Loader2 size={15} className="animate-spin" />
              Loading…
            </div>
          ) : (
            <>
              {/* Avatar row */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-accent text-lg font-bold">{getInitials()}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{fullName || 'No name set'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Shield size={11} className="text-green-400" />
                    <span className="text-[11px] text-green-400 font-medium">Verified account</span>
                  </div>
                </div>
              </div>

              {/* Full name */}
              <div>
                <label className="form-label">Full name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="form-input"
                  placeholder="Your full name"
                />
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="form-label">Email address</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={user?.email ?? ''}
                    className="form-input pl-9 opacity-60 cursor-not-allowed"
                    disabled
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here.</p>
              </div>

              <div className="pt-1">
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile || !profileDirty}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  {savingProfile ? (
                    <><Loader2 size={14} className="animate-spin" />Saving…</>
                  ) : (
                    <><Save size={14} />Save Account Details</>
                  )}
                </button>
              </div>
            </>
          )}
        </section>

        {/* ── Display Preferences ── */}
        <section className="card-surface p-6 space-y-6">
          <div className="flex items-center gap-2 mb-1">
            <Palette size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-foreground">Display Preferences</h2>
          </div>

          {/* Theme */}
          <div>
            <label className="form-label flex items-center gap-1.5 mb-3">
              <SunMedium size={13} className="text-muted-foreground" />
              Theme
            </label>
            <div className="grid grid-cols-3 gap-3">
              {THEME_OPTIONS.map((opt) => {
                const active = prefs.theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setPrefs((p) => ({ ...p, theme: opt.value }))}
                    className={`flex flex-col items-center gap-2 py-4 px-3 rounded-xl border transition-all duration-150 ${
                      active
                        ? 'border-accent bg-accent/10 text-accent' :'border-border bg-card/50 text-muted-foreground hover:border-border/80 hover:text-foreground'
                    }`}
                  >
                    {opt.icon}
                    <span className="text-xs font-medium">{opt.label}</span>
                    {active && <Check size={11} className="text-accent" />}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Theme preference is saved locally. Dark mode is the app default.
            </p>
          </div>

          {/* Date Format */}
          <div>
            <label className="form-label flex items-center gap-1.5 mb-3">
              <Calendar size={13} className="text-muted-foreground" />
              Date Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              {DATE_FORMAT_OPTIONS.map((opt) => {
                const active = prefs.dateFormat === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setPrefs((p) => ({ ...p, dateFormat: opt.value }))}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-150 ${
                      active
                        ? 'border-accent bg-accent/10' :'border-border bg-card/50 hover:border-border/80'
                    }`}
                  >
                    <div className="text-left">
                      <p className={`text-xs font-semibold ${active ? 'text-accent' : 'text-foreground'}`}>{opt.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{opt.example}</p>
                    </div>
                    {active && <Check size={14} className="text-accent flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hijri Timezone */}
          <div>
            <label className="form-label flex items-center gap-1.5 mb-2">
              <Globe size={13} className="text-muted-foreground" />
              Timezone for Hijri Conversions
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              Used when converting Gregorian dates to Hijri calendar. Affects date boundary calculations.
            </p>
            <select
              value={prefs.hijriTimezone}
              onChange={(e) => setPrefs((p) => ({ ...p, hijriTimezone: e.target.value as HijriTimezone }))}
              className="form-input"
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label} (UTC{tz.offset})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-1">
            <button
              onClick={handleSavePrefs}
              disabled={savingPrefs}
              className="btn-primary flex items-center gap-2"
            >
              {savingPrefs ? (
                <><Loader2 size={14} className="animate-spin" />Saving…</>
              ) : prefsSaved ? (
                <><Check size={14} />Saved!</>
              ) : (
                <><Save size={14} />Save Preferences</>
              )}
            </button>
          </div>
        </section>

        {/* ── Account Info (read-only) ── */}
        <section className="card-surface p-6 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Account Information</h2>
          <div className="space-y-0 divide-y divide-border/50">
            {[
              { label: 'User ID', value: user?.id ?? '—', mono: true },
              { label: 'Account created', value: user?.created_at ? new Date(user.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : '—', mono: false },
              { label: 'Last sign-in', value: user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : '—', mono: false },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2.5">
                <span className="text-xs text-muted-foreground">{row.label}</span>
                <span className={`text-xs text-foreground ${row.mono ? 'font-mono truncate max-w-[200px]' : 'font-medium'}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}

'use client';
import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Mail, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface NotificationPrefs {
  email_enabled: boolean;
  alert_30_days: boolean;
  alert_60_days: boolean;
  alert_90_days: boolean;
  alert_expired: boolean;
}

const defaultPrefs: NotificationPrefs = {
  email_enabled: true,
  alert_30_days: true,
  alert_60_days: true,
  alert_90_days: true,
  alert_expired: true,
};

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({ label, description, checked, onChange, disabled }: ToggleRowProps) {
  return (
    <div className={`flex items-center justify-between py-4 border-b border-border/50 last:border-0 ${disabled ? 'opacity-50' : ''}`}>
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent/40 ${
          checked ? 'bg-accent' : 'bg-border'
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

export default function NotificationPreferencesPage() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadPrefs();
  }, [user]);

  const loadPrefs = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setPrefs({
          email_enabled: data.email_enabled,
          alert_30_days: data.alert_30_days,
          alert_60_days: data.alert_60_days,
          alert_90_days: data.alert_90_days,
          alert_expired: data.alert_expired,
        });
      }
    } catch (err) {
      console.error('Failed to load preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...prefs,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      toast.success('Notification preferences saved');
    } catch (err: any) {
      toast.error('Failed to save preferences', { description: err?.message });
    } finally {
      setSaving(false);
    }
  };

  const updatePref = (key: keyof NotificationPrefs) => (val: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: val }));
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-accent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-card border-b border-border px-6 lg:px-8 py-5">
          <div className="max-w-screen-md mx-auto">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Notification Preferences</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Configure how and when you receive passport expiry alerts</p>
          </div>
        </div>

        <div className="max-w-screen-md mx-auto px-6 lg:px-8 py-8 space-y-6">
          {/* Email Delivery */}
          <div className="card-surface p-6">
            <div className="flex items-center gap-2 mb-1">
              <Mail size={16} className="text-accent" />
              <h2 className="text-sm font-semibold text-foreground">Email Delivery</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Control whether email notifications are sent to your account email address.</p>
            <ToggleRow
              label="Enable email notifications"
              description="Receive passport expiry alerts via email"
              checked={prefs.email_enabled}
              onChange={updatePref('email_enabled')}
            />
          </div>

          {/* Alert Thresholds */}
          <div className="card-surface p-6">
            <div className="flex items-center gap-2 mb-1">
              <Bell size={16} className="text-accent" />
              <h2 className="text-sm font-semibold text-foreground">Expiry Alert Thresholds</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Choose which expiry windows trigger an alert. Alerts are sent once per day per passport.</p>

            <ToggleRow
              label="90 days before expiry"
              description="Early warning — passport expiring within 3 months"
              checked={prefs.alert_90_days}
              onChange={updatePref('alert_90_days')}
              disabled={!prefs.email_enabled}
            />
            <ToggleRow
              label="60 days before expiry"
              description="Standard warning — passport expiring within 2 months"
              checked={prefs.alert_60_days}
              onChange={updatePref('alert_60_days')}
              disabled={!prefs.email_enabled}
            />
            <ToggleRow
              label="30 days before expiry"
              description="Urgent warning — passport expiring within 1 month"
              checked={prefs.alert_30_days}
              onChange={updatePref('alert_30_days')}
              disabled={!prefs.email_enabled}
            />
            <ToggleRow
              label="Expired passports"
              description="Alert when a passport has already expired"
              checked={prefs.alert_expired}
              onChange={updatePref('alert_expired')}
              disabled={!prefs.email_enabled}
            />
          </div>

          {/* Status Banner */}
          {!prefs.email_enabled && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-expired-bg border border-red-200">
              <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">Email notifications are disabled. No alerts will be sent until you re-enable them.</p>
            </div>
          )}

          {prefs.email_enabled && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-valid-bg border border-green-200">
              <CheckCircle2 size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-700">
                Email alerts active for:{' '}
                {[
                  prefs.alert_90_days && '90 days',
                  prefs.alert_60_days && '60 days',
                  prefs.alert_30_days && '30 days',
                  prefs.alert_expired && 'expired',
                ]
                  .filter(Boolean)
                  .join(', ') || 'no thresholds selected'}
              </p>
            </div>
          )}

          {/* Save */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save size={15} />
                  Save Preferences
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

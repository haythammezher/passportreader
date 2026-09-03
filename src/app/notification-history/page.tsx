'use client';
import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Loader2, Mail, AlertTriangle, Clock, CheckCircle2, RefreshCw } from 'lucide-react';

interface NotificationLog {
  id: string;
  passport_id: string;
  notification_type: string;
  sent_at: string;
  email_address: string;
}

function getTypeLabel(type: string): string {
  if (type === 'expired') return 'Passport Expired';
  if (type === '30_days') return '30 Days to Expiry';
  if (type === '60_days') return '60 Days to Expiry';
  if (type === '90_days') return '90 Days to Expiry';
  return type;
}

function getTypeColor(type: string): string {
  if (type === 'expired') return 'text-red-500 bg-red-50 border-red-200';
  if (type === '30_days') return 'text-orange-500 bg-orange-50 border-orange-200';
  if (type === '60_days') return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  if (type === '90_days') return 'text-blue-500 bg-blue-50 border-blue-200';
  return 'text-muted-foreground bg-secondary border-border';
}

function getTypeIcon(type: string) {
  if (type === 'expired') return <AlertTriangle size={14} />;
  if (type === '30_days') return <Clock size={14} />;
  if (type === '60_days') return <Clock size={14} />;
  if (type === '90_days') return <Bell size={14} />;
  return <Bell size={14} />;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function NotificationHistoryPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadLogs();
  }, [user]);

  const loadLogs = async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('passport_notification_log')
        .select('*')
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data ?? []);
    } catch (err) {
      console.error('Failed to load notification history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Group logs by date
  const grouped = logs.reduce<Record<string, NotificationLog[]>>((acc, log) => {
    const date = formatDate(log.sent_at);
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  const groupedEntries = Object.entries(grouped);

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
          <div className="max-w-screen-md mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Notification History</h1>
              <p className="text-sm text-muted-foreground mt-0.5">All passport expiry alerts sent to your account</p>
            </div>
            <button
              onClick={() => loadLogs(true)}
              disabled={refreshing}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        <div className="max-w-screen-md mx-auto px-6 lg:px-8 py-8">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="card-surface p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                <Mail size={16} className="text-accent" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground tabular-nums">{logs.length}</p>
                <p className="text-xs text-muted-foreground">Total Sent</p>
              </div>
            </div>
            <div className="card-surface p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertTriangle size={16} className="text-red-500" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground tabular-nums">
                  {logs.filter((l) => l.notification_type === 'expired').length}
                </p>
                <p className="text-xs text-muted-foreground">Expired Alerts</p>
              </div>
            </div>
          </div>

          {/* Log List */}
          {groupedEntries.length === 0 ? (
            <div className="card-surface p-12 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Bell size={24} className="text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">No notifications yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Passport expiry alerts will appear here once the notification system sends its first email.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedEntries.map(([date, entries]) => (
                <div key={date}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{date}</p>
                  <div className="card-surface divide-y divide-border/50">
                    {entries.map((log) => (
                      <div key={log.id} className="flex items-start gap-4 px-5 py-4">
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium flex-shrink-0 mt-0.5 ${getTypeColor(log.notification_type)}`}>
                          {getTypeIcon(log.notification_type)}
                          {getTypeLabel(log.notification_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground font-medium truncate">
                            Passport <span className="font-mono text-xs text-muted-foreground">{log.passport_id.slice(0, 8)}…</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            Sent to {log.email_address}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
                          <CheckCircle2 size={12} className="text-green-500" />
                          {formatTime(log.sent_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

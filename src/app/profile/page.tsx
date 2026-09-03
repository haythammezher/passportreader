'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';
import { User, Mail, Calendar, Shield, LogOut, Save, Loader2, Database } from 'lucide-react';

interface ProfileData {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordCount, setRecordCount] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    loadProfile();
    loadRecordCount();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error.message);
      }

      const profileData: ProfileData = {
        id: user.id,
        email: user.email ?? '',
        full_name: data?.full_name ?? user.user_metadata?.full_name ?? null,
        avatar_url: data?.avatar_url ?? null,
        created_at: data?.created_at ?? user.created_at ?? null,
      };
      setProfile(profileData);
      setFullName(profileData.full_name ?? '');
    } catch (err) {
      console.error('Profile load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRecordCount = async () => {
    if (!user) return;
    try {
      const supabase = createClient();
      const { count } = await supabase
        .from('passport_records')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setRecordCount(count ?? 0);
    } catch {
      // ignore
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, email: user.email, full_name: fullName, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Profile updated successfully');
      setProfile((prev) => prev ? { ...prev, full_name: fullName } : prev);
    } catch (err: any) {
      toast.error('Failed to update profile', { description: err?.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
      router.refresh();
    } catch (err: any) {
      toast.error('Sign out failed', { description: err?.message });
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
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
          <div className="max-w-screen-lg mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">User Profile</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Manage your account information</p>
            </div>
            <button
              onClick={handleSignOut}
              className="btn-secondary flex items-center gap-2 text-red-400 hover:text-red-300 border-red-400/30 hover:border-red-400/50"
            >
              <LogOut size={15} />
              Sign Out
            </button>
          </div>
        </div>

        <div className="max-w-screen-lg mx-auto px-6 lg:px-8 py-8 space-y-6">
          {/* Avatar + Info */}
          <div className="card-surface p-6 flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
              <span className="text-accent text-xl font-bold">
                {getInitials(profile?.full_name ?? null, profile?.email ?? '')}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {profile?.full_name || 'No name set'}
              </h2>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Shield size={12} className="text-green-400" />
                <span className="text-xs text-green-400 font-medium">Verified account</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card-surface p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Database size={18} className="text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground tabular-nums">{recordCount}</p>
                <p className="text-xs text-muted-foreground">Passport Records</p>
              </div>
            </div>
            <div className="card-surface p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Calendar size={18} className="text-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{formatDate(profile?.created_at ?? null)}</p>
                <p className="text-xs text-muted-foreground">Member since</p>
              </div>
            </div>
          </div>

          {/* Edit Profile */}
          <div className="card-surface p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <User size={15} className="text-accent" />
              Edit Profile
            </h3>
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
            <div>
              <label className="form-label">Email address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={profile?.email ?? ''}
                  className="form-input pl-9 opacity-60 cursor-not-allowed"
                  disabled
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here.</p>
            </div>
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
                  Save Changes
                </>
              )}
            </button>
          </div>

          {/* Account Info */}
          <div className="card-surface p-6 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Account Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono text-xs text-foreground truncate max-w-[200px]">{profile?.id}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Account created</span>
                <span className="text-foreground">{formatDate(profile?.created_at ?? null)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Status</span>
                <span className="text-green-400 font-medium">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

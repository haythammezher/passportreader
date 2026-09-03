import { createClient } from '@/lib/supabase/client';

export type AppRole = 'admin' | 'editor' | 'viewer';

export interface UserRoleRecord {
  id: string;
  userId: string;
  role: AppRole;
  assignedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  userId: string;
  email: string;
  fullName: string | null;
  role: AppRole;
  assignedAt: string;
}

export const roleService = {
  /** Get the current user's role */
  async getCurrentUserRole(): Promise<AppRole | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_roles').select('role').eq('user_id', user.id)
      .single();

    if (error || !data) return null;
    return data.role as AppRole;
  },

  /** Get role for a specific user id */
  async getUserRole(userId: string): Promise<AppRole | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_roles').select('role').eq('user_id', userId)
      .single();

    if (error || !data) return null;
    return data.role as AppRole;
  },

  /** List all team members with roles (admin only) */
  async listTeamMembers(): Promise<TeamMember[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_roles').select('user_id, role, created_at').order('created_at', { ascending: true });

    if (error || !data) return [];

    // Fetch profile info for each user
    const userIds = data.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from('profiles').select('id, email, full_name').in('id', userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

    return data.map((r) => {
      const profile = profileMap.get(r.user_id);
      return {
        userId: r.user_id,
        email: profile?.email ?? r.user_id,
        fullName: profile?.full_name ?? null,
        role: r.role as AppRole,
        assignedAt: r.created_at,
      };
    });
  },

  /** Assign or update a user's role (admin only) */
  async assignRole(userId: string, role: AppRole): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('user_roles')
      .upsert(
        { user_id: userId, role, assigned_by: user?.id ?? null },
        { onConflict: 'user_id' }
      );

    if (error) throw new Error(error.message);
  },

  /** Remove a user's role (admin only) */
  async removeRole(userId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  },

  /** Invite a user by email and assign a role.
   *  Since we cannot create auth users from client, we look up existing users via profiles. */
  async inviteByEmail(email: string, role: AppRole): Promise<{ found: boolean }> {
    const supabase = createClient();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (error || !profile) return { found: false };

    await roleService.assignRole(profile.id, role);
    return { found: true };
  },

  /** Permission helpers */
  canEdit(role: AppRole | null): boolean {
    return role === 'admin' || role === 'editor';
  },

  canDelete(role: AppRole | null): boolean {
    return role === 'admin';
  },

  canManageUsers(role: AppRole | null): boolean {
    return role === 'admin';
  },

  getRoleBadgeColor(role: AppRole): string {
    switch (role) {
      case 'admin': return 'bg-red-500/15 text-red-400 border-red-500/20';
      case 'editor': return 'bg-blue-500/15 text-blue-400 border-blue-500/20';
      case 'viewer': return 'bg-slate-500/15 text-slate-400 border-slate-500/20';
    }
  },

  getRoleLabel(role: AppRole): string {
    switch (role) {
      case 'admin': return 'Admin';
      case 'editor': return 'Editor';
      case 'viewer': return 'Viewer';
    }
  },

  getRoleDescription(role: AppRole): string {
    switch (role) {
      case 'admin': return 'Full access: manage records, users, and settings';
      case 'editor': return 'Can create, edit, and import passport records';
      case 'viewer': return 'Read-only access to passport records';
    }
  },
};

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Users, Shield, UserPlus, Trash2, RefreshCw, ChevronDown, Search, AlertTriangle, Info } from 'lucide-react';
import { roleService, type AppRole, type TeamMember } from '@/lib/services/roleService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const ROLES: AppRole[] = ['admin', 'editor', 'viewer'];

function RoleBadge({ role }: { role: AppRole }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleService.getRoleBadgeColor(role)}`}>
      {roleService.getRoleLabel(role)}
    </span>
  );
}

function RoleSelect({ value, onChange, disabled }: { value: AppRole; onChange: (r: AppRole) => void; disabled?: boolean }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AppRole)}
        disabled={disabled}
        className="appearance-none bg-secondary border border-border rounded-lg px-3 py-1.5 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>{roleService.getRoleLabel(r)}</option>
        ))}
      </select>
      <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
    </div>
  );
}

export default function UserManagementContent() {
  const { user, userRole } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AppRole>('viewer');
  const [inviting, setInviting] = useState(false);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await roleService.listTeamMembers();
      setMembers(data);
    } catch {
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    if (userId === user?.id) {
      toast.error('You cannot change your own role');
      return;
    }
    setUpdatingId(userId);
    try {
      await roleService.assignRole(userId, newRole);
      setMembers((prev) => prev.map((m) => m.userId === userId ? { ...m, role: newRole } : m));
      toast.success('Role updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (userId: string, email: string) => {
    if (userId === user?.id) {
      toast.error('You cannot remove yourself');
      return;
    }
    setRemovingId(userId);
    try {
      await roleService.removeRole(userId);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
      toast.success(`Removed ${email} from team`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove member');
    } finally {
      setRemovingId(null);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const result = await roleService.inviteByEmail(inviteEmail.trim(), inviteRole);
      if (!result.found) {
        toast.error('No registered user found with that email. They must sign up first.');
      } else {
        toast.success(`${inviteEmail} has been assigned the ${roleService.getRoleLabel(inviteRole)} role`);
        setInviteEmail('');
        await loadMembers();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign role');
    } finally {
      setInviting(false);
    }
  };

  const filtered = members.filter((m) =>
    m.email.toLowerCase().includes(search.toLowerCase()) ||
    (m.fullName ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: members.length,
    admins: members.filter((m) => m.role === 'admin').length,
    editors: members.filter((m) => m.role === 'editor').length,
    viewers: members.filter((m) => m.role === 'viewer').length,
  };

  if (userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
          <Shield size={32} className="text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
        <p className="text-muted-foreground text-center max-w-sm">
          Only administrators can manage user roles and team access. Contact your admin to request access.
        </p>
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border ${userRole ? roleService.getRoleBadgeColor(userRole) : 'bg-slate-500/15 text-slate-400 border-slate-500/20'}`}>
          Your role: {userRole ? roleService.getRoleLabel(userRole) : 'No role assigned'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users size={24} className="text-accent" />
            User Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage team access and control edit permissions for passport records
          </p>
        </div>
        <button
          onClick={loadMembers}
          disabled={loading}
          className="btn-secondary"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Members', value: stats.total, color: 'text-foreground' },
          { label: 'Admins', value: stats.admins, color: 'text-red-400' },
          { label: 'Editors', value: stats.editors, color: 'text-blue-400' },
          { label: 'Viewers', value: stats.viewers, color: 'text-slate-400' },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Role Permissions Info */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info size={15} className="text-accent" />
          <span className="text-sm font-semibold text-foreground">Role Permissions</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ROLES.map((r) => (
            <div key={r} className="flex items-start gap-2.5">
              <RoleBadge role={r} />
              <p className="text-xs text-muted-foreground leading-relaxed">{roleService.getRoleDescription(r)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Invite / Assign Role */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <UserPlus size={15} className="text-accent" />
          Assign Role to Existing User
        </h2>
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            placeholder="user@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
            className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <RoleSelect value={inviteRole} onChange={setInviteRole} />
          <button
            type="submit"
            disabled={inviting || !inviteEmail.trim()}
            className="btn-primary whitespace-nowrap"
          >
            {inviting ? <RefreshCw size={14} className="animate-spin" /> : <UserPlus size={14} />}
            Assign Role
          </button>
        </form>
        <p className="text-xs text-muted-foreground mt-2">
          The user must already have a registered account. Enter their email to assign a role.
        </p>
      </div>

      {/* Members Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Team Members</h2>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-secondary border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 w-48"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Users size={32} className="text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">
              {search ? 'No members match your search' : 'No team members yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Assigned</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((member) => {
                  const isCurrentUser = member.userId === user?.id;
                  const isUpdating = updatingId === member.userId;
                  const isRemoving = removingId === member.userId;
                  return (
                    <tr key={member.userId} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
                            <span className="text-accent text-xs font-bold">
                              {(member.fullName || member.email).slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">
                              {member.fullName || member.email}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs text-accent font-normal">(you)</span>
                              )}
                            </p>
                            {member.fullName && (
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {isCurrentUser ? (
                          <RoleBadge role={member.role} />
                        ) : (
                          <div className="flex items-center gap-2">
                            <RoleSelect
                              value={member.role}
                              onChange={(r) => handleRoleChange(member.userId, r)}
                              disabled={isUpdating || isRemoving}
                            />
                            {isUpdating && <RefreshCw size={13} className="animate-spin text-muted-foreground" />}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {new Date(member.assignedAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {!isCurrentUser && (
                          <button
                            onClick={() => handleRemove(member.userId, member.email)}
                            disabled={isRemoving || isUpdating}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                            title="Remove access"
                          >
                            {isRemoving ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 bg-amber-500/8 border border-amber-500/20 rounded-xl p-4">
        <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-300">Important</p>
          <p className="text-xs text-amber-400/80 mt-0.5">
            Role changes take effect immediately. Viewers cannot create or edit records. Editors cannot delete records or manage users. Only admins have full access.
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';

import { createClient } from '@/lib/supabase/client';

export type AuditAction =
  | 'create' |'update' |'delete' |'bulk_delete' |'bulk_import' |'export' |'view';

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

interface AuditLogRow {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

function rowToEntry(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    action: row.action as AuditAction,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityLabel: row.entity_label,
    details: row.details,
    createdAt: row.created_at,
  };
}

export const auditService = {
  async log(
    action: AuditAction,
    entityId: string | null,
    entityLabel: string | null,
    details?: Record<string, unknown>
  ): Promise<void> {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('audit_log').insert({
        user_id: user?.id ?? null,
        user_email: user?.email ?? null,
        action,
        entity_type: 'passport_record',
        entity_id: entityId,
        entity_label: entityLabel,
        details: details ?? null,
      });
    } catch {
      // Audit logging should never break the main flow
    }
  },

  async getAll(limit = 200): Promise<AuditLogEntry[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching audit log:', error.message);
      return [];
    }

    return (data as AuditLogRow[]).map(rowToEntry);
  },
};

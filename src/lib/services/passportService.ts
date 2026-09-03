'use client';

import { createClient } from '@/lib/supabase/client';
import { type PassportRecord, enrichPassport, type EnrichedPassport } from '@/lib/passportData';

// DB row shape (snake_case)
interface PassportRow {
  id: string;
  user_id?: string | null;
  holder_name: string;
  holder_name_ar?: string | null;
  nationality: string;
  nationality_code: string;
  flag_emoji?: string | null;
  passport_number: string;
  document_type: string;
  sex: string;
  date_of_birth: string;
  place_of_birth?: string | null;
  issue_date: string;
  expiry_date: string;
  issuing_authority?: string | null;
  issuing_country: string;
  personal_number?: string | null;
  mrz_line1?: string | null;
  mrz_line2?: string | null;
  mrz_valid: boolean;
  notes?: string | null;
  created_at: string;
  updated_at?: string | null;
}

function rowToRecord(row: PassportRow): PassportRecord {
  return {
    id: row.id,
    holderName: row.holder_name,
    holderNameAr: row.holder_name_ar ?? undefined,
    nationality: row.nationality,
    nationalityCode: row.nationality_code,
    flagEmoji: row.flag_emoji ?? '',
    passportNumber: row.passport_number,
    documentType: row.document_type,
    sex: row.sex as 'M' | 'F',
    dateOfBirth: row.date_of_birth,
    placeOfBirth: row.place_of_birth ?? '',
    issueDate: row.issue_date,
    expiryDate: row.expiry_date,
    issuingAuthority: row.issuing_authority ?? '',
    issuingCountry: row.issuing_country,
    personalNumber: row.personal_number ?? undefined,
    mrzLine1: row.mrz_line1 ?? '',
    mrzLine2: row.mrz_line2 ?? '',
    mrzValid: row.mrz_valid,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

function recordToRow(record: Omit<PassportRecord, 'id' | 'createdAt'>): Omit<PassportRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    holder_name: record.holderName,
    holder_name_ar: record.holderNameAr ?? null,
    nationality: record.nationality,
    nationality_code: record.nationalityCode,
    flag_emoji: record.flagEmoji ?? null,
    passport_number: record.passportNumber,
    document_type: record.documentType,
    sex: record.sex,
    date_of_birth: record.dateOfBirth,
    place_of_birth: record.placeOfBirth ?? null,
    issue_date: record.issueDate,
    expiry_date: record.expiryDate,
    issuing_authority: record.issuingAuthority ?? null,
    issuing_country: record.issuingCountry,
    personal_number: record.personalNumber ?? null,
    mrz_line1: record.mrzLine1 ?? null,
    mrz_line2: record.mrzLine2 ?? null,
    mrz_valid: record.mrzValid,
    notes: record.notes ?? null,
  };
}

export const passportService = {
  async getAll(): Promise<EnrichedPassport[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('passport_records')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching passport records:', error.message);
      return [];
    }

    return (data as PassportRow[]).map(row => enrichPassport(rowToRecord(row)));
  },

  async create(record: Omit<PassportRecord, 'id' | 'createdAt'>): Promise<EnrichedPassport | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const row = recordToRow(record);

    const { data, error } = await supabase
      .from('passport_records')
      .insert({ ...row, user_id: user.id })
      .select()
      .single();

    if (error) {
      console.error('Error creating passport record:', error.message);
      return null;
    }

    return enrichPassport(rowToRecord(data as PassportRow));
  },

  async delete(id: string): Promise<boolean> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('passport_records')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting passport record:', error.message);
      return false;
    }
    return true;
  },

  async deleteMany(ids: string[]): Promise<boolean> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('passport_records')
      .delete()
      .in('id', ids)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting passport records:', error.message);
      return false;
    }
    return true;
  },

  subscribeToChanges(callback: (records: EnrichedPassport[]) => void) {
    const supabase = createClient();
    const channel = supabase
      .channel('passport_records_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'passport_records' },
        async () => {
          const records = await passportService.getAll();
          callback(records);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

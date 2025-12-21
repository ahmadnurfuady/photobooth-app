// lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Frame, PhotoSession } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ✅ AMAN: Service Key ini undefined di Browser, tapi ada di Server
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 1. Client-side Supabase client (Aman untuk Browser)
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// 2. Server-side Supabase client (Admin)
// ✅ PERBAIKAN: Kita cek dulu apakah kuncinya ada.
// Jika tidak ada (di browser), kita isi object kosong/null agar tidak CRASH saat file di-load.
export const supabaseAdmin: SupabaseClient = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : (null as any); // Fallback agar tidak error di browser

// Database types
export type Database = {
  public: {
    Tables: {
      frames: {
        Row: Frame;
        Insert: Omit<Frame, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Frame, 'id' | 'created_at' | 'updated_at'>>;
      };
      photo_sessions: {
        Row: PhotoSession;
        // ✅ PERBAIKAN DARI LANGKAH SEBELUMNYA (Agar bisa insert ID manual)
        Insert: Omit<PhotoSession, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<PhotoSession, 'id' | 'created_at'>>;
      };
    };
  };
};

// Helper functions
export const frameQueries = {
  getAll: async (activeOnly: boolean = false) => {
    let query = supabase.from('frames').select('*').order('created_at', { ascending: false });
    if (activeOnly) {
      query = query.eq('is_active', true);
    }
    return query;
  },

  getById: async (id: string) => {
    return supabase.from('frames').select('*').eq('id', id).single();
  },

  create: async (frame: Database['public']['Tables']['frames']['Insert']) => {
    // Pastikan jalan di server
    if (!supabaseAdmin) throw new Error("Cannot run admin query on client");
    return supabaseAdmin.from('frames').insert(frame).select().single();
  },

  update: async (id: string, updates: Database['public']['Tables']['frames']['Update']) => {
    if (!supabaseAdmin) throw new Error("Cannot run admin query on client");
    return supabaseAdmin.from('frames').update(updates).eq('id', id).select().single();
  },

  delete: async (id: string) => {
    if (!supabaseAdmin) throw new Error("Cannot run admin query on client");
    return supabaseAdmin.from('frames').delete().eq('id', id);
  },
};

export const sessionQueries = {
  getById: async (id: string) => {
    return supabase.from('photo_sessions').select('*').eq('id', id).single();
  },

  create: async (session: Database['public']['Tables']['photo_sessions']['Insert']) => {
    // ✅ PENTING: Gunakan supabaseAdmin agar bisa bypass RLS saat upload
    if (!supabaseAdmin) throw new Error("Session creation must be done on server API");
    return supabaseAdmin.from('photo_sessions').insert(session).select().single();
  },

  update: async (id: string, updates: Database['public']['Tables']['photo_sessions']['Update']) => {
    if (!supabaseAdmin) throw new Error("Update must be done on server API");
    return supabaseAdmin.from('photo_sessions').update(updates).eq('id', id).select().single();
  },

  getExpiredSessions: async () => {
    if (!supabaseAdmin) return { data: [], error: null };
    return supabaseAdmin
      .from('photo_sessions')
      .select('*')
      .lt('expires_at', new Date().toISOString())
      .eq('files_deleted', false);
  },

  getOldSessions: async (daysOld: number = 3) => {
    if (!supabaseAdmin) return { data: [], error: null };
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return supabaseAdmin
      .from('photo_sessions')
      .select('*')
      .lt('created_at', cutoffDate.toISOString())
      .eq('files_deleted', false);
  },
};
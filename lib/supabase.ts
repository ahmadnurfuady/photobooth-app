// lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Frame, PhotoSession } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client-side Supabase client (public, anon key)
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client (admin, service role key)
// ONLY use this in API routes or server components
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Database types for better TypeScript support
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
        Insert: Omit<PhotoSession, 'id' | 'created_at'>;
        Update: Partial<Omit<PhotoSession, 'id' | 'created_at'>>;
      };
    };
  };
};

// Helper functions for common queries
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
    return supabaseAdmin.from('frames').insert(frame).select().single();
  },

  update: async (id: string, updates: Database['public']['Tables']['frames']['Update']) => {
    return supabaseAdmin.from('frames').update(updates).eq('id', id).select().single();
  },

  delete: async (id: string) => {
    return supabaseAdmin.from('frames').delete().eq('id', id);
  },
};

export const sessionQueries = {
  getById: async (id: string) => {
    return supabase.from('photo_sessions').select('*').eq('id', id).single();
  },

  create: async (session: Database['public']['Tables']['photo_sessions']['Insert']) => {
    return supabase.from('photo_sessions').insert(session).select().single();
  },

  update: async (id: string, updates: Database['public']['Tables']['photo_sessions']['Update']) => {
    return supabase.from('photo_sessions').update(updates).eq('id', id).select().single();
  },

  getExpiredSessions: async () => {
    return supabaseAdmin
      .from('photo_sessions')
      .select('*')
      .lt('expires_at', new Date().toISOString())
      .eq('files_deleted', false);
  },

  getOldSessions: async (daysOld: number = 3) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return supabaseAdmin
      .from('photo_sessions')
      .select('*')
      .lt('created_at', cutoffDate.toISOString())
      .eq('files_deleted', false);
  },
};
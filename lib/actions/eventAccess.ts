'use server';

// ❌ HAPUS: import { createClient } from '@supabase/supabase-js';
// ✅ GANTI DENGAN INI: Import supabaseAdmin dari konfigurasi yang sudah ada
import { supabaseAdmin } from '../supabase'; 

export async function verifyEventAccess(code: string) {
  // Cek apakah Admin Client berhasil di-load (Kunci Service Role ada)
  if (!supabaseAdmin) {
    console.error("❌ Supabase Admin belum siap. Pastikan SUPABASE_SERVICE_ROLE_KEY ada di .env");
    return { success: false, message: 'Terjadi kesalahan konfigurasi server.' };
  }

  // 1. Cari Event berdasarkan Kode
  // Menggunakan supabaseAdmin agar bisa bypass RLS (memastikan data terbaca)
  const { data: event, error } = await supabaseAdmin
    .from('events')
    .select('id, name, max_sessions, expires_at, is_active')
    .eq('access_code', code)
    .single();

  if (error || !event) {
    return { success: false, message: 'Kode akses tidak valid.' };
  }

  if (!event.is_active) {
    return { success: false, message: 'Event ini sedang tidak aktif.' };
  }

  // 2. Cek Batas Waktu (Time Limit)
  if (event.expires_at) {
    const now = new Date();
    const expiry = new Date(event.expires_at);
    if (now > expiry) {
      return { success: false, message: 'Waktu sewa event sudah habis.' };
    }
  }

  // 3. Cek Batas Kuota (Session Limit)
  if (event.max_sessions > 0) {
    // Hitung jumlah sesi yang sudah terjadi di event ini
    const { count } = await supabaseAdmin
      .from('sessions') // Pastikan nama tabelnya 'sessions' atau 'photo_sessions' sesuai DB kamu
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event.id);

    // Perbaikan logika null check
    const currentCount = count || 0;

    if (currentCount >= event.max_sessions) {
      return { success: false, message: 'Kuota foto sudah habis. Hubungi admin.' };
    }
  }

  // 4. Sukses! Kembalikan data event
  return { success: true, eventId: event.id, eventName: event.name };
}
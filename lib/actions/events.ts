// lib/actions/events.ts
'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

// 1. Ambil Semua Event (Dengan Auto-Expire Check)
export async function getEvents() {
  try {
    // A. LOGIKA AUTO-EXPIRE (Lazy Check)
    // Cek event yang aktif TAPI sudah lewat tanggal expire-nya
    const now = new Date().toISOString();
    
    // Matikan event yang sudah expire secara otomatis
    await supabaseAdmin
      .from('events')
      .update({ is_active: false })
      .eq('is_active', true) // Hanya yang sedang aktif
      .lt('expires_at', now); // Yang tanggal expire-nya kurang dari SEKARANG

    // B. AMBIL DATA
    // Kita ambil juga count dari tabel relasi photo_sessions
    const { data, error } = await supabaseAdmin
      .from('events')
      .select('*, photo_sessions(count)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching events:', error);
      return [];
    }

    // Formatting data agar mudah dibaca frontend
    return data.map((event: any) => ({
      ...event,
      // session_count mengambil jumlah baris di tabel photo_sessions.
      // Jika sistem hapus kamu adalah Hard Delete, angka ini akan berkurang saat dihapus.
      // Jika sistem hapus kamu Soft Delete, angka ini tetap bertahan.
      session_count: event.photo_sessions[0]?.count || 0, 
    }));
  } catch (err) {
    console.error("Unexpected error in getEvents:", err);
    return [];
  }
}

// 2. Buat Event Baru (Lengkap dengan Kode, Limit, Expire)
export async function createEvent(
  name: string, 
  accessCode: string, 
  maxSessions: number, 
  expiresAt: string | null
) {
  try {
    // Pastikan kode akses unik (walaupun di DB sudah ada constraint unique, double check di sini bagus)
    const { data: existing } = await supabaseAdmin
        .from('events')
        .select('id')
        .eq('access_code', accessCode)
        .single();
    
    if (existing) {
        throw new Error("Kode Akses sudah digunakan event lain.");
    }

    const { error } = await supabaseAdmin
      .from('events')
      .insert({ 
        name, 
        access_code: accessCode,       
        max_sessions: maxSessions,     
        expires_at: expiresAt || null, 
        is_active: false // Default tidak aktif
      }); 

    if (error) throw new Error(error.message);
    
    revalidatePath('/admin/events'); // Refresh halaman admin
    return { success: true };
  } catch (error: any) {
    console.error('Error creating event:', error);
    throw new Error(error.message || 'Gagal membuat event');
  }
}

// 3. Set Event Jadi Aktif (Dan matikan event lain)
export async function activateEvent(eventId: string) {
  try {
    // Langkah A: Matikan semua event dulu
    // Kita update semua row agar is_active = false
    await supabaseAdmin
      .from('events')
      .update({ is_active: false })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Trik untuk select all rows tanpa where spesifik

    // Langkah B: Aktifkan event yang dipilih
    const { error } = await supabaseAdmin
      .from('events')
      .update({ is_active: true })
      .eq('id', eventId);

    if (error) throw new Error(error.message);
    
    revalidatePath('/admin/events');
    revalidatePath('/'); // Refresh Landing Page agar Gembok berubah kode aksesnya
    return { success: true };
  } catch (error: any) {
    console.error('Error activating event:', error);
    throw new Error(error.message);
  }
}

// 4. Ambil Event yang Sedang Aktif (Untuk Landing Page Public)
export async function getActiveEvent() {
  const { data } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('is_active', true)
    .single();
  
  return data;
}

// 5. Ambil Detail Event beserta Session-nya (Untuk Halaman Detail Admin)
export async function getEventById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('events')
    .select(`
      *,
      photo_sessions (
        id,
        composite_url,
        created_at,
        files_deleted 
      )
    `)
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

// 6. Hapus Event (Optional, buat jaga-jaga)
export async function deleteEvent(id: string) {
    try {
        const { error } = await supabaseAdmin
            .from('events')
            .delete()
            .eq('id', id);

        if (error) throw error;
        revalidatePath('/admin/events');
        return { success: true };
    } catch (error) {
        console.error("Error deleting event:", error);
        return { success: false };
    }
}

// 7. Update Event (Edit)
export async function updateEvent(
  id: string,
  data: {
    name: string;
    accessCode: string;
    maxSessions: number;
    expiresAt: string | null;
  }
) {
  try {
    // Cek apakah kode akses baru bentrok dengan event LAIN (selain event ini sendiri)
    const { data: existing } = await supabaseAdmin
        .from('events')
        .select('id')
        .eq('access_code', data.accessCode)
        .neq('id', id) // Kecualikan diri sendiri
        .single();
    
    if (existing) {
        throw new Error("Kode Akses sudah digunakan event lain.");
    }

    const { error } = await supabaseAdmin
      .from('events')
      .update({
        name: data.name,
        access_code: data.accessCode,
        max_sessions: data.maxSessions,
        expires_at: data.expiresAt,
      })
      .eq('id', id);

    if (error) throw new Error(error.message);

    revalidatePath('/admin/events');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating event:', error);
    throw new Error(error.message || 'Gagal mengupdate event');
  }
}

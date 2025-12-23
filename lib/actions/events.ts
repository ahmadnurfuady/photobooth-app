'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Gunakan Service Role Key untuk Admin Action agar aman/bypass RLS jika perlu
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

// 1. Ambil Semua Event (Beserta jumlah sesi foto)
export async function getEvents() {
  const { data, error } = await supabaseAdmin
    .from('events')
    .select('*, photo_sessions(count)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching events:', error);
    return [];
  }

  // Formatting data agar lebih mudah dibaca di frontend
  return data.map((event: any) => ({
    ...event,
    session_count: event.photo_sessions[0]?.count || 0, // Mengambil hasil count
  }));
}

// 2. Buat Event Baru
export async function createEvent(name: string) {
  const { error } = await supabaseAdmin
    .from('events')
    .insert({ name, is_active: false }); // Default tidak aktif dulu

  if (error) throw new Error(error.message);
  revalidatePath('/admin/events'); // Refresh halaman admin
}

// 3. Set Event Jadi Aktif (Dan matikan event lain)
export async function activateEvent(eventId: string) {
  // Langkah A: Matikan semua event dulu
  await supabaseAdmin
    .from('events')
    .update({ is_active: false })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Hack simple update all rows

  // Langkah B: Aktifkan event yang dipilih
  const { error } = await supabaseAdmin
    .from('events')
    .update({ is_active: true })
    .eq('id', eventId);

  if (error) throw new Error(error.message);
  revalidatePath('/admin/events');
  revalidatePath('/'); // Refresh Landing Page juga!
}

// 4. Ambil Event yang Sedang Aktif (Untuk Landing Page)
export async function getActiveEvent() {
  const { data } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('is_active', true)
    .single();
  
  return data;
}

// ... (kode sebelumnya tetap ada)

// 5. Ambil Detail Event beserta Session-nya
export async function getEventById(id: string) {
  // Ambil data event DAN relasi photo_sessions
  const { data, error } = await supabaseAdmin
    .from('events')
    .select(`
      *,
      photo_sessions (
        id,
        composite_url,
        created_at
      )
    `)
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}
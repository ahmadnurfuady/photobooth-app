'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getDashboardStats() {
  try {
    // 1. Hitung Total Events (Semua, termasuk yang tidak aktif)
    // Catatan: Jika event sudah di-hard delete (hapus permanen), datanya hilang dari DB.
    // Jika ingin menghitung yang terhapus, kita butuh tabel 'log_history' terpisah.
    // Kode ini menghitung semua event yang ADA di database saat ini.
    const { count: totalEvents, error: errEvents } = await supabaseAdmin
      .from('events')
      .select('*', { count: 'exact', head: true });

    // 2. Hitung Total Sessions (Menjumlahkan semua baris di tabel photo_sessions)
    const { count: totalSessions, error: errSessions } = await supabaseAdmin
      .from('photo_sessions')
      .select('*', { count: 'exact', head: true });

    // 3. Hitung Total Frames
    const { count: totalFrames, error: errFrames } = await supabaseAdmin
      .from('frames')
      .select('*', { count: 'exact', head: true });
      
    // 4. Hitung Active Frames
    const { count: activeFrames } = await supabaseAdmin
      .from('frames')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // 5. (Opsional) Hitung Storage Terpakai (Estimasi kasar)
    // Asumsi rata-rata 1 sesi = 2MB (3 foto + 1 strip + 1 gif)
    const estimatedStorage = (totalSessions || 0) * 2; // dalam MB

    if (errEvents || errSessions || errFrames) {
      console.error("Error fetching stats:", errEvents, errSessions, errFrames);
    }

    return {
      totalEvents: totalEvents || 0,
      totalSessions: totalSessions || 0,
      totalFrames: totalFrames || 0,
      activeFrames: activeFrames || 0,
      inactiveFrames: (totalFrames || 0) - (activeFrames || 0),
      storageUsed: estimatedStorage
    };

  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    return {
      totalEvents: 0,
      totalSessions: 0,
      totalFrames: 0,
      activeFrames: 0,
      inactiveFrames: 0,
      storageUsed: 0
    };
  }
}
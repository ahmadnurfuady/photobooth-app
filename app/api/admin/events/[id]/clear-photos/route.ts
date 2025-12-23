import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Setup Admin Client (Bypass RLS untuk delete)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> } // Format Next.js 15+
) {
  try {
    // 1. Await params (Wajib di Next.js 15)
    const { id: eventId } = await params;

    // 2. HITUNG STATISTIK TERAKHIR (Sebelum dihapus)
    const { count, error: countError } = await supabaseAdmin
      .from('photo_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId);

    if (countError) throw countError;

    // 3. SIMPAN STATISTIK KE TABEL EVENTS (Arsip)
    const { error: updateError } = await supabaseAdmin
      .from('events')
      .update({
        preserved_stats: { 
            total_sessions: count, 
            deleted_at: new Date().toISOString() 
        }
      })
      .eq('id', eventId);

    if (updateError) throw updateError;

    // 4. HAPUS DATA FOTO DARI DB
    const { error: deleteError } = await supabaseAdmin
      .from('photo_sessions')
      .delete()
      .eq('event_id', eventId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true, message: "Foto dihapus, statistik aman." });

  } catch (error: any) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
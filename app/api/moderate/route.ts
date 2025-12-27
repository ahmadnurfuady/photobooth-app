import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Gunakan SERVICE ROLE KEY agar bisa update data meskipun ada RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { photo_id, action, pin, event_id } = body;

    if (!photo_id || !action || !event_id) {
        return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    // 1. VERIFIKASI PIN DULU (Wajib!)
    // Kita ambil PIN event dari database untuk dicocokkan
    const { data: event } = await supabaseAdmin
        .from('events')
        .select('pin')
        .eq('id', event_id)
        .single();

    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    // Cek apakah PIN cocok (jika event punya PIN)
    if (event.pin && event.pin !== pin) {
        return NextResponse.json({ error: 'PIN Salah!' }, { status: 403 });
    }

    // 2. EKSEKUSI UPDATE
    const isHidden = action === 'hide';
    
    const { error } = await supabaseAdmin
        .from('photos')
        .update({ is_hidden: isHidden })
        .eq('id', photo_id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, is_hidden: isHidden });

  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
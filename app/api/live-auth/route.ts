import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Pastikan menggunakan SERVICE ROLE KEY
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, event_id, input_pin } = body;

    console.log(`[AUTH API] Mode: ${mode}, EventID: ${event_id}`);

    // MODE 1: CEK STATUS LOCK
    if (mode === 'check_lock') {
      const { data, error } = await supabaseAdmin
        .from('events')
        .select('pin')
        .eq('id', event_id)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }

      // Cek apakah pin ada isinya
      const isLocked = data.pin && String(data.pin).trim() !== '';
      return NextResponse.json({ isLocked });
    }

    // MODE 2: VERIFIKASI PIN
    if (mode === 'verify') {
      const { data, error } = await supabaseAdmin
        .from('events')
        .select('pin')
        .eq('id', event_id)
        .single();

      if (error || !data) {
        console.error("[AUTH ERROR] Event tidak ditemukan di DB");
        return NextResponse.json({ valid: false });
      }

      // --- DEBUGGING (CONTEKAN) ---
      // Lihat terminal VSCode Anda saat login, PIN asli akan muncul di sana
      console.log("🔍 [DEBUG PIN]", { 
          PIN_DATABASE: data.pin, 
          PIN_INPUT_USER: input_pin 
      });

      // Normalisasi: Ubah ke String dan Hapus Spasi depan/belakang
      const dbPin = data.pin ? String(data.pin).trim() : "";
      const userPin = input_pin ? String(input_pin).trim() : "";

      // Bandingkan
      const isValid = dbPin === userPin;
      
      if (isValid) {
          console.log("✅ LOGIN SUKSES");
      } else {
          console.log("❌ PIN TIDAK COCOK");
      }
      
      return NextResponse.json({ valid: isValid });
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });

  } catch (error) {
    console.error("[AUTH CRITICAL ERROR]", error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
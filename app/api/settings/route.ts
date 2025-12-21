// app/api/settings/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase'; // Pastikan pakai admin client

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('theme_settings')
    .select('*')
    .single(); // Ambil 1 baris saja

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  
  // Update baris pertama (kita asumsikan cuma ada 1 settingan global)
  // Kita update berdasarkan ID atau ambil baris pertama yang ada
  const { data: existing } = await supabaseAdmin.from('theme_settings').select('id').single();
  
  if (!existing) {
     // Jika kosong, insert baru
     const { error } = await supabaseAdmin.from('theme_settings').insert(body);
     if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
     // Update existing
     const { error } = await supabaseAdmin
        .from('theme_settings')
        .update(body)
        .eq('id', existing.id);
     if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
import { NextResponse } from 'next/server';
// ❌ HAPUS import statis ini

import { createClient } from '@supabase/supabase-js';

// Setup Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    // 🚀 OPTIMASI: Import Google HANYA saat endpoint ini dipanggil
    // Ini membuat server start-up jauh lebih cepat dan bundle size mengecil
    const { google } = await import('googleapis');

    // 1. Ambil Kunci dari Database
    const { data: settings } = await supabaseAdmin.from('app_settings').select('*');
    
    // Helper untuk ambil value berdasarkan key
    const getSetting = (key: string) => settings?.find((s) => s.key === key)?.value;

    const clientId = getSetting('google_client_id');
    const clientSecret = getSetting('google_client_secret');
    const redirectUri = getSetting('google_redirect_uri'); 

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json({ error: "Konfigurasi Google belum lengkap di Settings." }, { status: 400 });
    }

    // 2. Inisialisasi Google OAuth
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // 3. Generate URL Login
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', 
      scope: ['https://www.googleapis.com/auth/drive.file'],
      prompt: 'consent' 
    });

    // 4. Lempar Admin ke Google
    return NextResponse.redirect(authUrl);

  } catch (error: any) {
    console.error("Auth Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
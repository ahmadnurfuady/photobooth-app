import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  // Jika user klik "Cancel" di Google
  if (error) {
    return NextResponse.redirect(new URL('/admin/settings?error=access_denied', req.url));
  }

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  try {
    // 1. Ambil Kunci lagi dari DB
    const { data: settings } = await supabaseAdmin.from('app_settings').select('*');
    const getSetting = (key: string) => settings?.find((s) => s.key === key)?.value;

    const oauth2Client = new google.auth.OAuth2(
      getSetting('google_client_id'),
      getSetting('google_client_secret'),
      getSetting('google_redirect_uri')
    );

    // 2. TUKAR CODE JADI TOKEN (Momen Kebenaran!)
    const { tokens } = await oauth2Client.getToken(code);

    // 3. Simpan Refresh Token ke Database
    // Refresh token adalah "Kunci Abadi". Access token cuma tahan 1 jam.
    if (tokens.refresh_token) {
        await supabaseAdmin.from('app_settings').upsert({
            key: 'google_refresh_token',
            value: tokens.refresh_token,
            updated_at: new Date().toISOString()
        });
    }

    // (Opsional) Simpan Access token juga buat cache
    if (tokens.access_token) {
        await supabaseAdmin.from('app_settings').upsert({
            key: 'google_access_token',
            value: tokens.access_token,
            updated_at: new Date().toISOString()
        });
    }
    
    // Simpan email akun yang terhubung (biar Admin tau ini akun siapa)
    oauth2Client.setCredentials(tokens);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const about = await drive.about.get({ fields: 'user(emailAddress, displayName)' });
    const userEmail = about.data.user?.emailAddress || 'Unknown';

    await supabaseAdmin.from('app_settings').upsert({
        key: 'google_connected_email',
        value: userEmail,
        updated_at: new Date().toISOString()
    });

    // 4. Sukses! Balik ke halaman Settings
    return NextResponse.redirect(new URL('/admin/settings?status=connected', req.url));

  } catch (err: any) {
    console.error("Callback Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
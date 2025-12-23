'use server';

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import archiver from 'archiver';
import { PassThrough } from 'stream';

// Setup Supabase Admin
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function backupEventToDrive(eventId: string) {
  try {
    // 1. CEK KONEKSI GOOGLE
    const { data: settings } = await supabaseAdmin.from('app_settings').select('*');
    const getSetting = (key: string) => settings?.find((s) => s.key === key)?.value;

    const clientId = getSetting('google_client_id');
    const clientSecret = getSetting('google_client_secret');
    const refreshToken = getSetting('google_refresh_token');

    if (!clientId || !clientSecret || !refreshToken) {
      return { success: false, error: "Google Drive belum terhubung." };
    }

    const auth = new google.auth.OAuth2(clientId, clientSecret);
    auth.setCredentials({ refresh_token: refreshToken });
    const drive = google.drive({ version: 'v3', auth });

    // 2. AMBIL DATA DARI DB
    const { data: event } = await supabaseAdmin.from('events').select('name').eq('id', eventId).single();
    
    const { data: sessions } = await supabaseAdmin
        .from('photo_sessions')
        .select('*')
        .eq('event_id', eventId);

    if (!sessions || sessions.length === 0) {
      return { success: false, error: "Database kosong: Tidak ada sesi foto." };
    }

    console.log(`[BACKUP] Memulai Backup Paket Komplit untuk ${sessions.length} sesi.`);

    // 3. PERSIAPAN ZIP
    const archive = archiver('zip', { zlib: { level: 9 } });
    const passThrough = new PassThrough();
    archive.pipe(passThrough);

    let successCount = 0;

    // --- FUNGSI DOWNLOAD (UNIVERSAL) ---
    const downloadFile = async (url: string) => {
        try {
            if (!url || typeof url !== 'string') return null;
            
            // A. KASUS SUPABASE STORAGE
            if (url.includes('/storage/v1/object/public/photos/') || url.includes('supabase.co')) {
                let path = '';
                if (url.includes('/photos/')) {
                    path = url.split('/photos/')[1];
                }
                path = decodeURIComponent(path);
                
                if (path) {
                    const { data, error } = await supabaseAdmin.storage.from('photos').download(path);
                    if (!error && data) {
                        return Buffer.from(await data.arrayBuffer());
                    }
                }
            }

            // B. KASUS CLOUDINARY / EXTERNAL
            const response = await fetch(url);
            if (response.ok) {
                return Buffer.from(await response.arrayBuffer());
            }
        } catch (err) {
            console.error(`Gagal download: ${url}`, err);
        }
        return null;
    };

    const processBatch = async () => {
        let index = 1;
        for (const session of sessions) {
            
            let folderName = `Session ${index}`;
            if (session.guest_name) {
                const cleanName = session.guest_name.replace(/[^a-zA-Z0-9 ]/g, "").trim();
                folderName = `${cleanName} (${session.session_code || ''})`;
            }

            console.log(`[BACKUP] Memproses Sesi ${index}: ${folderName}`);

            // 1. PHOTOSTRIP
            if (session.composite_url) {
                const buffer = await downloadFile(session.composite_url);
                if (buffer) {
                    archive.append(buffer, { name: `${folderName}/photostrip_result.jpg` });
                    successCount++;
                }
            }

            // 2. GIF
            if (session.gif_url) {
                const buffer = await downloadFile(session.gif_url);
                if (buffer) {
                    archive.append(buffer, { name: `${folderName}/animation.gif` });
                    successCount++;
                }
            }

            // 3. FOTO INDIVIDU (Nama kolom diganti jadi 'photos')
            let rawPhotos: any[] = [];
            
            // Cek kolom 'photos' (bukan photos_url lagi)
            if (Array.isArray(session.photos)) {
                rawPhotos = session.photos;
            } else if (typeof session.photos === 'string') {
                try {
                    rawPhotos = JSON.parse(session.photos);
                } catch (e) { rawPhotos = []; }
            }

            let fotoIndex = 1;
            for (const item of rawPhotos) {
                let urlToDownload = '';

                // Logika pencarian URL di dalam String atau Object
                if (typeof item === 'string') {
                    urlToDownload = item;
                } else if (typeof item === 'object' && item !== null) {
                    // Cari properti url yang mungkin ada
                    urlToDownload = item.secure_url || item.url || item.link || item.path || '';
                }

                if (urlToDownload) {
                    const buffer = await downloadFile(urlToDownload);
                    if (buffer) {
                        archive.append(buffer, { name: `${folderName}/raw_photo_${fotoIndex}.jpg` });
                        successCount++;
                        fotoIndex++;
                    } else {
                        console.log(`[SKIP] Gagal download raw foto ${fotoIndex} di sesi ${index}`);
                    }
                }
            }

            index++;
        }
        await archive.finalize();
    };

    await processBatch();

    if (successCount === 0) {
        return { success: false, error: "Gagal: Tidak ada file yang berhasil didownload." };
    }

    // 5. UPLOAD KE DRIVE
    const timestamp = new Date().toISOString().split('T')[0];
    const safeEventName = event?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Event';
    const zipName = `BACKUP_FULL_${safeEventName}_${timestamp}.zip`;

    const upload = await drive.files.create({
        requestBody: {
            name: zipName,
            mimeType: 'application/zip',
            description: `Backup Komplit. Total ${successCount} file.`
        },
        media: {
            mimeType: 'application/zip',
            body: passThrough,
        },
        fields: 'webViewLink',
    });
    
    await supabaseAdmin
        .from('events')
        .update({ last_backup_at: new Date().toISOString() })
        .eq('id', eventId);

    return { 
        success: true, 
        message: `Sukses! Backup (${successCount} file) berhasil.`, 
        link: upload.data.webViewLink 
    };

  } catch (error: any) {
    console.error("Backup Fatal Error:", error);
    return { success: false, error: error.message };
  }
}
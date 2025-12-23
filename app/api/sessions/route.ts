// app/api/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sessionQueries } from '@/lib/supabase';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js'; // Import client untuk upsert manual jika diperlukan

// Konfigurasi Supabase Client untuk akses langsung upsert jika sessionQueries tidak support
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST /api/sessions - Create new photo session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id, // ✅ TERIMA ID DARI FRONTEND (Agar QR Code Match)
      frame_id,
      photos, // Array of base64 images
      composite_photo, // Photo strip with frame
      gif, // GIF animation
    } = body;

    // Sebelum simpan, cari dulu event mana yang sedang is_active = true
    const { data: activeEvent } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('is_active', true)
      .single();

    const eventId = activeEvent ? activeEvent.id : null;
    // -------------------------------------

    // 1. Validation
    // Backend mewajibkan semua data ini ada.
    if (!frame_id || !photos || !composite_photo || !gif) {
      console.error("❌ [API] Missing Fields:", { 
        hasId: !!id,
        hasFrame: !!frame_id, 
        photosLen: photos?.length, 
        hasComposite: !!composite_photo, 
        hasGif: !!gif 
      });
      return NextResponse.json(
        { success: false, error: 'Missing required fields (photos, composite, or gif)' },
        { status: 400 }
      );
    }

    // ✅ GUNAKAN ID DARI FRONTEND JIKA ADA, KALAU TIDAK ADA BARU GENERATE
    const sessionId = id || uuidv4();
    const timestamp = Date.now();

    console.log(`🚀 Starting processing for session: ${sessionId}`);

    // 2. Upload individual photos to Cloudinary
    let uploadedPhotos = [];
    try {
      uploadedPhotos = await Promise.all(
        photos.map(async (photo: string, index: number) => {
          const result = await uploadToCloudinary(photo, {
            folder: `photobooth/sessions/${sessionId}`,
            public_id: `photo_${index + 1}_${timestamp}`,
          });
          return {
            url: result.secure_url,
            public_id: result.public_id,
            order: index + 1,
          };
        })
      );
    } catch (uploadError: any) {
      console.error('Failed to upload individual photos:', uploadError);
      return NextResponse.json(
        { success: false, error: `Photo upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 3. Upload composite photo
    let compositeResult;
    try {
      compositeResult = await uploadToCloudinary(composite_photo, {
        folder: `photobooth/sessions/${sessionId}`,
        public_id: `composite_${timestamp}`,
      });
    } catch (uploadError: any) {
      console.error('Failed to upload composite photo:', uploadError);
      return NextResponse.json(
        { success: false, error: `Composite upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 4. Upload GIF
    let gifResult;
    try {
      if (!gif.startsWith('data:image/gif')) {
         // Fallback ringan jika header salah, tapi sebaiknya validasi di frontend
         console.warn("Warning: GIF data header mismatch");
      }
      
      gifResult = await uploadToCloudinary(gif, {
        folder: `photobooth/sessions/${sessionId}`,
        public_id: `animation_${timestamp}`,
        resource_type: 'image', // Cloudinary auto-detects GIFs as images usually
      });
    } catch (uploadError: any) {
      console.error('Failed to upload GIF:', uploadError);
      return NextResponse.json(
        { success: false, error: `GIF upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 5. Save session to Supabase (MENGGUNAKAN UPSERT UNTUK MENCEGAH DUPLICATE KEY)
    // Kita menggunakan upsert agar jika ID sudah ada (akibat sync ulang), data akan diperbarui bukan error.
    const { data, error } = await supabaseAdmin
      .from('photo_sessions') // Ganti dengan 'photo_sessions' jika itu nama tabel Anda di DB
      .upsert({
        id: sessionId, // ✅ Insert/Update ID spesifik agar QR Code valid
        frame_id,
        event_id: eventId, // Simpan event_id yang aktif saat itu
        photos: uploadedPhotos, // Simpan array JSON URL foto
        composite_url: compositeResult.secure_url, // Sesuaikan nama kolom di DB Anda (composite_url atau composite_photo)
        composite_public_id: compositeResult.public_id,
        gif_url: gifResult.secure_url, // Sesuaikan nama kolom di DB Anda (gif_url atau gif)
        gif_public_id: gifResult.public_id,
        photo_count: photos.length,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        files_deleted: false,
        deleted_at: null,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'id' // Jika bentrok pada kolom ID, lakukan update
      })
      .select()
      .single();

    if (error) {
      // LOGGING PENTING: Menampilkan detail error Supabase (misal: RLS policy violation)
      console.error('❌ Supabase DB Error:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { success: false, error: 'Failed to save session to database', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        session_id: sessionId, // Mengembalikan ID yang konsisten
        ...data,
      },
      message: 'Session created successfully',
    });

  } catch (error: any) {
    console.error('❌ General Server Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
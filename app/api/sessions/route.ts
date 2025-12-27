// app/api/sessions/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { sessionQueries } from '@/lib/supabase';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js'; 

// 🔥 PERBAIKAN DI SINI: Gunakan SERVICE_ROLE_KEY (Bukan ANON_KEY)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // <--- GANTI INI
);

// POST /api/sessions - Create new photo session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id, 
      event_id, // ✅ TERIMA EVENT ID DARI FRONTEND (Agar masuk ke event yang benar)
      frame_id,
      photos, 
      composite_photo, 
      gif, 
    } = body;

    // --- LOGIKA PENENTUAN EVENT ID (DIPERBARUI) ---
    // 1. Prioritaskan ID yang dikirim dari Frontend (karena user sudah login ke event spesifik)
    let targetEventId = event_id;

    // 2. Jika Frontend tidak kirim ID (misal akses langsung/legacy), cari event aktif di DB
    if (!targetEventId) {
        const { data: activeEvent } = await supabaseAdmin
          .from('events')
          .select('id')
          .eq('is_active', true)
          .single();
        
        targetEventId = activeEvent ? activeEvent.id : null;
    }
    // -------------------------------------

    // 1. Validation
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

    // ✅ GUNAKAN ID DARI FRONTEND JIKA ADA
    const sessionId = id || uuidv4();
    const timestamp = Date.now();

    console.log(`🚀 Starting processing for session: ${sessionId} (Event: ${targetEventId})`);

    // 2. Upload individual photos to Cloudinary
    let uploadedPhotos = [];
    try {
      uploadedPhotos = await Promise.all(
        photos.map(async (photo: string, index: number) => {
          const result = await uploadToCloudinary(photo, {
            folder: `photobooth/sessions/${sessionId}`, // Folder tetap per sesi
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
         console.warn("Warning: GIF data header mismatch");
      }
      
      gifResult = await uploadToCloudinary(gif, {
        folder: `photobooth/sessions/${sessionId}`,
        public_id: `animation_${timestamp}`,
        resource_type: 'image', 
      });
    } catch (uploadError: any) {
      console.error('Failed to upload GIF:', uploadError);
      return NextResponse.json(
        { success: false, error: `GIF upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 5. Save session to Supabase
    const { data, error } = await supabaseAdmin
      .from('photo_sessions') 
      .upsert({
        id: sessionId, 
        frame_id,
        event_id: targetEventId, // ✅ Gunakan ID hasil logika prioritas di atas
        photos: uploadedPhotos, 
        composite_url: compositeResult.secure_url, 
        composite_public_id: compositeResult.public_id,
        gif_url: gifResult.secure_url, 
        gif_public_id: gifResult.public_id,
        photo_count: photos.length,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        files_deleted: false,
        deleted_at: null,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'id' 
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase DB Error:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { success: false, error: 'Failed to save session to database', details: error },
        { status: 500 }
      );
    }

    // 🔥 UPDATE PHASE 2: AUTOMATIC INSERT TO LIVE FEED (PHOTOS TABLE)
    // Karena Frontend sudah tidak boleh insert (dikunci RLS), Backend yang melakukan ini.
    if (targetEventId && compositeResult.secure_url) {
        try {
            const { error: liveError } = await supabaseAdmin
                .from('photos')
                .insert({
                    event_id: targetEventId,
                    cloudinary_url: compositeResult.secure_url,
                    // session_id: sessionId, // Opsional: Uncomment jika tabel photos punya kolom session_id
                });

            if (liveError) {
                console.error('⚠️ [Live Feed] Failed to insert photo:', liveError.message);
                // Tidak return error 500, karena sesi utama sudah berhasil disimpan.
                // Cukup log error agar tidak mengganggu flow user.
            } else {
                console.log('✅ [Live Feed] Photo inserted successfully');
            }
        } catch (err) {
            console.error('⚠️ [Live Feed] Unexpected error:', err);
        }
    }

    return NextResponse.json({
      success: true,
      data: {
        session_id: sessionId, 
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
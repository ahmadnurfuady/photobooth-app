// app/api/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sessionQueries } from '@/lib/supabase';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { v4 as uuidv4 } from 'uuid';

// POST /api/sessions - Create new photo session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      frame_id,
      photos, // Array of base64 images
      composite_photo, // Photo strip with frame
      gif, // GIF animation
    } = body;

    // Validation
    if (!frame_id || !photos || !composite_photo || !gif) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const sessionId = uuidv4();
    const timestamp = Date.now();

    // Upload individual photos to Cloudinary
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

    // Upload composite photo (strip with frames)
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

    // Upload GIF
    let gifResult;
    try {
      // Validate GIF data
      if (!gif || typeof gif !== 'string') {
        throw new Error('Invalid GIF data: must be a base64 string');
      }
      if (!gif.startsWith('data:image/gif')) {
        throw new Error('Invalid GIF format: must be a data URI with image/gif MIME type');
      }
      
      console.log('Uploading GIF, size:', gif.length, 'bytes');
      
      gifResult = await uploadToCloudinary(gif, {
        folder: `photobooth/sessions/${sessionId}`,
        public_id: `animation_${timestamp}`,
        resource_type: 'image',
      });
      
      console.log('GIF uploaded successfully:', gifResult.secure_url);
    } catch (uploadError: any) {
      console.error('Failed to upload GIF:', uploadError);
      return NextResponse.json(
        { success: false, error: `GIF upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Save session to Supabase
    const { data, error } = await sessionQueries.create({
      frame_id,
      photos: uploadedPhotos,
      composite_url: compositeResult.secure_url,
      composite_public_id: compositeResult.public_id,
      gif_url: gifResult.secure_url,
      gif_public_id: gifResult.public_id,
      photo_count: photos.length,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      files_deleted: false,
      deleted_at: null,
    });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to save session to database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        session_id: data.id,
        ...data,
      },
      message: 'Session created successfully',
    });
  } catch (error: any) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/sessions/[id] - Will be in separate file
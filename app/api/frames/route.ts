// app/api/frames/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { frameQueries } from '@/lib/supabase';
import { uploadToCloudinary, generateThumbnailUrl } from '@/lib/cloudinary';

// GET /api/frames - Fetch all frames
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('active') === 'true';
    const search = searchParams.get('search');

    const { data, error } = await frameQueries.getAll(activeOnly);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch frames' },
        { status: 500 }
      );
    }

    let frames = data || [];

    // Apply search filter
    if (search) {
      frames = frames.filter((frame) =>
        frame.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    return NextResponse.json({
      success: true,
      data: frames,
    });
  } catch (error: any) {
    console.error('Error fetching frames:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/frames - Create new frame
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, file, is_active = true, layout_settings } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Frame name is required' },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Image file is required' },
        { status: 400 }
      );
    }

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(file, {
      folder: 'photobooth/frames',
      resource_type: 'image',
    });

    // Generate thumbnail URL
    const thumbnailUrl = generateThumbnailUrl(uploadResult.public_id, 400, 400);

    // Prepare frame data
    const frameData: any = {
      name: name.trim(),
      cloudinary_url: uploadResult.secure_url,
      cloudinary_public_id: uploadResult.public_id,
      thumbnail_url: thumbnailUrl,
      is_active,
    };

    // Only add layout_settings if provided
    if (layout_settings) {
      frameData.layout_settings = layout_settings;
    }

    // Save to Supabase
    const { data, error } = await frameQueries.create(frameData);

    if (error) {
      console.error('Supabase error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return NextResponse.json(
        { 
          success: false, 
          error: `Database error: ${error.message}`,
          details: error.details || error.hint 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Frame uploaded successfully',
    });
  } catch (error: any) {
    console.error('Error creating frame:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
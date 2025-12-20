// app/api/frames/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/supabase'; // FIXED IMPORT
import { uploadToCloudinary, generateThumbnailUrl, deleteFromCloudinary } from '@/lib/cloudinary';

// GET - List frames
export async function GET(request:  NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('active') === 'true';

    let query = supabase
      .from('frames')
      .select('*')
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data:  frames, error } = await query;

    if (error) throw error;

    return NextResponse. json({
      success: true,
      data: frames,
    });
  } catch (error) {
    console.error('Error fetching frames:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch frames',
      },
      { status: 500 }
    );
  }
}

// POST - Create new frame (WITH photo_slots)
export async function POST(request: NextRequest) {
  try {
    

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const image = formData.get('image') as string; // base64
    const photoSlotsString = formData.get('photoSlots') as string;

    if (!name || !image) {
      return NextResponse.json(
        { success: false, error: 'Name and image are required' },
        { status:  400 }
      );
    }

    // Parse photo slots
    let photoSlots;
    try {
      photoSlots = photoSlotsString ? JSON.parse(photoSlotsString) : null;
    } catch (e) {
      console.error('Error parsing photo slots:', e);
      photoSlots = null;
    }

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(image, {
      folder: 'photobooth/frames',
      public_id: `frame_${Date.now()}`,
    });

    // Generate thumbnail
    const thumbnailUrl = generateThumbnailUrl(uploadResult.public_id);

    // Save to database using supabaseAdmin
    const { data: frame, error:  dbError } = await supabaseAdmin
      .from('frames')
      .insert({
        name,
        cloudinary_url: uploadResult.secure_url,
        cloudinary_public_id: uploadResult.public_id,
        thumbnail_url: thumbnailUrl,
        is_active: true,
        photo_slots: photoSlots, // Save photo slots
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({
      success: true,
      data: frame,
    });
  } catch (error) {
    console.error('Error creating frame:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create frame',
      },
      { status: 500 }
    );
  }
}

// PATCH - Update frame
export async function PATCH(request: NextRequest) {
  try {
    const { id, updates } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Frame ID is required' },
        { status: 400 }
      );
    }

    const { data: frame, error:  dbError } = await supabaseAdmin
      .from('frames')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({
      success: true,
      data: frame,
    });
  } catch (error) {
    console.error('Error updating frame:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update frame',
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete frame
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error:  'Frame ID is required' },
        { status: 400 }
      );
    }

    // Get frame to delete from Cloudinary
    const { data:  frame, error: fetchError } = await supabaseAdmin
      .from('frames')
      .select('cloudinary_public_id')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Delete from Cloudinary
    if (frame?. cloudinary_public_id) {
      try {
        await deleteFromCloudinary(frame.cloudinary_public_id);
      } catch (cloudinaryError) {
        console.error('Error deleting from Cloudinary:', cloudinaryError);
        // Continue with database deletion even if Cloudinary fails
      }
    }

    // Delete from database
    const { error: dbError } = await supabaseAdmin
      .from('frames')
      .delete()
      .eq('id', id);

    if (dbError) throw dbError;

    return NextResponse.json({
      success: true,
      message: 'Frame deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting frame:', error);
    return NextResponse.json(
      {
        success: false,
        error:  error instanceof Error ? error.message :  'Failed to delete frame',
      },
      { status: 500 }
    );
  }
}
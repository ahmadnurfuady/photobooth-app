// app/api/frames/[id]/route. ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { deleteFromCloudinary } from '@/lib/cloudinary';

// PATCH /api/frames/[id] - Update frame
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    console.log('🔧 PATCH /api/frames/[id] - ID:', id);
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Frame ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    console.log('📝 Update body:', body);

    // Build updates object
    const updates:  any = {};
    if (body.name !== undefined) updates.name = body.name. trim();
    if (body.is_active !== undefined) updates.is_active = body.is_active;
    if (body.photo_slots !== undefined) updates.photo_slots = body.photo_slots;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No updates provided' },
        { status: 400 }
      );
    }

    console.log('📝 Parsed updates:', updates);

    // Update in Supabase
    const { data, error } = await supabaseAdmin
      .from('frames')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase update error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to update frame' },
        { status: 500 }
      );
    }

    if (!data) {
      console.error('❌ No data returned from update');
      return NextResponse.json(
        { success: false, error: 'Frame not found' },
        { status: 404 }
      );
    }

    console.log('✅ Update successful');
    return NextResponse.json({
      success: true,
      data,
      message: 'Frame updated successfully',
    });
  } catch (error:  any) {
    console.error('❌ PATCH Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/frames/[id] - Delete frame
export async function DELETE(
  request:  NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    console.log('🗑️ DELETE /api/frames/[id] - START');
    console.log('📌 Frame ID:', id);

    if (!id) {
      console.log('❌ No ID provided');
      return NextResponse.json(
        { success: false, error: 'Frame ID is required' },
        { status: 400 }
      );
    }

    // Step 1: Get frame details
    console.log('🔍 Step 1: Fetching frame from database...');
    const { data: frame, error: fetchError } = await supabaseAdmin
      .from('frames')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('❌ Fetch error:', fetchError);
      return NextResponse.json(
        { success: false, error: `Fetch error: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!frame) {
      console.log('❌ Frame not found in database');
      return NextResponse. json(
        { success: false, error: 'Frame not found' },
        { status: 404 }
      );
    }

    console.log('✅ Frame found:', frame. name);
    console.log('📦 Cloudinary Public ID:', frame.cloudinary_public_id);

    // Step 2: Delete from Cloudinary
    console.log('🗑️ Step 2: Deleting from Cloudinary...');
    if (frame. cloudinary_public_id) {
      try {
        await deleteFromCloudinary(frame.cloudinary_public_id);
        console.log('✅ Cloudinary delete successful');
      } catch (cloudinaryError:  any) {
        console.error('⚠️ Cloudinary delete error (continuing anyway):', cloudinaryError. message);
      }
    } else {
      console.log('⚠️ No Cloudinary public ID, skipping Cloudinary delete');
    }

    // Step 3: Delete from Supabase
    console.log('🗑️ Step 3: Deleting from database...');
    const { error: deleteError } = await supabaseAdmin
      .from('frames')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('❌ Database delete error:', deleteError);
      return NextResponse.json(
        { success: false, error: `Database delete failed: ${deleteError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ DELETE SUCCESSFUL - Frame deleted completely');
    return NextResponse.json({
      success: true,
      message: 'Frame deleted successfully',
    });
  } catch (error: any) {
    console.error('❌ DELETE Error (uncaught):', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
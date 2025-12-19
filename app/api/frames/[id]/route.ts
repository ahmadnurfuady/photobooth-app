// app/api/frames/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { frameQueries } from '@/lib/supabase';
import { deleteFromCloudinary } from '@/lib/cloudinary';

// PATCH /api/frames/[id] - Update frame
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Frame ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, is_active } = body;

    // Build updates object
    const updates: any = {};
    if (name !== undefined) updates.name = name.trim();
    if (is_active !== undefined) updates.is_active = is_active;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No updates provided' },
        { status: 400 }
      );
    }

    // Update in Supabase
    const { data, error } = await frameQueries.update(id, updates);

    if (error) {
      console.error('Supabase error updating frame:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to update frame' },
        { status: 500 }
      );
    }

    if (!data) {
      console.error('No data returned from Supabase update');
      return NextResponse.json(
        { success: false, error: 'Frame not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Frame updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating frame:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/frames/[id] - Delete frame
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get frame details first
    const { data: frame, error: fetchError } = await frameQueries.getById(id);

    if (fetchError || !frame) {
      return NextResponse.json(
        { success: false, error: 'Frame not found' },
        { status: 404 }
      );
    }

    // Delete from Cloudinary
    try {
      await deleteFromCloudinary(frame.cloudinary_public_id);
    } catch (cloudinaryError) {
      console.error('Cloudinary delete error:', cloudinaryError);
      // Continue with database deletion even if Cloudinary fails
    }

    // Delete from Supabase
    const { error:  deleteError } = await frameQueries.delete(id);

    if (deleteError) {
      console.error('Supabase error:', deleteError);
      return NextResponse. json(
        { success: false, error: 'Failed to delete frame from database' },
        { status:  500 }
      );
    }

    return NextResponse. json({
      success: true,
      message: 'Frame deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting frame:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
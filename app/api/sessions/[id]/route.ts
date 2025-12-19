// app/api/sessions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sessionQueries } from '@/lib/supabase';

// GET /api/sessions/[id] - Get session by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data, error } = await sessionQueries.getById(id);

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if expired
    const isExpired = new Date(data.expires_at) < new Date();

    return NextResponse.json({
      success: true,
      data: {
        ... data,
        is_expired:  isExpired,
      },
    });
  } catch (error: any) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
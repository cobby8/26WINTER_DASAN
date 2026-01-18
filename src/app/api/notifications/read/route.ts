
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) return NextResponse.json({ success: false });

    // Mark all as read for this student
    const { error } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('student_id', studentId)
        .eq('is_read', false);

    if (error) return NextResponse.json({ success: false }, { status: 500 });
    return NextResponse.json({ success: true });
}

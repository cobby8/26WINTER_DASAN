
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) return NextResponse.json({ notifications: [], unreadCount: 0 });

    // Fetch Notifications
    const { data: notifications, error } = await supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        return NextResponse.json({ notifications: [], unreadCount: 0 }, { status: 500 });
    }

    // Count Unread
    const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

    return NextResponse.json({ notifications, unreadCount });
}


import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
    try {
        console.log('[RestoreAPI] Starting restoration...');

        // 1. Restore Students
        const { error: studentError, count: sCount } = await supabaseAdmin
            .from('students')
            .update({ deleted_at: null })
            .not('deleted_at', 'is', null)
            .select('id', { count: 'exact' });

        if (studentError) throw studentError;

        // 2. Restore Classes (Safety)
        const { error: classError, count: cCount } = await supabaseAdmin
            .from('classes')
            .update({ deleted_at: null })
            .not('deleted_at', 'is', null)
            .select('id', { count: 'exact' });

        return NextResponse.json({
            success: true,
            restored_students: sCount,
            restored_classes: cCount,
            message: 'All soft-deleted data restored.'
        });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

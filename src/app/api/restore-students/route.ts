
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
    try {
        console.log('[RestoreAPI] Starting restoration...');

        // 1. Restore Students
        const { data: sData, error: studentError } = await supabaseAdmin
            .from('students')
            .update({ deleted_at: null })
            .not('deleted_at', 'is', null)
            .select('id');

        const sCount = sData ? sData.length : 0;

        if (studentError) throw studentError;

        // 2. Restore Classes (Safety)
        const { data: cData, error: classError } = await supabaseAdmin
            .from('classes')
            .update({ deleted_at: null })
            .not('deleted_at', 'is', null)
            .select('id');

        const cCount = cData ? cData.length : 0;

        if (classError) throw classError;

        return NextResponse.json({
            success: true,
            restored_students: sCount,
            restored_classes: cCount,
            message: 'All soft-deleted data restored.'
        });

    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}

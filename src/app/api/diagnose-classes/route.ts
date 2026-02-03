
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
    try {
        console.log('[DiagnoseAPI] Checking classes...');
        const { data: all, error } = await supabaseAdmin.from('classes').select('*');
        if (error) throw error;

        const active = all.filter(c => !c.deleted_at);
        const deleted = all.filter(c => c.deleted_at);

        const activeCounts = active.reduce((acc: any, c: any) => {
            acc[c.session] = (acc[c.session] || 0) + 1;
            return acc;
        }, {});

        const deletedCounts = deleted.reduce((acc: any, c: any) => {
            acc[c.session] = (acc[c.session] || 0) + 1;
            return acc;
        }, {});

        const sample2ndDeleted = deleted.filter(c => c.session === '2차').slice(0, 5).map(c => ({
            name: c.name,
            deleted_at: c.deleted_at,
            day: c.day_of_week
        }));

        const sample2ndActive = active.filter(c => c.session === '2차').slice(0, 5).map(c => ({
            name: c.name,
            day: c.day_of_week
        }));

        return NextResponse.json({
            active_total: active.length,
            deleted_total: deleted.length,
            active_counts: activeCounts,
            deleted_counts: deletedCounts,
            sample_2nd_deleted: sample2ndDeleted,
            sample_2nd_active: sample2ndActive
        });

    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

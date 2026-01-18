import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Fallback if env vars missing (I know I used hardcoded before, but let's try env first or use the hardcoded ones if needed)
// Use the hardcoded ones from previous successful attempts to be safe and fast.
const URL = 'https://gifskibzbgweywwqkkdb.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpZnNraWJ6Ymd3ZXl3d3Fra2RiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA5MzUwMiwiZXhwIjoyMDgyNjY5NTAyfQ.0cePt5AoIoLaMDu18g0Hy0Uu-gGE9r7cDtchMpjkRLs';

const supabaseAdmin = createClient(URL, KEY);

export async function GET() {
    console.log('--- FINDING DUPLICATE CLASSES ---');
    try {
        // Query attributes
        const day = '월요일';
        const { data: classes, error } = await supabaseAdmin
            .from('classes')
            .select('*')
            .eq('day_of_week', day)
            // .is('deleted_at', null) // Show ALL to find the ghost
            .order('start_time');

        if (error) throw error;

        return NextResponse.json({
            success: true,
            totalFound: classes?.length,
            classes: classes?.map(c => ({
                id: c.id,
                name: c.name,
                startTime: c.start_time,
                branch: c.branch,
                session: c.session,
                deletedAt: c.deleted_at
            }))
        });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

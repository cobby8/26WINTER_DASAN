
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkFinalStatus() {
    console.log('--- Final Status Check ---');

    // 1. Classes for 2nd Session
    const { data: classes } = await supabase.from('classes').select('day_of_week').eq('session', '2차');
    let classCounts: any = {};
    classes?.forEach(c => classCounts[c.day_of_week] = (classCounts[c.day_of_week] || 0) + 1);
    console.log('Classes (2차):', JSON.stringify(classCounts));

    // 2. Shuttle Schedules
    const { data: shuttles } = await supabase.from('shuttle_schedules').select('day_of_week');
    let shuttleCounts: any = {};
    shuttles?.forEach(s => shuttleCounts[s.day_of_week] = (shuttleCounts[s.day_of_week] || 0) + 1);
    console.log('Shuttle Schedules:', JSON.stringify(shuttleCounts));

    // 3. Attendance Records for Feb 2 (Mon)
    const { count } = await supabase.from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('date', '2026-02-02');
    console.log('Attendance Records for 2026-02-02 (Mon):', count);
}

checkFinalStatus();

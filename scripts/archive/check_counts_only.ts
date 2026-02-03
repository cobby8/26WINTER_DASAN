
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCounts() {
    console.log('--- Counts ---');

    // Classes by Day
    const { data: classes } = await supabase.from('classes').select('day_of_week').eq('session', '2차');
    const classDayCounts: any = {};
    classes?.forEach(c => classDayCounts[c.day_of_week] = (classDayCounts[c.day_of_week] || 0) + 1);
    console.log('2nd Sess Classes:', JSON.stringify(classDayCounts));

    // Shuttle by Day
    const { data: shuttles } = await supabase.from('shuttle_schedules').select('day_of_week');
    const shuttleDayCounts: any = {};
    shuttles?.forEach(s => shuttleDayCounts[s.day_of_week] = (shuttleDayCounts[s.day_of_week] || 0) + 1);
    console.log('Shuttle Shedules:', JSON.stringify(shuttleDayCounts));
}

checkCounts();

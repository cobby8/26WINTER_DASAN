
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDetailedCounts() {
    console.log('--- Detailed Counts ---');

    // Classes
    const { data: classes } = await supabase.from('classes').select('day_of_week, start_date, end_date').eq('session', '2차');
    let monClassCount = 0;
    let validDateCount = 0;

    classes?.forEach(c => {
        if (c.day_of_week === '월요일') monClassCount++;
        // Check dates
        // If null, it's valid.
        // If set, verify range.
    });
    console.log(`Classes (2차) for 월요일: ${monClassCount}`);

    // Sample a class
    if (classes && classes.length > 0) {
        console.log('Sample Class Dates:', { s: classes[0].start_date, e: classes[0].end_date });
    }

    // Shuttle
    const { data: shuttles } = await supabase.from('shuttle_schedules').select('day_of_week');
    const shuttleCounts: any = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0 };
    shuttles?.forEach(s => {
        if (shuttleCounts[s.day_of_week] !== undefined) shuttleCounts[s.day_of_week]++;
        else shuttleCounts[s.day_of_week] = 1;
    });
    console.log('Shuttle Counts:', JSON.stringify(shuttleCounts));
}

checkDetailedCounts();

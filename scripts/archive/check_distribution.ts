
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDays() {
    console.log('--- Checking Class Days ---');
    const { data: classes } = await supabase
        .from('classes')
        .select('day_of_week');

    const classCount: Record<string, number> = {};
    classes?.forEach(c => {
        classCount[c.day_of_week] = (classCount[c.day_of_week] || 0) + 1;
    });
    console.log('Class Days:', classCount);

    console.log('--- Checking Shuttle Days ---');
    const { data: shuttles } = await supabase
        .from('shuttle_schedules')
        .select('day_of_week');

    const shuttleCount: Record<string, number> = {};
    shuttles?.forEach(s => {
        shuttleCount[s.day_of_week] = (shuttleCount[s.day_of_week] || 0) + 1;
    });
    console.log('Shuttle Days:', shuttleCount);

    console.log('--- Checking Attendance Table ---');
    const { count } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true });
    console.log('Total Attendance Records:', count);

    // Check Attendance Date Range
    const { data: attDates } = await supabase
        .from('attendance')
        .select('date')
        .order('date', { ascending: true })
        .limit(1);
    const { data: attDatesEnd } = await supabase
        .from('attendance')
        .select('date')
        .order('date', { ascending: false })
        .limit(1);

    console.log('Attendance Range:', attDates?.[0]?.date, 'to', attDatesEnd?.[0]?.date);
}

checkDays();

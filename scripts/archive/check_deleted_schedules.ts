
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDeletedSchedules() {
    console.log('--- START CHECK ---');

    // 1. Check for Deleted Academy Stops (student_id is NULL)
    const { data: deletedAcademy, error: delError } = await supabase
        .from('shuttle_schedules')
        .select('id, type, day_of_week, time, deleted_at, location_name')
        .is('student_id', null)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

    if (delError) {
        console.error('Error:', delError);
        return;
    }

    console.log(`Deleted Academy Stops Found: ${deletedAcademy?.length ?? 0}`);
    if (deletedAcademy && deletedAcademy.length > 0) {
        console.log(JSON.stringify(deletedAcademy, null, 2));
    }

    // 2. Check Active Academy Stops for Tuesday
    const { data: activeAcademy, error: activeError } = await supabase
        .from('shuttle_schedules')
        .select('id, type, day_of_week, time')
        .is('student_id', null)
        .is('deleted_at', null)
        .eq('day_of_week', 'Tue'); // Tue

    console.log(`Active Academy Stops for Tue: ${activeAcademy?.length ?? 0}`);
    if (activeAcademy && activeAcademy.length > 0) {
        console.log(JSON.stringify(activeAcademy, null, 2));
    }

    console.log('--- END CHECK ---');
}

checkDeletedSchedules();

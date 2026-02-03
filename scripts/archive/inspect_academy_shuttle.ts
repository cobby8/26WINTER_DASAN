
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectAcademyShuttle() {
    console.log('--- Inspecting Academy Shuttle Records ---');

    // Look for schedules without student_id (often used for Academy stops) or specific types
    const { data: schedules, error } = await supabase
        .from('shuttle_schedules')
        .select('*')
        .is('student_id', null);

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    console.log(`Found ${schedules.length} records without student_id.`);
    if (schedules.length > 0) {
        console.log('Sample:', schedules[0]);
        // distinct types/names
        const summary = schedules.map(s => `${s.type} @ ${s.time} (${s.location_name})`).slice(0, 10);
        console.log('Summary:', summary);
    }

    // Also check for 'academy' in location or type
    const { data: academySchedules } = await supabase
        .from('shuttle_schedules')
        .select('*')
        .ilike('location_name', '%학원%')
        .limit(10);

    console.log(`\nFound ${academySchedules?.length} records with '학원' in location.`);
    academySchedules?.forEach(s => console.log(` - ${s.type} / ${s.time} / ${s.location_name} / Student: ${s.student_id}`));
}

inspectAcademyShuttle();


import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkDuplicates() {
    console.log('🧐 Checking for Duplicate Shuttle Schedules...');

    const { data: schedules, error } = await supabase
        .from('shuttle_schedules')
        .select('*');

    if (error) {
        console.error('Error fetching schedules:', error.message);
        return;
    }

    const seen = new Map();
    const duplicates: any[] = [];

    schedules?.forEach(s => {
        const key = `${s.student_id}-${s.day_of_week}-${s.time}-${s.location_name}`;
        if (seen.has(key)) {
            duplicates.push(s);
        } else {
            seen.set(key, s.id);
        }
    });

    console.log(`Total Schedules: ${schedules?.length}`);
    console.log(`Duplicate Schedules Found: ${duplicates.length}`);

    if (duplicates.length > 0) {
        console.log('--- Sample Duplicates ---');
        duplicates.slice(0, 5).forEach(d => {
            console.log(`[${d.id}] ${d.day_of_week} ${d.time} - ${d.location_name} (Student: ${d.student_id})`);
        });
    }

    console.log('\n--- Virtual Stops (student_id: null) ---');
    const virtualStops = schedules?.filter(s => s.student_id === null) || [];
    console.log(`Total Virtual Stops: ${virtualStops.length}`);
    virtualStops.forEach(v => {
        console.log(`[${v.id}] ${v.day_of_week} ${v.time} - ${v.location_name}`);
    });
}

checkDuplicates();

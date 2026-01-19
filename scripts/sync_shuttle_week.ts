
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function forceSyncWeek() {
    console.log('--- Force Syncing Mon Stops to Tue-Fri ---');

    // 1. Get Mon Data
    const { data: allMonData, error } = await supabase
        .from('shuttle_schedules')
        .select('*')
        .eq('day_of_week', 'Mon')
        .or('type.eq.academy_start,type.eq.academy_end');

    if (error || !allMonData) {
        console.error('Error or no data:', error);
        return;
    }

    console.log(`Raw Mon Records: ${allMonData.length}`);
    const monData = allMonData.filter(d => !d.deleted_at);
    console.log(`Active Mon Records: ${monData.length}`);

    if (monData.length === 0) {
        console.log("No active data to copy.");
        return;
    }

    console.log(`Found ${monData.length} active stops on Monday.`);

    const targetDays = ['Tue', 'Wed', 'Thu', 'Fri'];

    for (const day of targetDays) {
        console.log(`Processing ${day}...`);

        // 2. DELETE existing academy stops (Hard Delete to reset)
        // Note: This removes logs associated with these academy stops, but usually they don't have critical logs.
        const { error: delError } = await supabase
            .from('shuttle_schedules')
            .delete()
            .eq('day_of_week', day)
            .or('type.eq.academy_start,type.eq.academy_end');

        if (delError) {
            console.error(`  Error clearing ${day}:`, delError.message);
            continue;
        }
        console.log(`  Cleared existing academy stops for ${day}.`);

        // 3. Insert
        const toInsert = monData.map(item => ({
            student_id: null,
            day_of_week: day,
            type: item.type,
            time: item.time,
            location_name: item.location_name,
            location_address: item.location_address,
            location_lat: item.location_lat,
            location_lng: item.location_lng,
            sequence_order: item.sequence_order,
            section_id: item.section_id,
            deleted_at: null // Ensure active
        }));

        const { error: insError } = await supabase
            .from('shuttle_schedules')
            .insert(toInsert);

        if (insError) console.error(`  Error inserting for ${day}:`, insError.message);
        else console.log(`  Successfully copied ${toInsert.length} stops to ${day}.`);
    }
}

forceSyncWeek();

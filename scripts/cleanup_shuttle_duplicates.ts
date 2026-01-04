
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupDuplicates() {
    console.log('--- Cleaning up shuttle_schedules duplicates ---');

    // 1. Fetch all schedules
    const { data: schedules, error } = await supabase
        .from('shuttle_schedules')
        .select('id, student_id, day_of_week, type, time');

    if (error) {
        console.error('Error fetching schedules:', error);
        return;
    }

    const seen = new Set<string>();
    const toDelete: string[] = [];

    for (const s of schedules) {
        if (!s.student_id) continue; // Skip academy stops

        const key = `${s.student_id}-${s.day_of_week}-${s.type}`;
        if (seen.has(key)) {
            console.log(`Duplicate found: ${key} (ID: ${s.id})`);
            toDelete.push(s.id);
        } else {
            seen.add(key);
        }
    }

    if (toDelete.length > 0) {
        console.log(`Deleting ${toDelete.length} duplicate rows...`);
        const { error: delError } = await supabase
            .from('shuttle_schedules')
            .delete()
            .in('id', toDelete);

        if (delError) {
            console.error('Error deleting duplicates:', delError);
        } else {
            console.log('Cleanup successful!');
        }
    } else {
        console.log('No duplicates found.');
    }
}

cleanupDuplicates();

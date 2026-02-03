
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function restoreJan30() {
    console.log('--- RESTORING JAN 30 (FRIDAY) SCHEDULES ---');

    // 1. Identify the rows to restore
    // Based on previous analysis: Day='Fri', deleted_at IS NOT NULL
    const { data: toRestore, error: fetchError } = await supabase
        .from('shuttle_schedules')
        .select('*')
        .eq('day_of_week', 'Fri')
        .not('deleted_at', 'is', null);

    if (fetchError) {
        console.error('Fetch Error:', fetchError);
        return;
    }

    if (!toRestore || toRestore.length === 0) {
        console.log('No deleted schedules found for Friday.');
        return;
    }

    console.log(`Found ${toRestore.length} deleted schedules for Friday.`);

    if (toRestore.length !== 13) {
        console.warn(`WARNING: Found ${toRestore.length} items, but expected 13. Please verify manually if this is correct.`);
        // Note: Proceeding if it's close or the user wants "batch restore". 
        // But for safety, I will list IDs and prompt (simulated) or just proceed if the logic is sound.
        // Given the user instruction, I will proceed but log carefully.
    }

    const ids = toRestore.map(s => s.id);

    // 2. Perform Update
    const { data: restored, error: updateError } = await supabase
        .from('shuttle_schedules')
        .update({ deleted_at: null })
        .in('id', ids)
        .select();

    if (updateError) {
        console.error('Update Error:', updateError);
        return;
    }

    console.log(`Successfully restored ${restored?.length} schedules.`);
    restored?.forEach(s => {
        console.log(` - Restored ID ${s.id}: ${s.time} (${s.type}), Day: ${s.day_of_week}`);
    });
}

restoreJan30();

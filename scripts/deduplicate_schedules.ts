
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deduplicateSchedules() {
    console.log('--- STARTING SCHEDULE DEDUPLICATION ---');

    // 1. Fetch ALL schedules (active)
    // We only care about active ones because we just restored them.
    // If there are deleted duplicates, we can ignore them or clean them too.
    // Let's just focus on active duplicates to fix the current state.
    const { data: schedules, error } = await supabase
        .from('shuttle_schedules')
        .select('id, student_id, day_of_week, time, type, created_at')
        .is('deleted_at', null);

    if (error) {
        console.error('Error fetching:', error);
        return;
    }

    if (!schedules || schedules.length === 0) {
        console.log('No schedules found.');
        return;
    }

    console.log(`Scanned ${schedules.length} active schedules.`);

    // 2. Identify Duplicates
    // Key: student_id + day + time + type
    const groups: Record<string, typeof schedules> = {};

    schedules.forEach(s => {
        const key = `${s.student_id}-${s.day_of_week}-${s.time}-${s.type}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
    });

    const idsToDelete: string[] = [];

    Object.keys(groups).forEach(key => {
        const items = groups[key];
        if (items.length > 1) {
            // Sort by created_at (keep the oldest one or newest? Doesn't matter much for exact duplicates)
            // Let's keep the one with the smallest ID (often oldest) just for stability
            items.sort((a, b) => a.id.localeCompare(b.id)); // Assuming UUID, but consistent sort needed

            // Keep index 0, delete the rest
            const toDelete = items.slice(1);
            toDelete.forEach(item => idsToDelete.push(item.id));
        }
    });

    console.log(`Found ${idsToDelete.length} duplicate records to delete.`);

    if (idsToDelete.length === 0) {
        console.log('No duplicates to delete. Exiting.');
        return;
    }

    // 3. Delete in batches (to avoid URL length limits if huge)
    // Hard delete or Soft delete?
    // User asked for cleanup. Hard delete is better for accidental duplicates.
    const batchSize = 100;
    for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize);
        const { error: delError } = await supabase
            .from('shuttle_schedules')
            .delete()
            .in('id', batch);

        if (delError) {
            console.error('Error deleting batch:', delError);
        } else {
            console.log(`Deleted batch ${i / batchSize + 1} (${batch.length} items)`);
        }
    }

    console.log('--- DEDUPLICATION COMPLETE ---');
}

deduplicateSchedules();


import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanupZombies() {
    console.log('--- Cleaning up Shuttle Zombies ---');

    // Definition of Zombie: Active records (deleted_at is null) 
    // AND NOT updated in the last 1 hour.
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 1);

    const { data: zombies, error } = await supabase
        .from('shuttle_schedules')
        .select('*')
        .is('deleted_at', null)
        .lt('updated_at', cutoff.toISOString())
        // Safety: ensure we don't delete system records with specific IDs if any?
        // But user said "Clean up wrong data".
        .not('updated_at', 'is', null); // if updated_at is null, use created_at? 

    // Wait, some might have null updated_at if never updated. Check created_at too.
    // Actually, robust way: verify if they were touched by recent script.
    // Recent script UPDATES `updated_at`.
    // So if `updated_at` < cutoff OR (`updated_at` is null AND `created_at` < cutoff), it's a zombie.

    if (error || !zombies) {
        console.error('Error fetching:', error?.message);
        return;
    }

    // Filter purely by time just to be safe
    const realZombies = zombies.filter(z => {
        const u = z.updated_at ? new Date(z.updated_at) : new Date(z.created_at);
        return u < cutoff;
    });

    console.log(`Found ${realZombies.length} confirmed zombies.`);

    if (realZombies.length > 0) {
        // Bulk soft delete
        const ids = realZombies.map(z => z.id);
        const { error: delErr } = await supabase
            .from('shuttle_schedules')
            .update({ deleted_at: new Date().toISOString() })
            .in('id', ids);

        if (delErr) console.error('Delete Error:', delErr.message);
        else console.log('Successfully soft-deleted zombies.');
    } else {
        console.log('No zombies to clean.');
    }
}

cleanupZombies();

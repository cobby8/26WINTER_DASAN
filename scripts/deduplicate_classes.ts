
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deduplicate() {
    console.log(`[Deduplicate + Restore] Connecting to ${supabaseUrl}`);

    // Fetch ALL 2차 classes (Active and Deleted)
    const { data: classes, error } = await supabase
        .from('classes')
        .select('id, name, session, day_of_week, start_time, branch, created_at, deleted_at')
        .eq('session', '2차')
        .order('created_at', { ascending: true });

    if (error || !classes) {
        console.error('Error fetching classes:', error);
        return;
    }
    console.log(`Fetched ${classes.length} classes.`);

    // Group by Unique Key: Branch|Day|Time
    const map = new Map<string, any[]>();
    classes.forEach(c => {
        const key = `${c.branch}|${c.day_of_week}|${c.start_time}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(c);
    });

    let deletedCount = 0;
    let restoredCount = 0;

    for (const [key, items] of map) {
        // Items per group
        // If items.length == 1, we still check if it needs RESTORE (since I might have deleted all active ones before)
        // If items.length > 1, we Deduplicate.

        const enhancedItems = [];
        for (const item of items) {
            const { count } = await supabase
                .from('enrollments')
                .select('*', { count: 'exact', head: true })
                .eq('class_id', item.id);
            enhancedItems.push({ ...item, enrollmentCount: count || 0 });
        }

        // Sort: High Enrollments First, then Latest Created
        enhancedItems.sort((a, b) => {
            if (b.enrollmentCount !== a.enrollmentCount) return b.enrollmentCount - a.enrollmentCount;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        const keeper = enhancedItems[0];
        const toDelete = enhancedItems.slice(1);

        // Logic for Keeper: Must be Active
        if (keeper.deleted_at) {
            console.log(`  [Restore Keeper] ${keeper.id} (${keeper.name})`);
            await supabase.from('classes').update({ deleted_at: null }).eq('id', keeper.id);
            restoredCount++;
        }

        // Logic for Others: Must be Deleted
        const idsToDelete = [];
        for (const d of toDelete) {
            if (!d.deleted_at) idsToDelete.push(d.id);
        }

        if (idsToDelete.length > 0) {
            console.log(`  [Delete Dups] ${idsToDelete.length} items for ${key}`);
            await supabase.from('classes').update({ deleted_at: new Date().toISOString() }).in('id', idsToDelete);
            deletedCount += idsToDelete.length;
        }
    }

    console.log(`\nOperation Complete.`);
    console.log(`Restored Keepers: ${restoredCount}`);
    console.log(`Deleted Duplicates: ${deletedCount}`);
}

deduplicate();


import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const DRY_RUN = false;

async function fixFebClasses() {
    const output: string[] = [];
    const log = (msg: string) => {
        console.log(msg);
        output.push(msg);
    };

    log(`--- Fix Feb Classes (DRY_RUN: ${DRY_RUN}) ---`);

    // 1. Fetch all classes
    const { data: allClasses, error } = await supabase
        .from('classes')
        .select('*');

    if (error) {
        log(`Error fetching classes: ${error.message}`);
        return;
    }

    // Filter for "2차" (2nd Session)
    // Logic: session_id contains '2차' OR name contains '[2차'
    const targetClasses = allClasses.filter(c =>
        (c.session_id && c.session_id.includes('2차')) ||
        (c.name && c.name.includes('[2차')) ||
        (c.session && c.session.includes('2차'))
    );

    log(`Target Classes Found (2nd Session): ${targetClasses.length}`);

    // Fetch all enrollments to check for counts
    const { data: allEnrollments, error: enrollError } = await supabase
        .from('enrollments') // Check if 'winter_enrollments' or 'enrollments'
        .select('*');

    if (enrollError) {
        log(`Error fetching enrollments: ${enrollError.message}`);
        // Fallback: assume 0 enrollments? No, safer to stop.
        // But wait, the previous analysis script didn't fail on reading classes, but we need enrollments to decide keeper.
        // If table name is wrong, this will fail. Let's assume 'enrollments' based on page.tsx
        return;
    }

    // Map class_id -> enrollment count
    const enrollmentMap: { [key: string]: number } = {};
    allEnrollments.forEach((e: any) => {
        enrollmentMap[e.class_id] = (enrollmentMap[e.class_id] || 0) + 1;
    });


    // 2. Group by Unique Schedule
    // Key: Branch + Day + Time
    const grouped: { [key: string]: any[] } = {};

    targetClasses.forEach(c => {
        // Branch normalization: '1호점', '2호점' usually in 'branch' column or extracted from name
        // The previous analysis showed 'branch' column exists in the sample data.
        const branch = c.branch || (c.name.includes('1호점') ? '1호점' : (c.name.includes('2호점') ? '2호점' : 'Unknown'));
        const time = c.start_time;
        const day = c.day_of_week;

        const key = `${branch}|${day}|${time}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(c);
    });

    // 3. Process Groups
    let restoredCount = 0;
    let deletedCount = 0;
    let movedEnrollmentsCount = 0;
    let mergedDuplicateEnrollmentsCount = 0;

    for (const [key, group] of Object.entries(grouped)) {
        if (group.length === 0) continue;

        // Determine Keeper
        // Priority:
        // 1. Has Enrollments (Largest count)
        // 2. Active (not deleted)
        // 3. Most recently created

        group.sort((a, b) => {
            const countA = enrollmentMap[a.id] || 0;
            const countB = enrollmentMap[b.id] || 0;
            if (countA !== countB) return countB - countA; // Descending enrollment

            const activeA = !a.deleted_at;
            const activeB = !b.deleted_at;
            if (activeA !== activeB) return activeA ? -1 : 1; // Active first

            // Date comparison (Newest first)
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        const keeper = group[0];
        const losers = group.slice(1);

        log(`\nGroup: ${key} (Total: ${group.length})`);
        log(`  Keeper: ${keeper.name} (ID: ${keeper.id}) [Enrollments: ${enrollmentMap[keeper.id] || 0}] [Deleted: ${keeper.deleted_at ? 'Yes' : 'No'}]`);

        // Restore Keeper if deleted
        if (keeper.deleted_at) {
            log(`  -> ACTION: Restore Keeper`);
            if (!DRY_RUN) {
                const { error: restoreError } = await supabase
                    .from('classes')
                    .update({ deleted_at: null })
                    .eq('id', keeper.id);
                if (restoreError) log(`     Error restoring: ${restoreError.message}`);
                else restoredCount++;
            }
        }

        // Process Losers
        for (const loser of losers) {
            const loserEnrollments = allEnrollments.filter((e: any) => e.class_id === loser.id);
            const loserCount = loserEnrollments.length;

            log(`  Loser: ${loser.name} (ID: ${loser.id}) [Enrollments: ${loserCount}]`);

            // Move Enrollments (Row by Row to handle duplicates)
            if (loserCount > 0) {
                log(`  -> ACTION: Move/Merge ${loserCount} enrollments to Keeper`);
                if (!DRY_RUN) {
                    for (const enroll of loserEnrollments) {
                        // Try to move
                        const { error: moveError } = await supabase
                            .from('enrollments')
                            .update({ class_id: keeper.id })
                            .eq('id', enroll.id);

                        if (moveError) {
                            // Likely unique constraint violation (User already in Keeper class)
                            // In this case, we just delete the loser enrollment
                            // log(`     Move failed (likely duplicate), deleting enrollment ${enroll.id}`);
                            const { error: delEnrollError } = await supabase
                                .from('enrollments')
                                .delete()
                                .eq('id', enroll.id);

                            if (delEnrollError) log(`     Error deleting duplicate enrollment: ${delEnrollError.message}`);
                            else mergedDuplicateEnrollmentsCount++;
                        } else {
                            movedEnrollmentsCount++;
                        }
                    }
                }
            }

            // Delete Loser
            log(`  -> ACTION: Hard Delete Loser`);
            if (!DRY_RUN) {
                const { error: deleteError } = await supabase
                    .from('classes')
                    .delete()
                    .eq('id', loser.id);
                if (deleteError) log(`     Error deleting: ${deleteError.message}`);
                else deletedCount++;
            }
        }
    }

    log(`\n--- Summary ---`);
    log(`Restored Keepers: ${restoredCount}`);
    log(`Deleted Losers: ${deletedCount}`);
    log(`Moved Enrollments: ${movedEnrollmentsCount}`);
    log(`Merged (Deleted) Duplicate Enrollments: ${mergedDuplicateEnrollmentsCount}`);

    if (DRY_RUN) {
        log(`\n*** DRY RUN MODE - NO CHANGES MADE ***`);
    }

    const fs = require('fs');
    fs.writeFileSync('fix_log.txt', output.join('\n'));
}

fixFebClasses();

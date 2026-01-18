
// @ts-nocheck
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gifskibzbgweywwqkkdb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpZnNraWJ6Ymd3ZXl3d3Fra2RiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA5MzUwMiwiZXhwIjoyMDgyNjY5NTAyfQ.0cePt5AoIoLaMDu18g0Hy0Uu-gGE9r7cDtchMpjkRLs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log(`Supabase URL: ${supabaseUrl}`);
console.log(`Service Key status: ${supabaseServiceKey ? 'Present (' + supabaseServiceKey.substring(0, 5) + '...)' : 'MISSING'}`);

async function verifyConnection() {
    const { count, error } = await supabase.from('classes').select('*', { count: 'exact', head: true });
    if (error) {
        console.error('Connection Test Failed:', error);
        process.exit(1);
    }
    console.log(`Connection Test OK. Classes count: ${count}`);
}

async function migrateAttendance() {
    await verifyConnection();
    console.log('--- Starting Attendance Migration (Simplified) ---');
    console.log('Target Date: 2026-01-16 (and surrounding days just in case)');

    // 1. Fetch relevant logs
    // We focus on the date user mentioned, but let's grab a wider range or just all if count is low?
    // Let's grab all logs for Jan 16, 2026.
    const targetDate = '2026-01-16';

    const { data: logs, error: logError } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('date', targetDate);

    if (logError) {
        console.error('Error fetching logs:', logError);
        return;
    }

    if (!logs || logs.length === 0) {
        console.log(`No attendance logs found for ${targetDate}.`);
        return;
    }

    console.log(`Found ${logs.length} logs for ${targetDate}. Checking for deleted classes...`);

    let migratedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const log of logs) {
        // 2. Check if Class is Deleted
        const { data: oldClass } = await supabase
            .from('classes')
            .select('*')
            .eq('id', log.class_id)
            .single(); // Should exist, even if deleted

        if (!oldClass) {
            console.warn(`Original class ${log.class_id} not found in DB.`);
            continue;
        }

        if (!oldClass.deleted_at) {
            // Class is active, no need to migrate
            // console.log(`Log ${log.id}: Class ${oldClass.id} is active. OK.`);
            continue;
        }

        console.log(`\n[MIGRATE] Log ${log.id} (Student: ${log.student_id}) is on DELETED Class: ${oldClass.name} (${oldClass.id})`);

        // 3. Find Active Replacement
        // Matching criteria: day, session, branch, normalized time
        const normalize = (t) => {
            if (!t) return '';
            const parts = t.split(':');
            return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
        };

        const targetTimePrefix = normalize(oldClass.start_time).substring(0, 5);

        // Fetch candidates
        const { data: candidates } = await supabase
            .from('classes')
            .select('*')
            .eq('day_of_week', oldClass.day_of_week)
            .eq('session', oldClass.session)
            .eq('branch', oldClass.branch)
            .is('deleted_at', null);

        let activeClass = null;
        if (candidates) {
            activeClass = candidates.find(c => normalize(c.start_time).startsWith(targetTimePrefix));
        }

        if (!activeClass) {
            console.error(`  -> NO Active Replacement found for ${oldClass.name}. Cannot migrate.`);
            errorCount++;
            continue;
        }

        console.log(`  -> Target Active Class: ${activeClass.name} (${activeClass.id})`);

        if (activeClass.id === oldClass.id) {
            // Should only happen if deleted_at was set but it was somehow also active? Paradox.
            console.warn('  -> Target same as source? Skip.');
            continue;
        }

        // 4. Update Log
        // Check conflict via upsert or check
        // If we update `class_id`, does it violate unique constraint (student_id, class_id, date)? 
        // If unique constraint exists, upsert might merge or fail depending on settings. 
        // Or we delete the old log if new one exists.

        // Let's check if destination log exists
        const { data: destLog } = await supabase
            .from('attendance_logs')
            .select('id')
            .eq('class_id', activeClass.id)
            .eq('student_id', log.student_id)
            .eq('date', log.date)
            .maybeSingle();

        if (destLog) {
            console.warn(`  -> Log already exists on target (ID: ${destLog.id}). Deleting this duplicate/orphaned log.`);
            // Since we transfer data, if the orphaned log has 'present' and target has 'pending', we might want to carry over status?
            // User said: "1/16 data checked on duplicated class". So the DELETED class has the REAL data.
            // Target class (auto-generated or empty) probably has no log or 'pending'?

            // Safer: Update the TARGET log with this log's status, then delete this log.
            await supabase
                .from('attendance_logs')
                .update({
                    status: log.status,
                    entered_at: log.entered_at,
                    exited_at: log.exited_at // preserve timestamps
                })
                .eq('id', destLog.id);

            // Delete the old one
            await supabase.from('attendance_logs').delete().eq('id', log.id);
            console.log(`  -> Merged data into target log and deleted orphan.`);
            migratedCount++;
        } else {
            // Just move it
            const { error: moveError } = await supabase
                .from('attendance_logs')
                .update({ class_id: activeClass.id })
                .eq('id', log.id);

            if (moveError) {
                console.error(`  -> Move Failed: ${moveError.message}`);
                errorCount++;
            } else {
                console.log(`  -> Moved successfully.`);
                migratedCount++;
            }
        }
    }

    console.log(`\n--- Migration Summary ---`);
    console.log(`Processed Logs: ${logs.length}`);
    console.log(`Migrated/Merged: ${migratedCount}`);
    console.log(`Errors: ${errorCount}`);
}

migrateAttendance().catch(console.error);

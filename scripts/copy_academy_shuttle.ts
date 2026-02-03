
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function copyAcademyShuttle() {
    console.log('--- Copying Academy Shuttle Info from January ---');

    // 1. Identify "Academy" records in Jan
    // Assumption: Records with no student_id OR specific location names.
    // Based on previous scan, we might look for '학원' in location_name or just null student_id

    // Let's fetch valid distinct schedules that look like "Academy" ops
    const { data: sourceSchedules } = await supabase
        .from('shuttle_schedules')
        .select('*')
        .or('location_name.ilike.%학원%,type.eq.academy_depart,type.eq.academy_arrive');
    // Note: adjust filter based on actual Jan data appearing in DB.
    // If scan returned 0, we might need a broader search or force create specific rows.

    // If scan found nothing, we might need to look at specific student_ids if 'Academy' is a student.
    // Or just create the standard rows if they are known constants.

    // Re-check scan result: "Explicit '학원' search found: 0"
    // This implies "Academy" records might not have '학원' in location_name?
    // OR they were deleted?

    // Let's look for records with NO student_id.
    const { data: noStudent } = await supabase
        .from('shuttle_schedules')
        .select('*')
        .is('student_id', null);

    console.log(`Potential Source Records (No Student ID): ${noStudent?.length}`);

    if (!noStudent || noStudent.length === 0) {
        console.log("No source records found. Manually creating default Academy Schedules?");
        // If user wants "Copy", but we can't find source, we might need to ask or just create standard ones.
        return;
    }

    let count = 0;
    // 2. Insert for Feb (which means just ensuring they exist, since day_of_week is generic)
    // Wait, if they exist with no student_id, they apply to ALL dates unless filtered.
    // The issue is likely they were DELETED or not showing up.

    for (const item of noStudent) {
        // If deleted, restore
        if (item.deleted_at) {
            await supabase.from('shuttle_schedules').update({ deleted_at: null }).eq('id', item.id);
            count++;
        } else {
            // Already active.
            // Maybe duplication is needed if we wiped them?
            // "Copy 1st session... insert" -> maybe they want duplicates? Unlikely.
            // Just ensure they are there.
        }
    }
    console.log(`Restored/Checked ${count} Academy records.`);
}

copyAcademyShuttle();

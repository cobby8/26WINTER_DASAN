
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function copyAcademyShuttleV2() {
    console.log('--- Copying Academy Shuttle Info (V2) ---');

    // 1. Find January/1st Session Academy Records
    // Strategy: Look for records created before Feb 1st, with NO student_id.
    const { data: janRecords, error } = await supabase
        .from('shuttle_schedules')
        .select('*')
        .is('student_id', null)
        .lt('created_at', '2026-02-01T00:00:00Z'); // Assuming created before Feb

    if (error) {
        console.error('Error fetching Jan records:', error.message);
        return;
    }

    console.log(`Found ${janRecords?.length} existing Academy records from Jan.`);

    if (!janRecords || janRecords.length === 0) {
        console.log("No Jan Academy records found (student_id=null). Checking for '학원' name duplicates...");
        // Fallback: Check for '학원' in location_name even if student_id exists (maybe dummy student?)
        const { data: janAcademy } = await supabase
            .from('shuttle_schedules')
            .select('*')
            .ilike('location_name', '%학원%')
            .lt('created_at', '2026-02-01T00:00:00Z')
            .limit(50);

        console.log(`Found ${janAcademy?.length} records with '학원' loc from Jan.`);

        if (!janAcademy || janAcademy.length === 0) {
            console.log("No source found. Cannot copy.");
            return;
        }

        // Use these to clone?
        // But these probably have specific student_ids.
        // If the user wants "Academy Departure/Arrival", these are usually valid for everyone.
        // I will take the distinct times/locations/types from these 'Academy' records and create generic ones (no student_id).

        const distinct = new Map();
        janAcademy.forEach(r => {
            const key = `${r.day_of_week}-${r.type}-${r.time}`;
            if (!distinct.has(key)) {
                distinct.set(key, { ...r, student_id: null, id: undefined, created_at: undefined, updated_at: undefined });
            }
        });

        console.log(`Deduced ${distinct.size} distinct Academy patterns.`);
        const payload = Array.from(distinct.values());

        // Insert
        const { error: insErr } = await supabase.from('shuttle_schedules').insert(payload);
        if (insErr) console.error("Insert Error:", insErr.message);
        else console.log(`Inserted ${payload.length} deduced Academy schedules.`);

        return;
    }

    // 2. Clone Jan Records
    // Remove ID, created_at, updated_at. Keep student_id=null.
    const newRecords = janRecords.map(r => {
        const { id, created_at, updated_at, ...rest } = r;
        return {
            ...rest,
            // Ensure they are visible for Feb? 
            // The table structure seems to rely on 'day_of_week' and 'student_id'. 
            // If student_id is null, it's global.
            // If they already exist (same day/time/type), we shouldn't duplicate.
            // But they are global... so if they verify against "Jan" records, they are technically the same?
            // Unless there's a 'session' column? No.
            // There's a 'section_id'. Maybe 1st session used section?
            // If Jan records satisfy the condition, we don't need to copy, just ensure they are not deleted.
        };
    });

    // We only insert if they don't exist?
    // Actually, if there is no session column, the existing records SHOULD work for Feb too.
    // Why did the user say "Copy"? Maybe they were deleted?
    // Ah, I see `deleted_at: null` in the map instructions.

    let restored = 0;
    for (const r of janRecords) {
        if (r.deleted_at) {
            await supabase.from('shuttle_schedules').update({ deleted_at: null }).eq('id', r.id);
            restored++;
        }
    }
    console.log(`Restored ${restored} Jan records.`);

    if (restored === 0 && janRecords.length > 0) {
        console.log("Records exist and are active. Nothing to copy? Or do we need new ones?");
        // Maybe the user means they want these specific lines to appear in the new report or something.
        // But in DB, they are there.
    }
}

copyAcademyShuttleV2();


import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanup2ndSession() {
    console.log('--- Cleaning up ALL 2nd Session Data ---');

    // 1. Fetch Target Classes
    // We want to delete anything with session = '2차', active or deleted.
    const { data: classes, error: fetchError } = await supabase
        .from('classes')
        .select('id, name')
        .eq('session', '2차');

    if (fetchError) { console.error('Fetch failed:', fetchError); return; }
    if (!classes || classes.length === 0) {
        console.log('No 2nd session classes found.');
        return;
    }

    const classIds = classes.map(c => c.id);
    console.log(`Found ${classes.length} classes to delete.`);

    // 2. Delete Dependent Data (Enrollments)
    // Enrollments -> Attendance -> Makeup Tickets
    // We need to be careful with cascading, but let's do explicit cleanup for safety.

    // 2.1 Get Enrollments
    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('id')
        .in('class_id', classIds);

    const enrollmentIds = enrollments?.map(e => e.id) || [];

    if (enrollmentIds.length > 0) {
        console.log(`Deleting ${enrollmentIds.length} enrollments...`);

        // 2.2 Delete Attendance
        const { data: attendance } = await supabase
            .from('attendance')
            .select('id')
            .in('enrollment_id', enrollmentIds);

        const attIds = attendance?.map(a => a.id) || [];

        if (attIds.length > 0) {
            console.log(`  Deleting ${attIds.length} attendance records...`);
            // Makeup tickets might be linked to attendance
            await supabase.from('makeup_tickets').delete().in('original_attendance_id', attIds);
            await supabase.from('attendance').delete().in('id', attIds);
        }

        await supabase.from('enrollments').delete().in('id', enrollmentIds);
    }

    // 2.3 Also delete Class Sessions ("Attendance Sheets") for these classes
    // Table: class_sessions ? (User uses 'attendance' table for records, but is there a session table?)
    // 'generate_attendance_feb.ts' created 'class_sessions'.
    const { data: sessions } = await supabase
        .from('class_sessions')
        .select('id')
        .in('class_id', classIds);

    const sessionIds = sessions?.map(s => s.id) || [];
    if (sessionIds.length > 0) {
        console.log(`Deleting ${sessionIds.length} class sessions...`);
        await supabase.from('class_sessions').delete().in('id', sessionIds);
    }

    // 3. Delete Classes (Hard Delete)
    const { error: deleteError } = await supabase
        .from('classes')
        .delete()
        .in('id', classIds);

    if (deleteError) {
        console.error('Failed to delete classes:', deleteError);
    } else {
        console.log('Successfully deleted classes.');
    }
}

cleanup2ndSession();

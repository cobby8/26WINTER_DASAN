
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function restoreStudentSchedules() {
    console.log('--- RESTORING DELETED STUDENT SCHEDULES ---');

    // List of names from the investigation
    const targetNames = ['윤이한', '이도경', '이진우', '오예현', '정재후', '나유찬', '권오현', '김선우', '임성우', '박준서', '강하랑', '김대후', '신민주', '탁경일', '김수아', '박준수', '윤서한'];

    // 1. Get Student IDs
    const { data: students, error: studentError } = await supabase
        .from('students')
        .select('id, name')
        .in('name', targetNames);

    if (studentError) {
        console.error('Student Fetch Error:', studentError);
        return;
    }

    if (!students || students.length === 0) {
        console.log('No students found with target names.');
        return;
    }

    const studentIds = students.map(s => s.id);
    console.log(`Found ${students.length} students matching names.`);

    // 2. Find Soft Deleted Schedules for these students
    const { data: deletedSchedules, error: fetchError } = await supabase
        .from('shuttle_schedules')
        .select('id, student_id, day_of_week, time, type, deleted_at')
        .in('student_id', studentIds)
        .not('deleted_at', 'is', null);

    if (fetchError) {
        console.error('Error fetching deleted schedules:', fetchError);
        return;
    }

    if (!deletedSchedules || deletedSchedules.length === 0) {
        console.log('No deleted schedules found for these students.');
        return;
    }

    console.log(`Found ${deletedSchedules.length} deleted schedules to restore.`);
    deletedSchedules.forEach(s => {
        const name = students.find(st => st.id === s.student_id)?.name;
        console.log(` - Restoration Target: [${name}] ${s.day_of_week} ${s.time} (${s.type}) - Deleted: ${s.deleted_at}`);
    });

    // 3. Restore
    const { error: updateError } = await supabase
        .from('shuttle_schedules')
        .update({ deleted_at: null })
        .in('id', deletedSchedules.map(s => s.id));

    if (updateError) {
        console.error('Error restoring schedules:', updateError);
        return;
    }

    console.log('--- RESTORE COMPLETE: Successfully restored all found schedules. ---');
}

restoreStudentSchedules();

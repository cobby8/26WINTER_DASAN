
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function diagnose() {
    // 1. Get a shuttle student
    const { data: shuttles } = await supabase
        .from('shuttle_schedules')
        .select('student_id, students(name)')
        .limit(1);

    if (!shuttles || shuttles.length === 0) {
        console.log('No shuttle schedules found.');
        return;
    }

    const studentId = shuttles[0].student_id;
    // @ts-ignore
    const studentName = shuttles[0].students?.name;
    console.log(`Diagnosing Student: ${studentName} (${studentId})`);

    // 2. Get Enrollments
    const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
            id,
            status,
            class_id,
            classes (
                id,
                name,
                session,
                start_date,
                end_date,
                deleted_at
            )
        `)
        .eq('student_id', studentId);

    console.log('Enrollments:', JSON.stringify(enrollments, null, 2));

    // 3. Check for 2nd Session
    const has2nd = enrollments?.some((e: any) => e.classes?.session === '2차');
    console.log(`Has 2nd Session Enrollment? ${has2nd}`);
}

diagnose();

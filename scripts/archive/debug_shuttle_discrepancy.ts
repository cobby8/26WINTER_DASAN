
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env from root
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugDiscrepancy() {
    console.log('--- DEBUG START ---');

    // List of names from the screenshot to check
    const targetNames = ['권희윤', '김수아', '김선우', '권오현', '임성우', '나유찬', '오예현', '박준서', '윤이한', '이진우', '이도경', '탁경일', '강하랑', '정재후', '김대후', '신민주', '박준수', '윤서한'];

    let report = '--- DEBUG REPORT ---\n';

    // 1. Check if these students exist
    const { data: students, error: studentError } = await supabase
        .from('students')
        .select('id, name')
        .in('name', targetNames);

    if (studentError) {
        console.error('Student Fetch Error:', studentError);
        return;
    }

    const foundNames = students?.map(s => s.name) || [];
    const missingNames = targetNames.filter(n => !foundNames.includes(n));

    report += `1. Student Existence Check:\n`;
    report += `   Found: ${foundNames.length} / ${targetNames.length}\n`;
    report += `   Missing from DB: ${missingNames.join(', ') || 'None'}\n\n`;

    if (students && students.length > 0) {
        const studentIds = students.map(s => s.id);

        // 2. Check Schedules for the Found Students
        const { data: schedules, error: schedError } = await supabase
            .from('shuttle_schedules')
            .select('id, student_id, day_of_week, time, type, deleted_at')
            .in('student_id', studentIds);

        if (schedError) {
            console.error('Schedule Fetch Error:', schedError);
            return;
        }

        report += `2. Schedule Check for Found Students (${schedules?.length || 0} records):\n`;

        // Group by Student
        students.forEach(student => {
            const studentSchedules = schedules?.filter(s => s.student_id === student.id);
            const mondaySchedules = studentSchedules?.filter(s => s.day_of_week === 'Mon');

            report += `   - ${student.name}: Total ${studentSchedules?.length || 0} schedules.\n`;
            if (mondaySchedules && mondaySchedules.length > 0) {
                mondaySchedules.forEach(s => {
                    const status = s.deleted_at ? `(DELETED: ${s.deleted_at})` : '(ACTIVE)';
                    report += `     -> [${s.day_of_week}] ${s.time} (${s.type}) ${status}\n`;
                });
            } else {
                report += `     -> NO MONDAY SCHEDULES FOUND.\n`;
            }
        });
    }

    // 3. General Check for Monday Schedules
    const { count } = await supabase
        .from('shuttle_schedules')
        .select('*', { count: 'exact', head: true })
        .eq('day_of_week', 'Mon')
        .is('deleted_at', null);

    report += `\n3. Total Active Monday Schedules in DB: ${count}\n`;

    fs.writeFileSync('debug_discrepancy_report.txt', report, 'utf8');
    console.log('Report written to debug_discrepancy_report.txt');
}

debugDiscrepancy();

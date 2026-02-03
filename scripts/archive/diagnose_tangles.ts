
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);


async function diagnose() {
    console.log('=== DATABASE DIAGNOSIS ===');

    // 1. Students
    const { data: students } = await supabase.from('students').select('id, name, status');
    const studentIds = new Set(students?.map(s => s.id));
    console.log(`Total Students: ${students?.length || 0}`);

    const deletedStudents = students?.filter(s => s.status === 'deleted') || [];
    console.log(`Soft-Deleted Students: ${deletedStudents.length}`);

    // 2. Enrollments
    const { data: allEnrollments } = await supabase.from('enrollments').select('id, student_id, class_id');
    const enrollmentIds = new Set(allEnrollments?.map(e => e.id));

    const orphanedEnrollmentsByStudent = allEnrollments?.filter(e => !studentIds.has(e.student_id)) || [];
    console.log(`Orphaned Enrollments (Missing Student): ${orphanedEnrollmentsByStudent.length}`);

    // 3. Classes
    const { data: classes } = await supabase.from('classes').select('id');
    const classIds = new Set(classes?.map(c => c.id));

    const orphanedEnrollmentsByClass = allEnrollments?.filter(e => e.class_id && !classIds.has(e.class_id)) || [];
    console.log(`Orphaned Enrollments (Missing Class): ${orphanedEnrollmentsByClass.length}`);

    // 4. Attendance
    const { data: attendance } = await supabase.from('attendance').select('id, enrollment_id, class_id');
    const orphanedAttendanceByEnroll = attendance?.filter(a => !enrollmentIds.has(a.enrollment_id)) || [];
    const orphanedAttendanceByClass = attendance?.filter(a => !classIds.has(a.class_id)) || [];
    console.log(`Orphaned Attendance (Missing Enrollment): ${orphanedAttendanceByEnroll.length}`);
    console.log(`Orphaned Attendance (Missing Class): ${orphanedAttendanceByClass.length}`);

    // 5. Shuttle Schedules
    const { data: schedules } = await supabase.from('shuttle_schedules').select('id, student_id');
    const scheduleIds = new Set(schedules?.map(s => s.id));
    const orphanedSchedules = schedules?.filter(s => s.student_id && !studentIds.has(s.student_id)) || [];
    console.log(`Orphaned Shuttle Schedules (Missing Student): ${orphanedSchedules.length}`);

    // 6. Shuttle Logs
    const { data: shuttleLogs } = await supabase.from('shuttle_ops_logs').select('id, schedule_id, student_id');
    const orphanedShuttleLogsBySched = shuttleLogs?.filter(l => !scheduleIds.has(l.schedule_id)) || [];
    const orphanedShuttleLogsByStudent = shuttleLogs?.filter(l => l.student_id && !studentIds.has(l.student_id)) || [];
    console.log(`Orphaned Shuttle Logs (Missing Schedule): ${orphanedShuttleLogsBySched.length}`);
    console.log(`Orphaned Shuttle Logs (Missing Student): ${orphanedShuttleLogsByStudent.length}`);

    // 7. Schema Check: Attendance
    const { error: attSchemaError } = await supabase.from('attendance').select('student_id').limit(1);
    console.log(`\nAttendance table student_id column check: ${attSchemaError ? 'FAIL (' + attSchemaError.message + ')' : 'SUCCESS'}`);

    console.log('\n=== DIAGNOSIS END ===');
}


diagnose();

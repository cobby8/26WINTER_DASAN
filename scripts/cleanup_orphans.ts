
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function cleanupOrphans() {
    console.log('🧹 Starting Database Cleanup...');

    // 1. Cleanup Orphaned Attendance
    const { data: allEnrollments } = await supabase.from('enrollments').select('id');
    const enrollmentIds = new Set(allEnrollments?.map(e => e.id));

    const { data: attendance } = await supabase.from('attendance').select('id, enrollment_id');
    const orphanedAttendance = attendance?.filter(a => !enrollmentIds.has(a.enrollment_id)) || [];

    if (orphanedAttendance.length > 0) {
        console.log(`Found ${orphanedAttendance.length} orphaned attendance records. Deleting...`);
        const { error } = await supabase.from('attendance').delete().in('id', orphanedAttendance.map(a => a.id));
        if (error) console.error('Error deleting attendance:', error.message);
        else console.log('Successfully cleaned attendance.');
    } else {
        console.log('No orphaned attendance found.');
    }

    // 2. Cleanup Orphaned Shuttle Logs
    const { data: allSchedules } = await supabase.from('shuttle_schedules').select('id');
    const scheduleIds = new Set(allSchedules?.map(s => s.id));

    const { data: shuttleLogs } = await supabase.from('shuttle_ops_logs').select('id, schedule_id');
    const orphanedLogs = shuttleLogs?.filter(l => !scheduleIds.has(l.schedule_id)) || [];

    if (orphanedLogs.length > 0) {
        console.log(`Found ${orphanedLogs.length} orphaned shuttle logs. Deleting...`);
        const { error } = await supabase.from('shuttle_ops_logs').delete().in('id', orphanedLogs.map(l => l.id));
        if (error) console.error('Error deleting logs:', error.message);
        else console.log('Successfully cleaned shuttle logs.');
    } else {
        console.log('No orphaned shuttle logs found.');
    }

    console.log('✨ Cleanup Finished.');
}

cleanupOrphans();

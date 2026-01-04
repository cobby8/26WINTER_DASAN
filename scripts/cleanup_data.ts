import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { supabaseAdmin } from '../src/lib/supabase';

async function cleanup() {
    console.log('--- Database Integrity Check & Cleanup ---');

    // 1. Identify 'deleted' students
    const { data: deletedStudents } = await supabaseAdmin
        .from('students')
        .select('id, name')
        .eq('status', 'deleted');

    console.log(`Found ${deletedStudents?.length || 0} soft-deleted students.`);
    if (deletedStudents && deletedStudents.length > 0) {
        console.log('Cleaning up soft-deleted students (Hard Delete)...');
        for (const s of deletedStudents) {
            // Delete associated records first (cascading manual cleanup)
            await supabaseAdmin.from('attendance').delete().eq('student_id', s.id);
            await supabaseAdmin.from('shuttle_ops_logs').delete().eq('student_id', s.id);
            await supabaseAdmin.from('shuttle_schedules').delete().eq('student_id', s.id);
            await supabaseAdmin.from('enrollments').delete().eq('student_id', s.id);
            const { error } = await supabaseAdmin.from('students').delete().eq('id', s.id);
            if (error) console.error(`Failed to delete ${s.name}:`, error.message);
            else console.log(`Deleted ${s.name} (${s.id})`);
        }
    }

    // 2. Identify likely duplicate students (same name)
    const { data: allStudents } = await supabaseAdmin.from('students').select('id, name').order('name');
    const nameMap = new Map<string, string[]>();
    allStudents?.forEach(s => {
        if (!nameMap.has(s.name)) nameMap.set(s.name, []);
        nameMap.get(s.name)?.push(s.id);
    });

    console.log('\n--- Duplicate Check ---');
    for (const [name, ids] of nameMap.entries()) {
        if (ids.length > 1) {
            console.warn(`Duplicate found for name: ${name} (IDs: ${ids.join(', ')})`);
            // We won't auto-delete duplicates without confirmation, but we list them.
        }
    }

    // 3. Clear orphaned shuttle logs (no schedule)
    const { data: logs } = await supabaseAdmin.from('shuttle_ops_logs').select('id, schedule_id');
    const orphanLogs = [];
    for (const log of (logs || [])) {
        if (log.schedule_id) {
            const { data: sched } = await supabaseAdmin.from('shuttle_schedules').select('id').eq('id', log.schedule_id).single();
            if (!sched) orphanLogs.push(log.id);
        }
    }
    console.log(`\nFound ${orphanLogs.length} orphaned shuttle logs.`);
    if (orphanLogs.length > 0) {
        await supabaseAdmin.from('shuttle_ops_logs').delete().in('id', orphanLogs);
        console.log('Cleaned up orphaned logs.');
    }

    console.log('\n--- Cleanup Finished ---');
}

cleanup();

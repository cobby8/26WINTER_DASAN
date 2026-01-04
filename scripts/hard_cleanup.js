const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
    console.log('--- Hard Cleanup: Deleted Students ---');

    // 1. Get IDs of students with status 'deleted'
    const { data: students } = await supabase.from('students').select('id, name').eq('status', 'deleted');

    if (!students || students.length === 0) {
        console.log('No deleted students found.');
        return;
    }

    const ids = students.map(s => s.id);
    console.log(`Found ${ids.length} students to remove: ${students.map(s => s.name).join(', ')}`);

    // 2. Cascade cleanup (manual due to FKs)
    console.log('Cleaning up associations...');
    await supabase.from('attendance').delete().in('student_id', ids);
    await supabase.from('shuttle_ops_logs').delete().in('student_id', ids);
    await supabase.from('shuttle_schedules').delete().in('student_id', ids);
    await supabase.from('enrollments').delete().in('student_id', ids);

    // 3. Delete students
    const { error } = await supabase.from('students').delete().in('id', ids);

    if (error) {
        console.error('Final delete failed:', error.message);
    } else {
        console.log('Successfully removed orphaned records and students.');
    }

    console.log('--- Cleanup Finished ---');
}

cleanup();


import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env explicitly
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase Environment Variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetDatabase() {
    console.log('⚠️  Starting Database Reset... (Truncating data specific to CRM)');

    // Order matters due to foreign keys
    const tables = [
        'attendance',
        'enrollment_logs',
        'enrollments',
        'payments',
        'classes',
        'students'
    ];

    for (const table of tables) {
        console.log(`Deleting data from: ${table}`);
        const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows. neq id 0 is a hack to allow 'delete all' if no better way.
        // Actually, without a where clause, .delete() might be blocked depending on policy, but we are admin.
        // Supabase-js requires a filter for delete unless specifically allowed? 
        // Let's use a condition that is always true or simply check table size.
    }

    // Better Way: Use RPC if available, or just use delete with a dummy condition
    // Deleting via cascade might be easier if configured, but let's be explicit.

    // NOTE: supabase-js .delete() requires a filter.
    // Try: .gt('id', '00000000-0000-0000-0000-000000000000') for uuid

    // 1. Attendance
    const { error: attError } = await supabase.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (attError) console.error('Error clearing attendance:', attError);

    // 2. Enrollment Logs
    const { error: logError } = await supabase.from('enrollment_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (logError) console.error('Error clearing logs:', logError);

    // 3. Enrollments
    const { error: enrollError } = await supabase.from('enrollments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (enrollError) console.error('Error clearing enrollments:', enrollError);

    // 4. Payments
    const { error: payError } = await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (payError) console.error('Error clearing payments:', payError);

    // 5. Classes
    const { error: classError } = await supabase.from('classes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (classError) console.error('Error clearing classes:', classError);

    // 6. Students
    const { error: studentError } = await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (studentError) console.error('Error clearing students:', studentError);

    console.log('✅ Database Reset Complete.');
}

resetDatabase();

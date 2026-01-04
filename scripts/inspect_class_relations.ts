
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectRelations() {
    console.log('Inspecting Foreign Keys referencing "classes" table...');

    // Query postgres internal tables to find FKs
    // Note: We can't access information_schema easily via supabase-js unless we use rpc.
    // Instead, let's just checking common tables by trying to select from them.
    // Actually, better way: try to delete a dummy class and see the error? No, safer to just list tables.

    const tablesToCheck = ['enrollments', 'attendance', 'enrollment_logs', 'shuttle_schedules'];

    for (const table of tablesToCheck) {
        console.log(`Checking ${table}...`);
        // Just checking if column exists
        const { data, error } = await supabase.from(table).select('class_id').limit(1);
        if (!error) {
            console.log(`- ${table} has 'class_id' column.`);
        } else {
            console.log(`- ${table}: ${error.message}`);
        }
    }
}

inspectRelations();

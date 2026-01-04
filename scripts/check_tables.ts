
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env explicitly
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function listTables() {
    // This is a bit of a hack to list tables via PostgREST if we don't have direct SQL access
    // We try to query a non-existent table to see errors, or just try known ones.
    // Actually, we can check `enrollment_logs` validity by simple select.

    console.log("Checking 'enrollment_logs'...");
    const { error: logsError } = await supabaseAdmin.from('enrollment_logs').select('count', { count: 'exact', head: true });
    if (logsError) console.error("Error accessing 'enrollment_logs':", logsError);
    else console.log("'enrollment_logs' exists.");

    console.log("Checking 'attendance'...");
    const { error: attError } = await supabaseAdmin.from('attendance').select('count', { count: 'exact', head: true });
    if (attError) console.error("Error accessing 'attendance':", attError);
    else console.log("'attendance' exists.");

}

listTables();

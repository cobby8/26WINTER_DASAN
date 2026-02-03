
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAttendance() {
    const { count, error } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .gte('date', '2026-02-01')
        .lte('date', '2026-02-28');

    console.log(`Title: Feb 2026 Attendance Records`);
    console.log(`Count: ${count}`);
}

checkAttendance();

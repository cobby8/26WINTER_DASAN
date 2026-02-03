
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    const { count, error } = await supabase
        .from('shuttle_schedules')
        .select('*', { count: 'exact', head: true });
    // Optionally filter by created_at today if needed, but simple count is good start.

    if (error) console.error(error);
    else console.log(`Total Shuttle Schedules: ${count}`);

    // Check specific sample
    const { data } = await supabase.from('shuttle_schedules').select('*').limit(5).order('created_at', { ascending: false });
    console.log('Sample:', data);
}

check();

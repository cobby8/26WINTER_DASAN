
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCount() {
    const { count } = await supabase
        .from('shuttle_schedules')
        .select('*', { count: 'exact', head: true });

    console.log(`Shuttle Schedules Count: ${count}`);
}

checkCount();

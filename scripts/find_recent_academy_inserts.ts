
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkRecentInserts() {
    console.log('--- Checking Recent Academy Inserts ---');
    
    // Check records created in the last 10 minutes
    const cutoff = new Date();
    cutoff.setMinutes(cutoff.getMinutes() - 10);
    
    const { data, error } = await supabase
        .from('shuttle_schedules')
        .select('*')
        .gt('created_at', cutoff.toISOString())
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${data.length} recent inserts.`);
    data.forEach(d => {
        console.log(`- [${d.created_at}] Day:${d.day_of_week}, Type:${d.type}, Loc:${d.location_name}, Student:${d.student_id}`);
    });
}

checkRecentInserts();

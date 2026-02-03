
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function scanJanuary() {
    console.log('--- Scanning January Shuttle ---');

    // Get ALL distinct location_names or types from Jan
    const { data: list } = await supabase
        .from('shuttle_schedules')
        .select('type, location_name, student_id')
        .limit(50);

    console.log('Sample dump:', list?.slice(0, 10));

    // Specifically look for '학원'
    const { data: academy } = await supabase
        .from('shuttle_schedules')
        .select('*')
        .ilike('location_name', '%학원%');

    console.log(`Explicit '학원' search found: ${academy?.length}`);
    academy?.forEach(a => console.log(a));
}

scanJanuary();


import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listClasses() {
    // 1. Strict Query
    const { data: strict } = await supabase
        .from('classes')
        .select('id, name, session, branch, day_of_week')
        .eq('session', '2차')
        .is('deleted_at', null);

    console.log(`Strict Query (session='2차'): Found ${strict?.length} classes.`);

    // 2. Loose Query
    const { data: loose } = await supabase
        .from('classes')
        .select('id, name, session, branch, day_of_week')
        .ilike('name', '%[2차%')
        .is('deleted_at', null);

    console.log(`Loose Query (name like '%[2차%'): Found ${loose?.length} classes.`);

    if (loose && loose.length > 0) {
        console.log('Sample classes from Loose Query:');
        loose.slice(0, 3).forEach(c => console.log(JSON.stringify(c)));
    }
}

listClasses();

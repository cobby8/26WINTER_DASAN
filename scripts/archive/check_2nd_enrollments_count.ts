
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkEnrollmentCount() {
    const { count, error } = await supabase
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');

    // We want specifically 2nd session enrollments.
    // Filter by class session
    const { data: classes } = await supabase.from('classes').select('id').eq('session', '2차');
    if (!classes) { console.log('No 2nd session classes'); return; }

    const ids = classes.map(c => c.id);

    const { count: count2nd, error: err2 } = await supabase
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
        .in('class_id', ids);

    // console.log(`Total Active Enrollments (Global): ${count}`);
    console.log(`COUNT_2ND:${count2nd}`);

    if (err2) console.error(err2);
}

checkEnrollmentCount();

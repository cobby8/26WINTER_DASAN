
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnose() {
    console.log('--- Diagnosis ---');

    // 1. Fetch all 2nd session classes
    const { data: classes } = await supabase
        .from('classes')
        .select('*')
        .eq('session', '2차')
        .is('deleted_at', null);

    console.log(`DB has ${classes?.length} classes for '2차'.`);
    if (classes) {
        classes.forEach(c => {
            console.log(`ID: ${c.id}`);
            console.log(`  Name: "${c.name}"`);
            console.log(`  Day: "${c.day_of_week}" (Len: ${c.day_of_week.length})`);
            console.log(`  Time: "${c.start_time}"`);
            console.log(`  Branch: "${c.branch}"`);
        });
    }
}

diagnose();

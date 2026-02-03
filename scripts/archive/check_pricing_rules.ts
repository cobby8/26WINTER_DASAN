
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkRules() {
    console.log('Checking Tuition Rules...');
    const { data: rules, error } = await supabase
        .from('tuition_rules')
        .select('*')
        .order('id');

    if (error) {
        console.error('Error fetching rules:', error);
        return;
    }

    console.log(JSON.stringify(rules, null, 2));

    console.log('\nChecking Classes (Sample)...');
    const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('id, name, session, day_of_week')
        .limit(5);

    if (classError) {
        console.error('Error fetching classes:', classError);
    } else {
        console.table(classes);
    }
}

checkRules();

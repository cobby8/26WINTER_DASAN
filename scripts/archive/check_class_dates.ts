
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkClassDates() {
    console.log('--- Checking 2nd Session Class Dates ---');

    // Fetch a few classes for session '2차'
    const { data: classes, error } = await supabase
        .from('classes')
        .select('*')
        .eq('session', '2차')
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (classes.length === 0) {
        console.log('No 2nd session classes found!');
    } else {
        classes.forEach(c => {
            console.log(`Class: ${c.name}`);
            console.log(`  Dates: ${c.start_date} ~ ${c.end_date} (if cols exist)`);
            console.log(`  Raw:`, c);
        });
    }
}

checkClassDates();

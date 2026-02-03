
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
    console.log('--- Checking Classes Table Columns ---');
    try {
        // Try to select all columns from one record
        const { data, error } = await supabase.from('classes').select('*').limit(1);
        if (error) {
            console.error('Error selecting from classes:', error);
        } else if (data && data.length > 0) {
            console.log('Columns found:', Object.keys(data[0]));
        } else {
            console.log('No data in classes table to inspect columns.');
            // Try to select specifically
            const { error: colError } = await supabase.from('classes').select('branch, session').limit(1);
            if (colError) {
                console.log('❌ branch or session columns seem MISSING:', colError.message);
            } else {
                console.log('✅ branch and session columns EXIST.');
            }
        }
    } catch (e: any) {
        console.error('Crash check:', e.message);
    }
}

check();

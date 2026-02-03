
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkClassStatus() {
    console.log('--- Checking 2nd Session Class Status ---');

    // Check for any classes in 2nd session
    const { data: classes, error } = await supabase
        .from('classes')
        .select('id, name, deleted_at, updated_at')
        .eq('session', '2차');

    if (error) { console.error(error); return; }

    const total = classes.length;
    const active = classes.filter(c => !c.deleted_at).length;
    const deleted = classes.filter(c => c.deleted_at).length;

    console.log(`Total 2nd Session Classes: ${total}`);
    console.log(`Active: ${active}`);
    console.log(`Deleted: ${deleted}`);

    if (deleted > 0) {
        console.log('Sample Deleted Class:', classes.find(c => c.deleted_at));
        console.log('Deleted At Timestamp:', classes.find(c => c.deleted_at)?.deleted_at);
        console.log('Updated At Timestamp:', classes.find(c => c.deleted_at)?.updated_at);
    }
}

checkClassStatus();

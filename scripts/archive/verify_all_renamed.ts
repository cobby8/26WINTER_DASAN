
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function verify() {
    console.log(`Checking DB: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
    const { data: classes } = await supabase
        .from('classes')
        .select('id, name')
        .ilike('name', '[%') // Starts with [
        .limit(100);

    if (classes && classes.length > 0) {
        console.log(`FOUND ${classes.length} LONG NAMES:`);
        classes.forEach(c => console.log(`- ${c.name}`));
    } else {
        console.log('ALL CLEAR. No names starting with "[" found.');
    }
}

verify();

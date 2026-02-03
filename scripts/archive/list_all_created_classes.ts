
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listAll() {
    const { data: classes } = await supabase
        .from('classes')
        .select('*')
        .ilike('name', '%[2차%')
        .is('deleted_at', null)
        .order('id');

    console.log(`\n--- Active 2nd Session Classes (${classes?.length}) ---`);
    classes?.forEach(c => {
        console.log(`[${c.branch}] ${c.day_of_week} ${c.start_time} | ${c.name}`);
    });
}

listAll();

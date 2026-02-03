
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listActive() {
    const { data: classes } = await supabase
        .from('classes')
        .select('*')
        .eq('session', '2차')
        .is('deleted_at', null)
        .order('branch')
        .order('day_of_week')
        .order('start_time');

    console.log(`Active '2차' Classes: ${classes?.length}`);
    classes?.forEach(c => {
        console.log(`[${c.branch}] ${c.day_of_week} ${c.start_time} - ${c.name}`);
    });
}

listActive();

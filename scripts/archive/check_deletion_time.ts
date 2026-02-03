
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDeletion() {
    const { data: classes } = await supabase
        .from('classes')
        .select('id, name, deleted_at')
        .eq('session', '2차')
        .not('deleted_at', 'is', null);

    console.log(`Found ${classes?.length} deleted classes.`);

    // Group by minute
    const times: { [key: string]: number } = {};
    classes?.forEach(c => {
        const t = c.deleted_at;
        times[t] = (times[t] || 0) + 1;
    });

    console.log('Deletion Times:', times);
}

checkDeletion();


import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function countActive() {
    console.log(`[Count Active] Connecting to ${supabaseUrl}`);

    const { count, error } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

    console.log(`Total Active Classes: ${count}`);

    const { count: c2Count } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('session', '2차')
        .is('deleted_at', null);

    console.log(`Active '2차' Classes: ${c2Count}`);
    const fs = require('fs');
    fs.writeFileSync('count_log.txt', `Total:${count}\n2nd:${c2Count}`);
}

countActive();

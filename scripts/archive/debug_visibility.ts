
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectData() {
    console.log(`URL: ${supabaseUrl}`);

    console.log('--- Visible Class (1차) ---');
    const { data: c1 } = await supabase
        .from('classes')
        .select('*')
        .eq('session', '1차')
        .is('deleted_at', null)
        .limit(1);
    console.log(JSON.stringify(c1?.[0] || 'None', null, 2));

    console.log('--- Hidden Class (2차) ---');
    const { data: c2 } = await supabase
        .from('classes')
        .select('*')
        .eq('session', '2차')
        .is('deleted_at', null)
        .limit(1);

    // Determine if we found it
    if (c2 && c2.length > 0) {
        console.log(JSON.stringify(c2[0], null, 2));
    } else {
        console.log('No 2차 class found even with simple query!');
        // Try without delete check?
        const { data: c2All } = await supabase.from('classes').select('*').eq('session', '2차').limit(1);
        if (c2All?.length) console.log('Found 2차 class but deleted/filtered:', c2All[0]);
    }

    console.log('--- Shuttle Schedule (Mon) ---');
    const { data: s } = await supabase
        .from('shuttle_schedules')
        .select('*')
        .eq('day_of_week', 'Mon')
        .limit(1);
    console.log(JSON.stringify(s?.[0] || 'None', null, 2));
}

inspectData();

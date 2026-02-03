
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check2ndClasses() {
    const { data: classes, error } = await supabase
        .from('classes')
        .select('*')
        .eq('session', '2차')
        .is('deleted_at', null);

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Found ${classes.length} classes for session '2차'.`);
    classes.forEach(c => {
        console.log(`[${c.id}] ${c.name} : ${c.day_of_week} ${c.start_time} (${c.branch})`);
    });
}

check2ndClasses();

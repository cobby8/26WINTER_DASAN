
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
    // 1. Get 1st Session sample
    console.log(`Script URL: ${supabaseUrl}`);
    const { data: c1 } = await supabase.from('classes').select('*').eq('session', '1차').limit(1);
    const item1 = c1?.[0] || {};
    console.log(`[1차] ID: ${item1.id}, Name: ${item1.name}, Sess: ${item1.session}, Branch: ${item1.branch}, Date: ${item1.start_date}~${item1.end_date}, Del: ${item1.deleted_at}`);

    // 2. Get 2nd Session sample
    const { data: c2 } = await supabase.from('classes').select('*').eq('session', '2차').limit(1);
    const item2 = c2?.[0] || {};
    console.log(`[2차] ID: ${item2.id}, Name: ${item2.name}, Sess: ${item2.session}, Branch: ${item2.branch}, Date: ${item2.start_date}~${item2.end_date}, Del: ${item2.deleted_at}`);

    // 3. Check Shuttle Mon sample
    const { data: s } = await supabase.from('shuttle_schedules').select('*').eq('day_of_week', 'Mon').limit(1);
    const sItem = s?.[0] || {};
    console.log(`[Shuttle] ID: ${sItem.id}, Day: ${sItem.day_of_week}, Name: ${sItem.location_name}`);
}
check();

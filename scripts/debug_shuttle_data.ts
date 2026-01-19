
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSchedules() {
    console.log(`\n[${new Date().toISOString()}] Checking Schedules for Tue (1/20)`);
    const { data: tueData } = await supabase
        .from('shuttle_schedules')
        .select('*')
        .eq('day_of_week', 'Tue')
        .or('type.eq.academy_start,type.eq.academy_end');

    console.log(`Total Tue Records: ${tueData?.length}`);
    if (tueData?.length) {
        tueData.forEach(d => {
            const status = d.deleted_at ? 'DELETED' : 'ACTIVE';
            console.log(`- [${status}] ${d.type} at ${d.time} (ID: ${d.id.substring(0, 6)})`);
        });
    }
}

checkSchedules();

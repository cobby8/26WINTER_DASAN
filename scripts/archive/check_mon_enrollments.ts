
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkMon() {
    console.log('--- Mon Check ---');

    // 1. Mon Classes
    const { data: monClasses } = await supabase.from('classes')
        .select('id, name')
        .eq('session', '2차')
        .eq('day_of_week', '월요일');

    console.log(`Mon Classes Count: ${monClasses?.length || 0}`);

    // 2. Mon Enrollments
    if (monClasses && monClasses.length > 0) {
        const ids = monClasses.map(c => c.id);
        const { count } = await supabase.from('enrollments')
            .select('*', { count: 'exact', head: true })
            .in('class_id', ids);
        console.log(`Enrollments in Mon Classes: ${count}`);
    } else {
        console.log('No Mon Classes to check enrollments.');
    }

    // 3. Mon Shuttle
    const { count: sCount } = await supabase.from('shuttle_schedules')
        .select('*', { count: 'exact', head: true })
        .eq('day_of_week', 'Mon');
    console.log(`Mon Shuttle Schedules: ${sCount}`);
}

checkMon();

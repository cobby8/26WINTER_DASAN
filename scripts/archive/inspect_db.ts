
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function inspectClasses() {
    console.log('Inspecting Classes...');

    // Check classes for 'Monday'
    const { data: monClasses } = await supabase.from('classes').select('*').eq('day_of_week', '월요일');
    console.log('--- Monday Classes (day_of_week="월요일") ---');
    console.log(monClasses?.map(c => `${c.day_of_week} | ${c.name}`));

    // Check classes that have "화요일" in name
    const { data: tueNameClasses } = await supabase.from('classes').select('*').ilike('name', '%화요일%');
    console.log('--- Classes named "Tuesday" ---');
    console.log(tueNameClasses?.map(c => `${c.day_of_week} | ${c.name}`));
}

inspectClasses();

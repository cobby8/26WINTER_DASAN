
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectString() {
    console.log('--- Inspecting Class Strings ---');
    const { data: classes } = await supabase
        .from('classes')
        .select('id, name, day_of_week, session')
        .eq('session', '2차')
        .limit(1);

    if (classes && classes.length > 0) {
        const c = classes[0];
        console.log(`Class: ${c.name}`);
        console.log(`Session: "${c.session}"`);
        console.log(`Day: "${c.day_of_week}"`);

        console.log('Day Char Codes:', c.day_of_week.split('').map(char => char.charCodeAt(0)));
        console.log('Expected "월요일" Codes:', '월요일'.split('').map(char => char.charCodeAt(0)));

        console.log('Session Char Codes:', c.session.split('').map(char => char.charCodeAt(0)));
        console.log('Expected "2차" Codes:', '2차'.split('').map(char => char.charCodeAt(0)));
    } else {
        console.log('No 2차 classes found.');
    }

    console.log('--- Inspecting Shuttle Strings ---');
    const { data: shuttles } = await supabase
        .from('shuttle_schedules')
        .select('day_of_week')
        .limit(1);

    if (shuttles && shuttles.length > 0) {
        const s = shuttles[0];
        console.log(`Shuttle Day: "${s.day_of_week}"`);
    } else {
        console.log('No shuttles found.');
    }
}

inspectString();

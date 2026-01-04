
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function dumpClasses() {
    console.log('--- Dumping Classes ---');
    const { data: classes, error } = await supabase
        .from('classes')
        .select('*')
        .order('id');

    if (error) {
        console.error(error);
        return;
    }

    if (!classes || classes.length === 0) {
        console.log('No classes found.');
        return;
    }

    console.log(`Total Classes: ${classes.length}`);
    classes.forEach(c => {
        console.log(`[${c.id}] DayCol: "${c.day_of_week}" | Name: "${c.name}" | Time: ${c.start_time}`);
    });
}

dumpClasses();

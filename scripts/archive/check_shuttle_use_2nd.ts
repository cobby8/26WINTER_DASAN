
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkShuttle() {
    // Get 2nd session classes
    const { data: classes } = await supabase
        .from('classes')
        .select('id')
        .eq('session', '2차');

    if (!classes || classes.length === 0) return;
    const classIds = classes.map(c => c.id);

    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('shuttle_use')
        .in('class_id', classIds);

    if (!enrollments) return;

    const useCount = enrollments.filter(e => e.shuttle_use).length;
    console.log(`Total Enrollments: ${enrollments.length}`);
    console.log(`Shuttle Users: ${useCount}`);
}

checkShuttle();

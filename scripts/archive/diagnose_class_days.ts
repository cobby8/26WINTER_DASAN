
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDays() {
    const { data: classes } = await supabase.from('classes').select('day_of_week');
    const distinctDays = [...new Set(classes?.map(c => c.day_of_week))];
    console.log('Distinct Class Days:', distinctDays);
}

checkDays();


import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function count() {
    const { count, error } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('session', '2차');

    console.log(`2nd Session Classes Count: ${count}`);
}

count();

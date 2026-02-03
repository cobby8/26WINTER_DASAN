
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TARGET_ID = 'df2a614d-2bfc-4889-8a66-186cb757cfd9';

async function checkId() {
    const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('id', TARGET_ID)
        .maybeSingle();

    if (error) console.error(error);
    console.log('Result:', data);
}

checkId();

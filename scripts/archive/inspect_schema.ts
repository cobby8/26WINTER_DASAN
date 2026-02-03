
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspect() {
    const { data } = await supabase.from('classes').select('*').limit(1);
    if (data && data.length > 0) {
        console.log('Cols:', Object.keys(data[0]).join(','));
        // console.log('Branch Value:', data[0].branch);
    }
}
inspect();

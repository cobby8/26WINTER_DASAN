
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function forceRestore() {
    console.log(`[Force Restore] Connecting to ${supabaseUrl}`);

    const { data, error, count } = await supabase
        .from('classes')
        .update({ deleted_at: null })
        .eq('session', '2차')
        .select('*', { count: 'exact' });

    if (error) {
        console.error('Restore failed:', error);
    } else {
        console.log(`Restored ${count} classes (All 2차).`);
    }
}

forceRestore();

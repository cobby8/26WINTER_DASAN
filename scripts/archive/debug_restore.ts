
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TARGET_ID = 'df2a614d-2bfc-4889-8a66-186cb757cfd9';

async function debugRestore() {
    console.log('--- Debug Restore Start ---');

    // 1. Check current state
    let { data: before } = await supabase.from('classes').select('*').eq('id', TARGET_ID).single();
    console.log('Before State:', before ? `Deleted at: ${before.deleted_at}` : 'Not Found');

    // 2. Attempt Restore
    console.log('Attempting Restore...');
    const { data: updated, error } = await supabase
        .from('classes')
        .update({ deleted_at: null })
        .eq('id', TARGET_ID)
        .select()
        .single();

    if (error) {
        console.error('Update Error:', error);
    } else {
        console.log('Update Success. Returned Data:', updated ? `Deleted at: ${updated.deleted_at}` : 'No Data');
    }
}

debugRestore();

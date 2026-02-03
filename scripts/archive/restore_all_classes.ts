
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function restore() {
    console.log(`[Restore] Connecting to ${supabaseUrl}`);

    // 1. Count Deleted 2차 Classes
    const { count, error } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('session', '2차')
        .not('deleted_at', 'is', null);

    console.log(`Found ${count} deleted '2차' classes.`);

    if (count && count > 0) {
        // 2. Restore them
        const { data, error: updateError } = await supabase
            .from('classes')
            .update({ deleted_at: null })
            .eq('session', '2차')
            .not('deleted_at', 'is', null)
            .select();

        console.log(`Restored ${data?.length} classes.`);
        if (updateError) console.error('Error restoring:', updateError);
    } else {
        console.log('No deleted classes found to restore.');

        // Debug: Check ACTIVE count
        const { count: activeCount } = await supabase
            .from('classes')
            .select('*', { count: 'exact', head: true })
            .eq('session', '2차')
            .is('deleted_at', null);
        console.log(`But found ${activeCount} ACTIVE '2차' classes.`);
    }
}

restore();

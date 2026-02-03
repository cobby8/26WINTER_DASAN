
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function restoreAllDeleted() {
    console.log('--- RESTORING ALL DELETED SCHEDULES ---');

    // 1. Count deleted
    const { count, error: countError } = await supabase
        .from('shuttle_schedules')
        .select('*', { count: 'exact', head: true })
        .not('deleted_at', 'is', null);

    if (countError) {
        console.error('Error counting:', countError);
        return;
    }

    console.log(`Found total ${count} deleted schedules.`);

    if (count === 0) {
        console.log('Nothing to restore.');
        return;
    }

    // 2. Restore
    const { error: updateError, data } = await supabase
        .from('shuttle_schedules')
        .update({ deleted_at: null })
        .not('deleted_at', 'is', null)
        .select();

    if (updateError) {
        console.error('Error restoring:', updateError);
        return;
    }

    console.log(`Successfully restored ${data?.length} schedules.`);
    console.log('--- RESTORE COMPLETE ---');
}

restoreAllDeleted();

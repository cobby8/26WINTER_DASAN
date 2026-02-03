
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function backdateShuttles() {
    console.log('--- Backdating Shuttle Schedules to 2026-02-01 ---');

    // We want to update ALL active schedules to have created_at before Feb 2nd.
    const backdate = '2026-02-01T00:00:00.000Z';

    // Select IDs first
    const { data: schedules, error: fetchError } = await supabase
        .from('shuttle_schedules')
        .select('id')
        .is('deleted_at', null);

    if (fetchError || !schedules) {
        console.error('Fetch Error:', fetchError);
        return;
    }

    console.log(`Found ${schedules.length} active schedules. Backdating...`);

    const ids = schedules.map(s => s.id);

    // Update created_at
    const { error: updateError } = await supabase
        .from('shuttle_schedules')
        .update({ created_at: backdate })
        .in('id', ids);

    if (updateError) {
        console.error('Update Failed:', updateError);
    } else {
        console.log('Success! created_at set to 2026-02-01.');
    }
}

backdateShuttles();

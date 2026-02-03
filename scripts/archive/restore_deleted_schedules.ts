
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function restoreSchedules() {
    console.log('--- RESTORING DELETED ACADEMY STOPS ---');

    // 1. Fetch deleted academy stops
    const { data: deletedAcademy, error: fetchError } = await supabase
        .from('shuttle_schedules')
        .select('id, type, day_of_week')
        .is('student_id', null)
        .not('deleted_at', 'is', null);

    if (fetchError) {
        console.error('Error fetching:', fetchError);
        return;
    }

    if (!deletedAcademy || deletedAcademy.length === 0) {
        console.log('No deleted academy stops found to restore.');
        return;
    }

    console.log(`Found ${deletedAcademy.length} deleted stops. Restoring...`);

    // 2. Restore them (Set deleted_at = NULL)
    const { error: updateError } = await supabase
        .from('shuttle_schedules')
        .update({ deleted_at: null })
        .is('student_id', null)
        .not('deleted_at', 'is', null);

    if (updateError) {
        console.error('Error restoring:', updateError);
        return;
    }

    console.log('Successfully restored all deleted academy stops.');
    console.log('--- RESTORE COMPLETE ---');
}

restoreSchedules();

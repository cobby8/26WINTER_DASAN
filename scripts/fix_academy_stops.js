
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function restoreAcademyStops() {
    console.log('--- Restore Academy Stops Script ---');

    // 1. Find Soft-Deleted Academy Stops (student_id IS NULL AND deleted_at IS NOT NULL)
    const { data: deletedStops, error: fetchError } = await supabase
        .from('shuttle_schedules')
        .select('*')
        .is('student_id', null)
        .not('deleted_at', 'is', null);

    if (fetchError) {
        console.error('Error fetching deleted stops:', fetchError);
        return;
    }

    console.log(`Found ${deletedStops.length} soft-deleted Academy Stops.`);

    if (deletedStops.length === 0) {
        console.log('No items to restore.');
        return;
    }

    // 2. Restore them
    const idsToRestore = deletedStops.map(s => s.id);
    console.log('Restoring IDs:', idsToRestore);

    const { error: updateError } = await supabase
        .from('shuttle_schedules')
        .update({ deleted_at: null })
        .in('id', idsToRestore);

    if (updateError) {
        console.error('Error restoring stops:', updateError);
    } else {
        console.log('✅ Successfully restored Academy Stops.');
    }
}

restoreAcademyStops();

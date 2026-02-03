import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function emergencyRestore() {
    console.log('=== EMERGENCY RESTORE: 2nd Session Classes ===\n');

    // Get recently deleted 2nd session classes (within last 2 hours to be safe)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data: deletedClasses, error: fetchError } = await supabase
        .from('classes')
        .select('id, name, session, deleted_at')
        .or('session.eq.2차,name.ilike.%2차%')
        .not('deleted_at', 'is', null)
        .gte('deleted_at', twoHoursAgo);

    if (fetchError) {
        console.error('Error fetching deleted classes:', fetchError);
        return;
    }

    console.log(`Found ${deletedClasses.length} recently deleted 2nd session classes`);

    if (deletedClasses.length === 0) {
        console.log('No recently deleted classes to restore.');
        return;
    }

    // Show what we're restoring
    console.log('\nRestoring:');
    deletedClasses.forEach(c => {
        console.log(`  - ${c.name}`);
    });

    // Restore ALL of them
    const classIds = deletedClasses.map(c => c.id);
    const { error: restoreError } = await supabase
        .from('classes')
        .update({ deleted_at: null })
        .in('id', classIds);

    if (restoreError) {
        console.error('\n❌ Error restoring classes:', restoreError);
    } else {
        console.log(`\n✅ Successfully restored ${deletedClasses.length} classes!`);
    }

    // Verify
    const { data: nowActive } = await supabase
        .from('classes')
        .select('id, name')
        .or('session.eq.2차,name.ilike.%2차%')
        .is('deleted_at', null);

    console.log(`\nVerification: ${nowActive?.length || 0} active 2nd session classes now`);
}

emergencyRestore();

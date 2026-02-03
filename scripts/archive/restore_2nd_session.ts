
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function restore2ndSessionClasses() {
    console.log('--- Restoring 2nd Session Classes ---');

    // 1. Identify valid 2nd session classes that are deleted
    const { data: targetClasses, error: fetchError } = await supabase
        .from('classes')
        .select('id, name')
        .or('session.eq.2차,name.ilike.%2차%')
        .not('deleted_at', 'is', null);

    if (fetchError) {
        console.error('Error fetching classes:', fetchError);
        return;
    }

    console.log(`Found ${targetClasses.length} soft-deleted classes to restore.`);

    if (targetClasses.length === 0) {
        console.log('No classes to restore.');
        return;
    }

    // 2. Restore them
    const ids = targetClasses.map(c => c.id);
    const { error: updateError } = await supabase
        .from('classes')
        .update({ deleted_at: null })
        .in('id', ids);

    if (updateError) {
        console.error('Error updating classes:', updateError);
    } else {
        console.log(`Successfully restored ${ids.length} classes.`);
        targetClasses.forEach(c => console.log(`Restored: ${c.name}`));
    }
}

restore2ndSessionClasses();


import { supabaseAdmin } from '../src/lib/supabase';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function restore() {
    console.log('--- Restoring Deleted Students ---');
    console.log(`Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Loaded' : 'Missing'}`);

    // 1. Count Deleted Students
    const { count, error: countErr } = await supabaseAdmin
        .from('students')
        .select('*', { count: 'exact', head: true })
        .not('deleted_at', 'is', null);

    if (countErr) {
        console.error('Count Failed:', countErr);
        return;
    }
    console.log(`Found ${count} soft-deleted students.`);

    if ((count || 0) > 0) {
        const { error: updateErr } = await supabaseAdmin
            .from('students')
            .update({ deleted_at: null })
            .not('deleted_at', 'is', null);

        if (updateErr) console.error('Restore Failed:', updateErr);
        else console.log('Successfully restored all deleted students.');
    } else {
        console.log('Nothing to restore.');
    }
}

restore();


import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function forceRestore() {
    console.log('--- Force Restore Feb Classes ---');

    // 1. Fetch all classes matching 2차 criteria
    // We can just filter in JS to be safe, or use complex OR query
    const { data: classes } = await supabase.from('classes').select('*');

    const targetClasses = classes?.filter(c =>
        (c.session_id && c.session_id.includes('2차')) ||
        (c.name && c.name.includes('[2차')) ||
        (c.session && c.session.includes('2차'))
    ) || [];

    console.log(`Found ${targetClasses.length} target classes.`);

    const deletedOnes = targetClasses.filter(c => c.deleted_at);
    console.log(`Of which ${deletedOnes.length} are currently deleted.`);

    if (deletedOnes.length === 0) {
        console.log('All classes are already active! Nothing to do.');
        return;
    }

    console.log('Restoring...');

    for (const c of deletedOnes) {
        const { error } = await supabase
            .from('classes')
            .update({ deleted_at: null })
            .eq('id', c.id);

        if (error) console.error(`Failed to restore ${c.id}: ${error.message}`);
        else console.log(`Restored ${c.name} (${c.id})`);
    }
    console.log('Done.');
}

forceRestore();


import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function simplestRename() {
    console.log('Fetching all classes for simplest rename...');

    const { data: classes, error } = await supabase
        .from('classes')
        .select('id, name');

    if (error || !classes) {
        console.error('Error fetching classes:', error);
        return;
    }

    console.log(`Checking ${classes.length} classes.`);

    let updatedCount = 0;

    for (const cls of classes) {
        // Only target those starting with [
        if (!cls.name.trim().startsWith('[')) continue;

        // Logic: Extract text between last '(' and last ')'
        const lastOpen = cls.name.lastIndexOf('(');
        const lastClose = cls.name.lastIndexOf(')');

        if (lastOpen > -1 && lastClose > lastOpen) {
            const target = cls.name.substring(lastOpen + 1, lastClose).trim();

            if (target && target !== cls.name) {
                console.log(`Renaming ID ${cls.id}:`);
                console.log(`  Old: "${cls.name}"`);
                console.log(`  New: "${target}"`);

                const { error: updateError } = await supabase
                    .from('classes')
                    .update({ name: target })
                    .eq('id', cls.id);

                if (updateError) {
                    console.error('  FAILED:', updateError);
                } else {
                    updatedCount++;
                }
            }
        } else {
            console.log(`Skipping (No valid parens): "${cls.name}"`);
        }
    }
    console.log(`Total Updated: ${updatedCount}`);
}

simplestRename();

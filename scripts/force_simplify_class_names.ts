
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function forceSimplify() {
    console.log('Using robust logic (v2) to simplify class names...');

    // Fetch ALL classes this time to be sure, or filtered by bracket
    const { data: classes, error } = await supabase
        .from('classes')
        .select('id, name')
        .ilike('name', '%[%');

    if (error || !classes) {
        console.error('Error fetching classes:', error);
        return;
    }

    console.log(`Found ${classes.length} classes to check.`);

    let updatedCount = 0;
    // Proven regex from debug script
    // Captures content of LAST parentheses, ignoring trailing characters
    const pattern = /\(([^)]+)\)[^)]*$/;

    for (const cls of classes) {
        const match = cls.name.trim().match(pattern);
        if (match && match[1]) {
            const newName = match[1].trim();
            if (newName && newName !== cls.name) {
                console.log(`Updating ID ${cls.id}: \n  Old: "${cls.name}"\n  New: "${newName}"`);

                const { error: updateError } = await supabase
                    .from('classes')
                    .update({ name: newName })
                    .eq('id', cls.id);

                if (updateError) {
                    console.error('  FAILED:', updateError);
                } else {
                    updatedCount++;
                }
            } else {
                console.log(`Skipping (Name identical or empty): "${cls.name}" -> "${newName}"`);
            }
        } else {
            console.log(`Skipping (No Pattern Match): "${cls.name}"`);
        }
    }
    console.log(`Total Updated: ${updatedCount}`);
}

forceSimplify();


import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function simplifyClassNames() {
    console.log('Fetching all classes...');
    const { data: classes, error } = await supabase
        .from('classes')
        .select('id, name')
        .order('name');

    if (error || !classes) {
        console.error('Error fetching classes:', error);
        return;
    }

    console.log(`Total classes found: ${classes.length}`);

    let updatedCount = 0;

    // Regex to capture text inside the LAST pair of parentheses (Greedy)
    // Matches the last (...) block at the end of the string.
    // Since greedy, it will try to include internal parens if they exist inside the outer block.
    // However, if there are multiple separate parenthesized blocks, this might be risky.
    // But our format is `[Prefix] Title (Target Content)`. 
    // `[` is not `(`. So this should match the first `(` to the last `)`.
    const pattern = /\((.*)\)$/;

    for (const cls of classes) {
        const match = cls.name.trim().match(pattern);

        // Debug sample
        if (cls.name.includes('1차/2호점')) {
            console.log(`Debug Class: "${cls.name}"`);
            console.log(`  Match: ${match ? match[1] : 'null'}`);
        }

        // Ensure the match is meaningful and not just "(Something)" if the whole string was that.
        // The user said: `[1차/1호점] ... (1호점 1교시...)` -> `1호점 1교시...`
        // So we just want the content of the last parens.

        if (match && match[1]) {
            const newName = match[1].trim();

            if (newName !== cls.name) {
                // Check if new name is not empty
                if (newName.length > 0) {
                    console.log(`Renaming: \n  Old: "${cls.name}"\n  New: "${newName}"`);

                    const { error: updateError } = await supabase
                        .from('classes')
                        .update({ name: newName })
                        .eq('id', cls.id);

                    if (updateError) {
                        console.error(`Failed to update class ${cls.id}:`, updateError);
                    } else {
                        updatedCount++;
                    }
                }
            }
        } else {
            console.log(`Skipping (No pattern match): "${cls.name}"`);
        }
    }

    console.log(`\nTotal Classes Updated: ${updatedCount}`);
}

simplifyClassNames();

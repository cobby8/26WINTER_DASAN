
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function properRename() {
    console.log('Fetching classes for proper rename...');

    // Fetch classes that look like they need renaming (e.g. start with [ or have parens)
    // Actually, fetch all helps if we want to run broadly, but limit to likely candidates
    const { data: classes, error } = await supabase
        .from('classes')
        .select('id, name');

    if (error || !classes) {
        console.error('Error fetching classes:', error);
        return;
    }

    let updatedCount = 0;

    for (const cls of classes) {
        const name = cls.name.trim();

        // Target format: "... (TargetContent)"
        // We need to find the outer matching parens at the end.

        if (!name.endsWith(')')) continue; // Must end with )
        if (!name.includes('(')) continue;

        let balance = 0;
        let startIndex = -1;
        let endIndex = name.length - 1;

        // Scan backwards
        for (let i = name.length - 1; i >= 0; i--) {
            if (name[i] === ')') {
                balance++;
            } else if (name[i] === '(') {
                balance--;
                if (balance === 0) {
                    startIndex = i;
                    break;
                }
            }
        }

        if (startIndex > -1) {
            // Found the outer opening paren
            const target = name.substring(startIndex + 1, endIndex).trim();

            // Heuristic: If target is too short (e.g., just "초등저"), maybe we messed up?
            // But if the logic implies "The whole thing in parens is the name", we trust it.
            // Exception: If the name is ONLY "(...)", we probably shouldn't remove parens if that leaves nothing?
            // But user wants to extract content.

            // Also, avoid renaming to empty string
            if (target.length > 0 && target !== name && target !== cls.name) {
                // Check if it really looks like the target format 
                // (e.g. contains '호점' or '교시' or similar? Optional)

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
        }
    }
    console.log(`Total Updated: ${updatedCount}`);
}

properRename();

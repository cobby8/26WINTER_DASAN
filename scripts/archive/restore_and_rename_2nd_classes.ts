
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function restoreAndRename() {
    console.log('--- Restoring and Renaming 2nd Session Classes ---');

    const { data: classes, error } = await supabase
        .from('classes')
        .select('*')
        .eq('session', '2차');

    if (error) {
        console.error('Fetch error:', error);
        return;
    }

    if (!classes || classes.length === 0) {
        console.log('No 2nd session classes found.');
        return;
    }

    let updatedCount = 0;

    for (const cls of classes) {
        let newName = cls.name;

        // Logic: Extract text inside last parenthesis if present
        // Current format: "[2차/2호점] ... (Target Text)"
        // or just "Target Text"?

        const match = cls.name.match(/\(([^)]+)\)$/);
        // Note: The user said "1호점 1교시(초등저) 10:30~11:50".
        // This contains internal parentheses! regex `\(([^)]+)\)$` would only capture `(초등저)` or `(10:30~11:50)` if structured poorly.
        // My previous script updated it to: `${baseName} (${cellText})`
        // So the `cellText` is wrapped in `( )` at the END of the string.
        // But `cellText` itself has `(초등저)`.
        // So checking for the *last* balanced parens or just splitting?
        // Since I appended ` (${cellText})`, I can split by ' (' and take the last part, removing the trailing ')'.

        let targetName = null;
        if (cls.name.includes('] 겨울방학특강')) {
            // It has the prefix I added.
            const splitIdx = cls.name.lastIndexOf(' (');
            if (splitIdx !== -1) {
                const extracted = cls.name.substring(splitIdx + 2, cls.name.length - 1);
                targetName = extracted;
            }
        }

        // If we couldn't parse it (maybe already correct?), skip rename?
        // Wait, if it *is* deleted, we must restore it regardless.

        const updates: any = { deleted_at: null };
        if (targetName) {
            updates.name = targetName;
        }

        if (cls.deleted_at || (targetName && targetName !== cls.name)) {
            console.log(`Updating ${cls.name} -> ${updates.name || '(restoring only)'}`);
            const { error: updateError } = await supabase
                .from('classes')
                .update(updates)
                .eq('id', cls.id);

            if (updateError) console.error(`Failed to update ${cls.id}:`, updateError.message);
            else updatedCount++;
        }
    }

    console.log(`Finished. Processed ${updatedCount} classes.`);
}

restoreAndRename();

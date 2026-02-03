
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixGhost() {
    console.log('Fetching all classes to force-fix format...');
    // We already know logic: "1호점 1교시..."
    // Current Bad Name: "[1차/1호점] 겨울방학특강 월요일 10:00 (1호점 1교시(초등저) 10:00~11:20)"

    // We will target anything starting with [
    const { data: classes } = await supabase
        .from('classes')
        .select('*')
        .ilike('name', '%[%');

    if (!classes || classes.length === 0) {
        console.log('No verbose classes found.');
        return;
    }

    console.log(`Found ${classes.length} verbose classes.`);

    let updated = 0;
    const pattern = /\(([^)]+)\)$/; // Captured group 1 is target
    // Wait, the previous logic failed for nested parens.
    // Use the logic from `recover_names.ts` or just simple extraction?
    // "1호점 1교시(초등저) 10:00~11:20" is inside the LAST parentheses?
    // Name: "... (1호점 1교시(초등저) 10:00~11:20)"
    // It ends with ).

    for (const cls of classes) {
        // Find split point for the last Description
        // It seems to be " (" before the specific format?
        // Let's use the `recover_names.ts` logic which reconstructs it safely.

        let newName = '';

        // RECONSTRUCTION LOGIC
        if (cls.branch && cls.start_time && cls.end_time) {
            const startTime = cls.start_time.substring(0, 5);
            const endTime = cls.end_time.substring(0, 5);
            let period = '';

            if (cls.branch === '1호점') {
                if (startTime === '10:00') period = '1교시';
                else if (startTime === '11:00') period = '2교시'; // Guess
                else if (startTime === '11:30') period = '2교시';
                else period = `${startTime}타임`;
            } else if (cls.branch === '2호점') {
                if (startTime === '09:30') period = '1교시';
                else if (startTime === '11:00') period = '2교시';
                else if (startTime === '13:30') period = '3교시';
                else period = `${startTime}타임`;
            } else {
                period = `${startTime}타임`;
            }

            // Extract grade?
            // Old Name: ... (1호점 1교시(초등저) ...
            // Regex to find (Grade)
            const gradeMatch = cls.name.match(/\((초등저|초등고|중등)\)/);
            const grade = gradeMatch ? `(${gradeMatch[1]})` : '(기타)';

            newName = `${cls.branch} ${period}${grade} ${startTime}~${endTime}`;
        }

        if (newName && newName !== cls.name) {
            console.log(`Fixing ID ${cls.id}:`);
            console.log(`  Old: "${cls.name}"`);
            console.log(`  New: "${newName}"`);

            const { error } = await supabase
                .from('classes')
                .update({ name: newName })
                .eq('id', cls.id);

            if (error) console.error('Error:', error);
            else updated++;
        }
    }
    console.log(`Total Fixed: ${updated}`);
}

fixGhost();

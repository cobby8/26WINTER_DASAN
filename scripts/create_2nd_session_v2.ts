
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function create2ndSessionClassesV2() {
    console.log('--- Creating 2nd Session Classes (V2: Copy 1st + Shift Time) ---');

    // 1. Fetch 1st Session Classes
    const { data: sourceClasses, error } = await supabase
        .from('classes')
        .select('*')
        .eq('session', '1차')
        .is('deleted_at', null);

    if (error) { console.error(error); return; }
    if (!sourceClasses || sourceClasses.length === 0) { console.log('No 1st session classes.'); return; }

    let createdCount = 0;

    for (const src of sourceClasses) {
        // 2. Prepare Target Object
        let targetName = src.name.replace('1차', '2차'); // Simple replace first
        let targetStartTime = src.start_time;
        let targetEndTime = src.end_time;

        // 3. Apply Schedule Shift Logic
        // "1호점 1교시(초등저) Mon/Wed/Fri 10:00 -> 10:30~11:50"
        // Condition: Branch 1, Days M/W/F, Start 10:00
        // Check fuzzy start time (10:00:00)
        const isTargetTime = src.start_time.startsWith('10:00');
        const isTargetDay = ['월요일', '수요일', '금요일'].includes(src.day_of_week);
        const isTargetBranch = src.branch === '1호점'; // Or check name for '1호점'

        if (isTargetBranch && isTargetDay && isTargetTime) {
            console.log(`Applying Time Shift for: ${src.name}`);

            targetStartTime = '10:30:00';
            targetEndTime = '11:50:00'; // 80 mins

            // Adjust Name
            // Old: [2차/1호점] 겨울방학특강 월요일 10:00 (1호점 1교시(초등저) 10:00~11:20)
            // New: [2차/1호점] 겨울방학특강 월요일 10:30 (1호점 1교시(초등저) 10:30~11:50)

            // Replace 10:00 -> 10:30 in the main part
            targetName = targetName.replace('10:00', '10:30');
            // Replace time range in parens if exists
            targetName = targetName.replace('10:00~11:20', '10:30~11:50');

            // Also replace just "10:00" if it appears elsewhere? The above should cover typical format.
        }

        // 4. Insert
        const { error: insertError } = await supabase
            .from('classes')
            .insert({
                name: targetName,
                day_of_week: src.day_of_week,
                start_time: targetStartTime,
                end_time: targetEndTime,
                capacity: src.capacity,
                tuition: 0, // Reset or copy? Assuming 0 for now based on prev logs.
                session: '2차',
                branch: src.branch,
                start_date: '2026-02-02',
                end_date: '2026-02-28'
            });

        if (insertError) {
            console.error(`Failed to create ${targetName}:`, insertError.message);
        } else {
            createdCount++;
        }
    }

    console.log(`Finished. Created ${createdCount} classes.`);
}

create2ndSessionClassesV2();

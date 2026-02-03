
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function recoverNames() {
    console.log('Fetching classes to recover...');

    const { data: classes, error } = await supabase
        .from('classes')
        .select('id, name, branch, start_time, end_time');

    if (error || !classes) {
        console.error('Error fetching classes:', error);
        return;
    }

    let updatedCount = 0;

    for (const cls of classes) {
        // Identify corrupted names: Start with Grade + )
        // e.g., "중등) 13:30~14:50" or "초등저) 11:00~12:20"
        // Pattern: Does not start with digit or branch name, likely starts with '초' or '중' or '고'
        // And contains no '호점' or '교시'

        if (cls.name.includes('호점') && cls.name.includes('교시')) {
            // Likely correct or original verbose, skip
            continue;
        }

        if (!cls.name.includes(')')) continue;

        // Extract Grade from corrupted string
        // "중등) 13:30~14:50" -> Grade = "중등"
        const parts = cls.name.split(')');
        if (parts.length < 2) continue;

        const grade = parts[0].trim(); // "중등"
        // Validate grade looks reasonable (not too long)
        if (grade.length > 10) continue;

        // Determine Period based on Branch and Start Time
        const branch = cls.branch; // "1호점" or "2호점"
        const startTime = cls.start_time ? cls.start_time.substring(0, 5) : ''; // "09:30"
        const endTime = cls.end_time ? cls.end_time.substring(0, 5) : '';

        let period = '';

        if (branch === '1호점') {
            if (startTime === '10:00') period = '1교시';
            else if (startTime === '11:30') period = '2교시'; // Guess
            else if (startTime === '13:00') period = '3교시'; // Guess
            else period = `${startTime}타임`; // Fallback
        } else if (branch === '2호점') {
            if (startTime === '09:30') period = '1교시';
            else if (startTime === '11:00') period = '2교시';
            else if (startTime === '13:30') period = '3교시';
            else if (startTime === '15:00') period = '4교시';
            else period = `${startTime}타임`;
        } else {
            period = `${startTime}타임`;
        }

        // Construct New Name
        // Format: "2호점 2교시(초등저) 11:00~12:20"
        const newName = `${branch} ${period}(${grade}) ${startTime}~${endTime}`;

        console.log(`Recovering ID ${cls.id}:`);
        console.log(`  Corrupted: "${cls.name}"`);
        console.log(`  Reconstructed: "${newName}"`);

        // Perform Update
        const { error: updateError } = await supabase
            .from('classes')
            .update({ name: newName })
            .eq('id', cls.id);

        if (updateError) {
            console.error('  FAILED:', updateError);
        } else {
            updatedCount++;
        }
    }
    console.log(`Total Recovered: ${updatedCount}`);
}

recoverNames();

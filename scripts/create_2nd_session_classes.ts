
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function create2ndSessionClasses() {
    console.log('--- Creating 2nd Session Classes ---');

    // 1. Fetch '1차' Classes
    const { data: classes1, error: fetchError } = await supabase
        .from('classes')
        .select('*')
        .eq('session', '1차')
        .is('deleted_at', null);

    if (fetchError) {
        console.error('Fetch Error:', fetchError);
        return;
    }

    if (!classes1 || classes1.length === 0) {
        console.log('No 1st Session classes found.');
        return;
    }

    console.log(`Found ${classes1.length} 1st Session classes.`);

    let createdCount = 0;

    for (const c1 of classes1) {
        // 2. Prepare '2차' Class Object
        const newName = c1.name.replace('1차', '2차').replace('[1차/', '[2차/');
        // Note: The second replace handles the "[1차/1호점]" pattern seen in syncService

        const newClass = {
            name: newName,
            day_of_week: c1.day_of_week,
            start_time: c1.start_time,
            end_time: c1.end_time,
            session: '2차', // NEW SESSION
            branch: c1.branch,
            capacity: c1.capacity
        };

        // 3. Check if exists
        const { data: existing } = await supabase
            .from('classes')
            .select('id')
            .eq('session', '2차')
            .eq('branch', newClass.branch)
            .eq('day_of_week', newClass.day_of_week)
            .eq('start_time', newClass.start_time)
            .maybeSingle();

        if (existing) {
            console.log(`Skipping existing 2nd session class: ${newName}`);
            continue;
        }

        // 4. Insert
        const { error: insertError } = await supabase
            .from('classes')
            .insert(newClass);

        if (insertError) {
            console.error(`Failed to create ${newName}:`, insertError.message);
        } else {
            console.log(`Created: ${newName}`);
            createdCount++;
        }
    }

    console.log(`Finished. Created ${createdCount} new classes.`);
}

create2ndSessionClasses();

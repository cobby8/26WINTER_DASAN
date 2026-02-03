
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeClasses() {
    const output: string[] = [];
    const log = (msg: string) => {
        console.log(msg);
        output.push(msg);
    };

    log('--- Analyzing Classes ---');

    // Fetch all classes, including deleted ones
    const { data: allClasses, error } = await supabase
        .from('classes')
        .select('*');

    if (error) {
        log(`Error fetching classes: ${error.message}`);
        const fs = require('fs');
        fs.writeFileSync('analysis_result.txt', output.join('\n'));
        return;
    }

    log(`Total classes found (including deleted): ${allClasses.length}`);

    // 1. Check for "2차" (2nd Session) specific queries
    const session2Classes = allClasses.filter(c =>
        (c.session_id && c.session_id.includes('2차')) ||
        (c.name && c.name.includes('2차')) ||
        (c.session && c.session.includes('2차'))
    );

    log(`\nClasses that seek to be '2차' (by name or session_id): ${session2Classes.length}`);
    const activeSession2 = session2Classes.filter(c => !c.deleted_at);
    log(`Active '2차' classes: ${activeSession2.length}`);
    log(`Deleted '2차' classes: ${session2Classes.length - activeSession2.length}`);

    if (session2Classes.length > 0) {
        log('\nSample 2nd Session Class:');
        log(JSON.stringify(session2Classes[0], null, 2));
    }

    // 2. Analyze Duplicates (based on session_id, day_of_week, start_time, branch_id)
    const grouped: { [key: string]: any[] } = {};

    allClasses.forEach(c => {
        // Key for duplication check - Normalize key
        const session = c.session || c.session_id || 'unknown';
        const key = `${session}|${c.day_of_week}|${c.start_time}|${c.branch_id}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(c);
    });

    let duplicateGroups = 0;
    let totalDuplicates = 0;

    log('\n--- Duplicate Analysis ---');
    for (const [key, group] of Object.entries(grouped)) {
        if (group.length > 1) {
            const activeInGroup = group.filter(c => !c.deleted_at);

            duplicateGroups++;
            totalDuplicates += (group.length - 1);

            if (duplicateGroups <= 5) {
                log(`\nDuplicate Group Found: ${key}`);
                log(`Count: ${group.length} (Active: ${activeInGroup.length})`);
                group.forEach(c => log(` - ID: ${c.id}, Name: ${c.name}, Deleted: ${c.deleted_at}, Created: ${c.created_at}`));
            }
        }
    }

    log(`\nTotal Groups with Duplicates: ${duplicateGroups}`);
    log(`Total Extra Records: ${totalDuplicates}`);

    // 3. Enrollment Check for Duplicates
    // If we have duplicates, we need to know where the students are.
    log('\n--- Checking Enrollments for Sample Duplicates ---');
    // ... (Can implement if needed, but start with class structure first)

    const fs = require('fs');
    fs.writeFileSync('analysis_result.txt', output.join('\n'));
}

analyzeClasses();

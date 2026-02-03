import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function analyzeCleanup() {
    let output = '=== 2nd Session Cleanup Analysis ===\n\n';

    // Fetch all 2nd session classes
    const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('id, name, branch, session, day_of_week, start_time, end_time, capacity')
        .or('session.eq.2차,name.ilike.%2차%')
        .is('deleted_at', null)
        .order('name')
        .order('day_of_week')
        .order('start_time');

    if (classError) {
        output += `Error: ${classError.message}\n`;
        fs.writeFileSync('cleanup_analysis.txt', output, 'utf8');
        return;
    }

    // Fetch enrollments
    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('class_id')
        .eq('status', 'active');

    const enrollmentCounts: { [key: string]: number } = {};
    if (enrollments) {
        enrollments.forEach(e => {
            enrollmentCounts[e.class_id] = (enrollmentCounts[e.class_id] || 0) + 1;
        });
    }

    // Analyze
    const emptyClasses = classes.filter(c => !enrollmentCounts[c.id]);
    const occupiedClasses = classes.filter(c => enrollmentCounts[c.id] > 0);

    output += `Total Classes: ${classes.length}\n`;
    output += `Classes with enrollments: ${occupiedClasses.length}\n`;
    output += `Classes with NO enrollments: ${emptyClasses.length}\n\n`;

    // Find duplicates
    const duplicateGroups: { [key: string]: any[] } = {};
    classes.forEach(c => {
        const key = `${c.name}|${c.day_of_week}|${c.start_time}`;
        if (!duplicateGroups[key]) duplicateGroups[key] = [];
        duplicateGroups[key].push(c);
    });

    const actualDuplicates = Object.entries(duplicateGroups).filter(([_, group]) => group.length > 1);

    output += `\n=== Duplicate Groups: ${actualDuplicates.length} ===\n`;
    actualDuplicates.forEach(([key, group]) => {
        output += `\n"${group[0].name}" (${group[0].day_of_week} ${group[0].start_time}):\n`;
        group.forEach(c => {
            const count = enrollmentCounts[c.id] || 0;
            output += `  - ID: ${c.id} | Enrollments: ${count}/${c.capacity}\n`;
        });
    });

    output += `\n\n=== Empty Classes (No Enrollments) ===\n`;
    emptyClasses.slice(0, 20).forEach(c => {
        output += `[${c.id}] ${c.name} (${c.day_of_week} ${c.start_time})\n`;
    });
    if (emptyClasses.length > 20) {
        output += `... and ${emptyClasses.length - 20} more\n`;
    }

    fs.writeFileSync('cleanup_analysis.txt', output, 'utf8');
    console.log('Analysis written to cleanup_analysis.txt');
    console.log(`Found ${emptyClasses.length} empty classes and ${actualDuplicates.length} duplicate groups.`);
}

analyzeCleanup();


import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Student {
    id: string;
    name: string;
    guardian_name: string; // db field is guardian_name based on analyze_schema, wait, need to re-verify schema output
    // Schema output said: name, parent_name, parent_phone. My plan said parent_name.
    // Let me check db_schema_details.txt content again from previous turn...
    // Line 11: parent_name, Line 12: parent_phone.
    // Line 9: name.
    // So fields are: name, parent_name, parent_phone.
    parent_name: string | null;
    parent_phone: string | null;
    created_at: string;
}

async function mergeDuplicates() {
    console.log('Fetching all students...');
    const { data: students, error } = await supabase
        .from('students')
        .select('id, name, parent_name, parent_phone, created_at')
        .order('created_at', { ascending: true }) as unknown as { data: Student[], error: any };

    if (error || !students) {
        console.error('Error fetching students:', error);
        return;
    }

    console.log(`Total students found: ${students.length}`);

    // Group by Key
    const groups: { [key: string]: Student[] } = {};

    students.forEach(s => {
        // Normalize phone: remove hyphens, spaces
        const pName = s.parent_name?.trim() || '';
        const pPhone = s.parent_phone?.replace(/[^0-9]/g, '') || '';
        const sName = s.name.trim();

        if (sName === '강인규') {
            const key = `${sName}|${pName}|${pPhone}`;
            console.log(`Debug '강인규': Key=[${key}]`);
            console.log(`  Raw: Parent=[${s.parent_name}], Phone=[${s.parent_phone}]`);
            console.log(`  Norm: Parent=[${pName}], Phone=[${pPhone}]`);
        }

        if (!sName || !pName || !pPhone) return; // Skip incomplete records for safety

        const key = `${sName}|${pName}|${pPhone}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
    });

    let groupsProcessed = 0;
    let recordsMerged = 0;

    for (const key in groups) {
        const group = groups[key];
        // Debug potential duplicates
        if (group.length > 1) {
            console.log(`Debug Group Found: ${key} (Count: ${group.length})`);
        }
        if (group.length > 1) {
            console.log(`\nFound duplicate group (${group.length}): ${key}`);

            // Master is the first one (oldest created_at because we sorted query)
            const master = group[0];
            const duplicates = group.slice(1);
            const duplicateIds = duplicates.map(d => d.id);

            console.log(`Master: ${master.id} (${master.created_at})`);
            console.log(`Duplicates to merge: ${duplicateIds.join(', ')}`);

            // 1. Migrate Enrollments
            const { error: enrollError } = await supabase
                .from('enrollments')
                .update({ student_id: master.id })
                .in('student_id', duplicateIds);

            if (enrollError) {
                console.error(`Error migrating enrollments for ${key}:`, enrollError);
                continue;
            }
            console.log(`Migrated enrollments.`);

            // 2. Migrate Attendance
            const { error: attendError } = await supabase
                .from('attendance')
                .update({ student_id: master.id })
                .in('student_id', duplicateIds);

            if (attendError) {
                console.error(`Error migrating attendance for ${key}:`, attendError);
                continue;
            }
            console.log(`Migrated attendance.`);

            // 3. Delete Duplicates
            const { error: delError } = await supabase
                .from('students')
                .delete()
                .in('id', duplicateIds);

            if (delError) {
                console.error(`Error deleting duplicates for ${key}:`, delError);
            } else {
                console.log(`Deleted ${duplicateIds.length} duplicate records.`);
                recordsMerged += duplicateIds.length;
            }

            groupsProcessed++;
        }
    }

    console.log(`\n--- Summary ---`);
    console.log(`Duplicate Groups Processed: ${groupsProcessed}`);
    console.log(`Total Records Merged/Deleted: ${recordsMerged}`);
}

mergeDuplicates();

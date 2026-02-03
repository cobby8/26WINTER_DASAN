import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function cleanupClasses() {
    console.log('=== Starting Cleanup Process ===\n');

    // Step 1: Fetch all 2nd session classes
    const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('id, name, branch, session, day_of_week, start_time, end_time, capacity')
        .or('session.eq.2차,name.ilike.%2차%')
        .is('deleted_at', null)
        .order('name')
        .order('day_of_week')
        .order('start_time');

    if (classError) {
        console.error('Error fetching classes:', classError);
        return;
    }

    // Step 2: Fetch enrollments
    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('class_id, student_id')
        .eq('status', 'active');

    const enrollmentMap: { [key: string]: string[] } = {};
    if (enrollments) {
        enrollments.forEach(e => {
            if (!enrollmentMap[e.class_id]) enrollmentMap[e.class_id] = [];
            enrollmentMap[e.class_id].push(e.student_id);
        });
    }

    // Step 3: Identify empty classes
    const emptyClasses = classes.filter(c => !enrollmentMap[c.id]);
    console.log(`Found ${emptyClasses.length} empty classes (will be deleted)\n`);

    // Step 4: Identify duplicates
    const duplicateGroups: { [key: string]: any[] } = {};
    classes.forEach(c => {
        const key = `${c.name}|${c.day_of_week}|${c.start_time}`;
        if (!duplicateGroups[key]) duplicateGroups[key] = [];
        duplicateGroups[key].push(c);
    });

    const actualDuplicates = Object.entries(duplicateGroups).filter(([_, group]) => group.length > 1);
    console.log(`Found ${actualDuplicates.length} duplicate groups\n`);

    // Step 5: For each duplicate group, keep the one with most enrollments
    let consolidatedCount = 0;
    const classesToDelete: string[] = [];
    const enrollmentUpdates: { oldClassId: string; newClassId: string; studentIds: string[] }[] = [];

    for (const [key, group] of actualDuplicates) {
        // Sort by enrollment count (descending)
        group.sort((a, b) => (enrollmentMap[b.id]?.length || 0) - (enrollmentMap[a.id]?.length || 0));

        const keeper = group[0];
        const duplicates = group.slice(1);

        console.log(`\nDuplicate: "${keeper.name}" (${keeper.day_of_week} ${keeper.start_time})`);
        console.log(`  Keeper: ${keeper.id} (${enrollmentMap[keeper.id]?.length || 0} enrollments)`);

        for (const dup of duplicates) {
            const dupEnrollments = enrollmentMap[dup.id];
            if (dupEnrollments && dupEnrollments.length > 0) {
                console.log(`  Moving ${dupEnrollments.length} enrollments from ${dup.id} to keeper`);
                enrollmentUpdates.push({
                    oldClassId: dup.id,
                    newClassId: keeper.id,
                    studentIds: dupEnrollments
                });
            }
            classesToDelete.push(dup.id);
            consolidatedCount++;
        }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Empty classes to delete: ${emptyClasses.length}`);
    console.log(`Duplicate classes to consolidate: ${consolidatedCount}`);
    console.log(`Enrollments to move: ${enrollmentUpdates.reduce((sum, u) => sum + u.studentIds.length, 0)}`);
    console.log(`Total classes to delete: ${emptyClasses.length + consolidatedCount}`);

    // Step 6: Execute cleanup
    console.log('\n=== Executing Cleanup ===\n');

    // 6a: Move enrollments from duplicates to keepers
    for (const update of enrollmentUpdates) {
        const { error } = await supabase
            .from('enrollments')
            .update({ class_id: update.newClassId })
            .eq('class_id', update.oldClassId)
            .in('student_id', update.studentIds);

        if (error) {
            console.error(`Error moving enrollments from ${update.oldClassId}:`, error);
        } else {
            console.log(`✓ Moved ${update.studentIds.length} enrollments from ${update.oldClassId} to ${update.newClassId}`);
        }
    }

    // 6b: Delete empty classes
    if (emptyClasses.length > 0) {
        const emptyIds = emptyClasses.map(c => c.id);
        const { error } = await supabase
            .from('classes')
            .update({ deleted_at: new Date().toISOString() })
            .in('id', emptyIds);

        if (error) {
            console.error('Error deleting empty classes:', error);
        } else {
            console.log(`✓ Deleted ${emptyClasses.length} empty classes`);
        }
    }

    // 6c: Delete duplicate classes
    if (classesToDelete.length > 0) {
        const { error } = await supabase
            .from('classes')
            .update({ deleted_at: new Date().toISOString() })
            .in('id', classesToDelete);

        if (error) {
            console.error('Error deleting duplicate classes:', error);
        } else {
            console.log(`✓ Deleted ${classesToDelete.length} duplicate classes`);
        }
    }

    console.log('\n=== Cleanup Complete ===');
}

cleanupClasses();

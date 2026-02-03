import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkCurrentState() {
    console.log('=== Emergency Check: 2nd Session Classes ===\n');

    // Check ACTIVE classes
    const { data: activeClasses } = await supabase
        .from('classes')
        .select('id, name, session, day_of_week, start_time')
        .or('session.eq.2차,name.ilike.%2차%')
        .is('deleted_at', null);

    console.log(`Active 2nd session classes: ${activeClasses?.length || 0}`);

    if (activeClasses && activeClasses.length > 0) {
        console.log('\nSample active:');
        activeClasses.slice(0, 5).forEach(c => {
            console.log(`  [${c.id}] ${c.name}`);
        });
    }

    // Check DELETED classes (in last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentlyDeleted } = await supabase
        .from('classes')
        .select('id, name, session, day_of_week, start_time, deleted_at')
        .or('session.eq.2차,name.ilike.%2차%')
        .not('deleted_at', 'is', null)
        .gte('deleted_at', oneHourAgo);

    console.log(`\nRecently deleted (last hour): ${recentlyDeleted?.length || 0}`);

    if (recentlyDeleted && recentlyDeleted.length > 0) {
        console.log('\nRecently deleted classes:');
        recentlyDeleted.forEach(c => {
            console.log(`  [${c.id}] ${c.name} (deleted: ${c.deleted_at})`);
        });
    }

    // Check ALL deleted 2nd session classes
    const { data: allDeleted } = await supabase
        .from('classes')
        .select('id, name, deleted_at')
        .or('session.eq.2차,name.ilike.%2차%')
        .not('deleted_at', 'is', null);

    console.log(`\nTotal deleted 2nd session classes: ${allDeleted?.length || 0}`);

    // Check enrollments for recently deleted
    if (recentlyDeleted && recentlyDeleted.length > 0) {
        const deletedIds = recentlyDeleted.map(c => c.id);
        const { data: orphanedEnrollments } = await supabase
            .from('enrollments')
            .select('class_id, student_id')
            .in('class_id', deletedIds)
            .eq('status', 'active');

        console.log(`\nOrphaned enrollments from recently deleted: ${orphanedEnrollments?.length || 0}`);
    }

    console.log('\n=== Recommendation ===');
    if (recentlyDeleted && recentlyDeleted.length > 0) {
        console.log('⚠️  Recent deletions detected! Can restore these classes.');
    } else if (activeClasses && activeClasses.length === 0) {
        console.log('⚠️  No active 2nd session classes found. Need to restore from deleted.');
    } else {
        console.log('✅ Classes found.');
    }
}

checkCurrentState();

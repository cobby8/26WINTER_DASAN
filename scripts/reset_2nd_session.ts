
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function reset2ndSession() {
    console.log('--- Resetting 2nd Session Data ---');

    // 1. Identify Target Classes
    const { data: classes, error: fetchError } = await supabase
        .from('classes')
        .select('*')
        .or('session.eq.2차,name.ilike.%[2차%');

    if (fetchError) {
        console.error('Error fetching classes:', fetchError);
        return;
    }

    if (!classes || classes.length === 0) {
        console.log('No 2nd session classes found to reset.');
        return;
    }

    const classIds = classes.map(c => c.id);
    console.log(`Found ${classes.length} classes to delete.`);

    // 2. Identify Enrollments
    const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select('*')
        .in('class_id', classIds);

    if (enrollError) {
        console.error('Error fetching enrollments:', enrollError);
        return;
    }

    console.log(`Found ${enrollments?.length || 0} enrollments linked to these classes.`);

    // 3. Backup
    const backupData = {
        timestamp: new Date().toISOString(),
        classes,
        enrollments
    };
    const backupFile = `backup_2nd_session_${Date.now()}.json`;
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`Backup saved to ${backupFile}`);

    // 4. Delete Enrollments
    if (enrollments && enrollments.length > 0) {
        const { error: delEnrollError } = await supabase
            .from('enrollments')
            .delete()
            .in('id', enrollments.map(e => e.id));

        if (delEnrollError) {
            console.error('Error deleting enrollments:', delEnrollError);
            return;
        }
        console.log('Deleted enrollments.');
    }

    // 5. Delete Classes
    const { error: delClassError } = await supabase
        .from('classes')
        .delete()
        .in('id', classIds);

    if (delClassError) {
        console.error('Error deleting classes:', delClassError);
        return;
    }
    console.log('Deleted classes.');
    console.log('Reset complete.');
}

reset2ndSession();

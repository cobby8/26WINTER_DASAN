
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Quiet Env Loader
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
envConfig.split('\n').forEach(line => {
    const [key, val] = line.split('=');
    if (key && val) process.env[key.trim()] = val.trim();
});

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function moveStudents() {
    console.log('--- START ---');

    // Fetch ALL candidates
    const { data: candidates } = await supabase
        .from('classes')
        .select('id, name, branch, session')
        .ilike('name', '%금요일%')
        .ilike('name', '%11:00%');

    if (!candidates) {
        console.log('No candidates found.');
        return;
    }

    console.log(`Candidates Found: ${candidates.length}`);

    // Filter in memory
    const sourceCandidates = candidates.filter(c =>
        (c.branch === '1호점' || c.name.includes('1호점')) &&
        c.name.includes('2교시') &&
        c.name.includes('초등저') &&
        (c.session === '1차')
    );

    const targetCandidates = candidates.filter(c =>
        (c.branch === '2호점' || c.name.includes('2호점')) &&
        c.name.includes('2교시') &&
        c.name.includes('초등저') &&
        (c.session === '1차')
    );

    if (sourceCandidates.length !== 1) {
        console.log(`Error: Source Candidates != 1 (${sourceCandidates.length})`);
        sourceCandidates.forEach(c => console.log(`[S] ${c.name} (${c.id})`));
        return;
    }
    if (targetCandidates.length !== 1) {
        console.log(`Error: Target Candidates != 1 (${targetCandidates.length})`);
        targetCandidates.forEach(c => console.log(`[T] ${c.name} (${c.id})`));
        return;
    }

    const sourceClass = sourceCandidates[0];
    const targetClass = targetCandidates[0];

    console.log(`Source: ${sourceClass.name} [${sourceClass.id}]`);
    console.log(`Target: ${targetClass.name} [${targetClass.id}]`);

    // Students
    const studentNames = ['박준수', '박준서'];
    const { data: students } = await supabase
        .from('students')
        .select('id, name')
        .in('name', studentNames);

    if (!students || students.length !== 2) {
        console.log(`Filtered ${students?.length} students.`);
        // Continue if at least 1? No, assume 2.
    }
    const studentIds = students!.map(s => s.id);

    // Update
    const { data: updated, error } = await supabase
        .from('enrollments')
        .update({ class_id: targetClass.id })
        .in('student_id', studentIds)
        .eq('class_id', sourceClass.id)
        .select();

    if (error) console.log('Update Error:', error);
    else console.log(`Updated ${updated.length} enrollments.`);
}

moveStudents();

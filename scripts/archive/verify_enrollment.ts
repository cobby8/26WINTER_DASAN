
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
envConfig.split('\n').forEach(line => {
    const [key, val] = line.split('=');
    if (key && val) process.env[key.trim()] = val.trim();
});

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function verify() {
    console.log('--- VERIFY ---');
    const studentNames = ['박준수', '박준서'];
    const { data: students } = await supabase.from('students').select('id, name').in('name', studentNames);
    const ids = students!.map(s => s.id);

    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id, classes(name)')
        .in('student_id', ids);

    enrollments!.forEach(e => {
        // @ts-ignore
        const sName = students.find(s => s.id === e.student_id).name;
        // @ts-ignore
        const cName = e.classes.name;
        if (cName.includes('금요일')) {
            console.log(`${sName}: ${cName.substring(0, 30)}...`);
        }
    });
}
verify();

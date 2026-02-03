
import { supabaseAdmin } from '../src/lib/supabase';

async function checkStudents() {
    const names = ['김수아', '김선우', '이도경', '박준서'];
    console.log(`Checking students: ${names.join(', ')}`);

    for (const name of names) {
        const { data, error } = await supabaseAdmin
            .from('students')
            .select('id, name, student_phone, parent_phone, deleted_at')
            .eq('name', name);

        if (data) {
            console.log(`\n--- ${name} ---`);
            console.log(`Found ${data.length} records.`);
            data.forEach(s => console.log(JSON.stringify(s)));
        }
    }
}

checkStudents();

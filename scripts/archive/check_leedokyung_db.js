
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLeedokyung() {
    console.log('--- Checking student Leedokyung (이도경) ---');

    const { data: students } = await supabase
        .from('students')
        .select('*')
        .eq('name', '이도경');

    console.log('Students:', students);

    if (students && students.length > 0) {
        for (const s of students) {
            console.log(`\nShuttle Schedules for Student ID: ${s.id}`);
            const { data: schedules } = await supabase
                .from('shuttle_schedules')
                .select('*')
                .eq('student_id', s.id);
            console.table(schedules);

            console.log(`\nShuttle Ops Logs for Student ID: ${s.id} (2026-01-05)`);
            const { data: logs } = await supabase
                .from('shuttle_ops_logs')
                .select('*')
                .eq('student_id', s.id)
                .eq('date', '2026-01-05');
            console.table(logs);
        }
    }
}

checkLeedokyung();

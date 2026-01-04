
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLeedokyung() {
    try {
        const { data: students } = await supabase
            .from('students')
            .select('*')
            .eq('name', '이도경');

        console.log('STUDENTS: ' + JSON.stringify(students, null, 2));

        if (students && students.length > 0) {
            for (const s of students) {
                const { data: schedules } = await supabase
                    .from('shuttle_schedules')
                    .select('*')
                    .eq('student_id', s.id);
                console.log(`SCHEDULES FOR ${s.name} (${s.id}):\n`, JSON.stringify(schedules, null, 2));

                const { data: logs } = await supabase
                    .from('shuttle_ops_logs')
                    .select('*')
                    .eq('student_id', s.id)
                    .eq('date', '2026-01-05');
                console.log(`LOGS FOR ${s.name} (${s.id}) on 2026-01-05:\n`, JSON.stringify(logs, null, 2));
            }
        }
    } catch (err) {
        console.error(err);
    }
}

checkLeedokyung();

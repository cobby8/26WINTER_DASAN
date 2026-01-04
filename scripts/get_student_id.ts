
import { supabaseAdmin } from '../src/lib/supabase';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function getStudentId() {
    const { data } = await supabaseAdmin.from('students').select('id').limit(1).single();
    if (data) {
        console.log(`STUDENT_ID:${data.id}`);
    } else {
        console.log('NO_STUDENTS_FOUND');
    }
}

getStudentId();

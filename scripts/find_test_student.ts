
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function findStudent() {
    const { data: students, error } = await supabase
        .from('students')
        .select('name, parent_phone')
        .limit(5);

    if (error) {
        console.error('Error fetching students:', error);
        return;
    }

    console.log('Sample Students for Test Login:');
    students.forEach(s => {
        const last4 = s.parent_phone?.replace(/[^0-9]/g, '').slice(-4);
        console.log(`Name: ${s.name}, Last 4 digits: ${last4}`);
    });
}

findStudent();

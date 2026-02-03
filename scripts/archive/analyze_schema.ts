
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

import fs from 'fs';

async function inspect() {
    const lines = [];

    // Check Students
    const { data: student } = await supabase.from('students').select('*').limit(1).single();
    if (student) {
        lines.push('--- STUDENT KEYS START ---');
        lines.push(...Object.keys(student).sort());
        lines.push('--- STUDENT KEYS END ---');
    } else {
        lines.push('No students found.');
    }

    // Check Classes
    const { data: classes } = await supabase.from('classes').select('name').limit(3);
    lines.push('--- CLASS NAMES START ---');
    classes?.forEach(c => lines.push(c.name));
    lines.push('--- CLASS NAMES END ---');

    fs.writeFileSync('db_schema_details.txt', lines.join('\n'));
    console.log('Written to db_schema_details.txt');
}

inspect();

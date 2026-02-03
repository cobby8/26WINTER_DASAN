
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    const lines = [];

    // 1. Check Student '강인규'
    const { data: students } = await supabase
        .from('students')
        .select('*')
        .eq('name', '강인규');

    lines.push(`\n--- Verify Student '강인규' ---`);
    if (students) {
        lines.push(`Total Count (incl. deleted): ${students.length}`);
        const active = students.filter(s => !s.deleted_at);
        lines.push(`Active Count: ${active.length}`);

        students.forEach(s => {
            lines.push(`ID: ${s.id}, Name: ${s.name}, Deleted: ${s.deleted_at}`);
        });
    }

    // 2. Check Class Names
    const { data: classes } = await supabase
        .from('classes')
        .select('name')
        .limit(5);

    lines.push(`\n--- Verify Class Names (Sample) ---`);
    classes?.forEach(c => lines.push(c.name));

    fs.writeFileSync('verify_output.txt', lines.join('\n'));
    console.log('Output written to verify_output.txt');
}

verify();

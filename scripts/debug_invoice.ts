
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createInvoice } from '@/app/actions/payment-actions';
import { supabaseAdmin } from '@/lib/supabase';

async function main() {
    console.log("Fetching a student...");
    const { data: students, error } = await supabaseAdmin
        .from('students')
        .select('id, name')
        .limit(1);

    if (error || !students || students.length === 0) {
        console.error("Failed to fetch student:", error);
        return;
    }

    const student = students[0];
    console.log(`Testing invoice creation for: ${student.name} (${student.id})`);

    try {
        const result = await createInvoice(student.id);
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Crash:", e);
    }
}

main();

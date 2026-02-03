
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { calculateTuition } from '@/lib/billing';
import { supabaseAdmin } from '@/lib/supabase';

async function main() {
    console.log("Fetching a sample student...");
    // Fetch a student who has enrollments
    const { data: students, error } = await supabaseAdmin
        .from('students')
        .select('id, name, shuttle_route')
        .limit(5);

    if (error || !students) {
        console.error("Fetch Error:", error);
        return;
    }

    for (const student of students) {
        console.log(`\nTesting for student: ${student.name} (${student.id})`);

        try {
            // Infer shuttle boolean
            const isShuttle = !!student.shuttle_route;
            const result = await calculateTuition(student.id, 'new', isShuttle);
            console.log("Calculation Result:", JSON.stringify(result, null, 2));
        } catch (e: any) {
            console.error(`Calculation Failed for ${student.name}:`, e.message);
            console.error(e.stack);
        }
    }
}

main();

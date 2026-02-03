
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verifyShuttle() {
    console.log('--- Verifying Shuttle Data ---');

    // 1. Total Count
    const { count, error: countError } = await supabase
        .from('shuttle_schedules')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('Count Error:', countError.message);
        return;
    }
    console.log(`Total Schedules: ${count}`);

    // 2. Sample Data
    const { data: samples, error: sampleError } = await supabase
        .from('shuttle_schedules')
        .select('*')
        .limit(5)
        .order('created_at', { ascending: false });

    if (sampleError) {
        console.error('Sample Error:', sampleError.message);
        return;
    }

    console.log('\nSample Schedules (Top 5 Recent):');
    samples.forEach(s => {
        console.log(`ID: ${s.id}, Student: ${s.student_id}, Day: ${s.day_of_week}, Time: ${s.time}, Type: ${s.type}, Deleted: ${s.deleted_at}`);
    });

    if (samples.length === 0) {
        console.log('No schedules found.');
        return;
    }

    // 3. Check Student Linkage
    const sampleStudentId = samples[0].student_id;
    if (sampleStudentId) {
        console.log(`\nChecking Enrolments for Student ${sampleStudentId}...`);

        // Fetch ALL enrollments
        const { data: enrollments, error: enrollError } = await supabase
            .from('enrollments')
            .select(`
                id,
                status,
                classes ( name, session, start_date, end_date )
            `)
            .eq('student_id', sampleStudentId);

        if (enrollError) console.error('Enrollment Error:', enrollError.message);
        else {
            console.log('Enrollments found:', enrollments.length);
            enrollments.forEach(e => {
                // @ts-ignore
                const session = e.classes?.session;
                // @ts-ignore
                const name = e.classes?.name;
                // @ts-ignore
                const dates = `${e.classes?.start_date}~${e.classes?.end_date}`;
                console.log(` - Class: ${name} (${session}), Status: ${e.status}, Dates: ${dates}`);

                if (session === '2차' || (name && name.includes('2차'))) {
                    console.log('   -> VALID 2ND SESSION FOUND.');
                }
            });
        }
    }
}

verifyShuttle();

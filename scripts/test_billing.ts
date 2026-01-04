
import dotenv from 'dotenv';
import path from 'path';

// 1. Load env explicitly BEFORE importing modules that use it
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function listClasses(supabaseAdmin: any) {
    const { data } = await supabaseAdmin.from('classes').select('id, name, session').limit(5);
    console.log('Available Classes:', data);
    return data || [];
}

async function testBilling() {
    console.log('🧪 Testing Billing Logic...');

    // Dynamic import to ensure env is ready
    const { calculateTuition } = await import('../src/lib/billing');
    const { supabaseAdmin } = await import('../src/lib/supabase');

    // 1. Setup Dummy Student & Enrollment
    const { data: student, error: sErr } = await supabaseAdmin
        .from('students')
        .insert({ name: 'BILLING_TEST_USER', shuttle_route: 'TEST_ROUTE' }) // Has shuttle
        .select()
        .single();

    if (!student) {
        console.error('Failed to create student', sErr);
        return;
    }
    console.log(`User created: ${student.id}`);

    // Enroll in 2 classes (trigger 2x frequency)
    const classes = await listClasses(supabaseAdmin);
    let finalClasses = classes;

    if (classes.length === 0) {
        // Create dummy classes if none
        await supabaseAdmin.from('classes').insert({ name: 'TEST_C1', session: '1차', day_of_week: 'Mon', start_time: '10:00', end_time: '11:00', branch: 'test' });
        await supabaseAdmin.from('classes').insert({ name: 'TEST_C2', session: '1차', day_of_week: 'Wed', start_time: '10:00', end_time: '11:00', branch: 'test' });
        finalClasses = (await supabaseAdmin.from('classes').select('id, session').limit(2)).data!;
    }

    // Use the first 2 available classes
    if (finalClasses.length < 2) {
        console.warn("Not enough classes to test 2x freq");
    }

    await supabaseAdmin.from('enrollments').insert([
        { student_id: student.id, class_id: finalClasses[0].id, status: 'active' },
        { student_id: student.id, class_id: finalClasses[1].id, status: 'active' }
    ]);

    // 2. Run Calculation
    try {
        const breakdown = await calculateTuition(student.id, 'new', true);
        console.log('💰 Calculation Result:', breakdown);

        // Expected: 2x Frequency
        // Shuttle Fee: Base 10000 * 1 (session 1 only? dependent on class sessions)

    } catch (e) {
        console.error('Error during calc:', e);
    }

    // 3. Cleanup
    await supabaseAdmin.from('enrollments').delete().eq('student_id', student.id);
    await supabaseAdmin.from('students').delete().eq('id', student.id);
}

testBilling();

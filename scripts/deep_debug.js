
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("--- DEBUGGING CLASSES ---");
    const { count: totalClasses } = await supabase.from('classes').select('*', { count: 'exact', head: true });
    const { count: activeClasses } = await supabase.from('classes').select('*', { count: 'exact', head: true }).is('deleted_at', null);
    console.log(`Total Classes (All): ${totalClasses}`);
    console.log(`Active Classes (deleted_at is null): ${activeClasses}`);

    console.log("\n--- DEBUGGING PAYMENTS (Jan 2026) ---");
    const startOfMonth = '2026-01-01T00:00:00.000Z';
    const { data: payments } = await supabase.from('payments')
        .select('id, student_id, amount, status, created_at')
        .gte('created_at', startOfMonth);

    console.log(`Total Payments since Jan 1: ${payments.length}`);

    const studentMap = {};
    let totalAmount = 0;

    payments.forEach(p => {
        studentMap[p.student_id] = (studentMap[p.student_id] || 0) + 1;
        if (p.status === 'paid') totalAmount += (p.amount || 0);
    });

    console.log(`Total Paid Amount: ${totalAmount.toLocaleString()}`);

    // Check duplicates
    const multiplePayments = Object.entries(studentMap).filter(([id, count]) => count > 1);
    console.log(`Students with >1 payment record in Jan: ${multiplePayments.length}`);
    if (multiplePayments.length > 0) {
        console.log("Sample Duplicate Student:", multiplePayments[0]);
        // Fetch details for this student
        const { data: dupes } = await supabase.from('payments').select('*').eq('student_id', multiplePayments[0][0]);
        console.log("Duplicate Details:", JSON.stringify(dupes, null, 2));
    }
}

run();

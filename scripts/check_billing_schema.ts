
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env explicitly
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkBillingSchema() {
    console.log('🔍 Checking Billing Schema...');

    const { data: tables, error: tableError } = await supabaseAdmin.rpc('get_table_columns', { table_names: ['tuition_rules', 'payments'] });

    // If we can't inspect using rpc (likely not there), we try selecting from them.

    // 1. Check tuition_rules
    const { error: ruleError } = await supabaseAdmin.from('tuition_rules').select('*').limit(1);
    console.log(`tuition_rules exists: ${!ruleError}`);
    if (ruleError) console.log(ruleError.message);

    // 2. Check payments columns
    const { data: paymentCols, error: payError } = await supabaseAdmin.from('payments').select('id, tuition_fee, shuttle_fee, sibling_discount, calculation_log').limit(1);

    if (payError) {
        console.log(`⚠️ payments table check: ${payError.message}`);
    } else {
        console.log(`✅ payments table exists.`);
    }
}

checkBillingSchema();

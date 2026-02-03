
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testLookup() {
    console.log('--- Testing Class Lookup ---');

    // Target: [2차/1호점] 겨울방학특강 월요일 10:30
    // DB Params from check_classes: day_of_week='월요일', session='2차', start_time='10:30:00'

    // Test 1: Exact match with :00
    const { data: d1, error: e1 } = await supabase
        .from('classes')
        .select('*')
        .eq('session', '2차')
        .eq('day_of_week', '월요일')
        .eq('start_time', '10:30:00');

    console.log('Test 1 (Exact 10:30:00):', d1?.length, e1?.message);

    // Test 2: Text match with 10:30 (might fail if time type)
    const { data: d2, error: e2 } = await supabase
        .from('classes')
        .select('*')
        .eq('session', '2차')
        .eq('day_of_week', '월요일')
        .eq('start_time', '10:30');

    console.log('Test 2 (Exact 10:30):', d2?.length, e2?.message);

    // Test 3: ILIKE with wildcards (casting?)
    const { data: d3, error: e3 } = await supabase
        .from('classes')
        .select('*')
        .eq('session', '2차')
        .eq('day_of_week', '월요일')
        .ilike('start_time', '10:30%');

    console.log('Test 3 (ILIKE 10:30%):', d3?.length, e3?.message);
}

testLookup();


import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { supabaseAdmin } from '../src/lib/supabase';
import { GoogleSheetService } from '../src/lib/googleSheet';

async function diagnose() {
    console.log('--- Connectivity Diagnosis ---');

    // 1. Check Env Vars
    console.log('Checking Environment Variables...');
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const gEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

    console.log(`Supabase URL: ${sbUrl ? 'FOUND' : 'MISSING'}`);
    console.log(`Supabase Key: ${sbKey ? 'FOUND' : 'MISSING'}`);
    console.log(`Google Email: ${gEmail ? 'FOUND' : 'MISSING'}`);

    if (!sbUrl || !sbKey) {
        console.error('CRITICAL: Supabase credentials missing.');
    }

    // 2. Test Supabase
    console.log('\nTesting Supabase Connection...');
    try {
        const { data, error } = await supabaseAdmin.from('classes').select('count', { count: 'exact', head: true });
        if (error) throw error;
        console.log(`Supabase OK. Class Count: ${data}`); // data is null for head:true usually or count
        // Actually count is in 'count' property
    } catch (e: any) {
        console.error(`Supabase FAILED: ${e.message}`);
        if (e.cause) console.error('Cause:', e.cause);
    }

    // 3. Test Google Sheets
    console.log('\nTesting Google Sheets Connection...');
    try {
        const service = new GoogleSheetService();
        const rows = await service.fetchRawData('2차차량운행');
        console.log(`Google Sheets OK. Row Copunt: ${rows.length}`);
    } catch (e: any) {
        console.error(`Google Sheets FAILED: ${e.message}`);
    }
}

diagnose();

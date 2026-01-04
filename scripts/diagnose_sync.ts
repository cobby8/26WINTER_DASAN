import dotenv from 'dotenv';
import path from 'path';

// Load env before everything
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { SyncService } from '../src/lib/syncService';
import { GoogleSheetService } from '../src/lib/googleSheet';
import { supabaseAdmin } from '../src/lib/supabase';

async function diagnose() {
    console.log('🔍 Starting Sync Diagnosis...');

    // Check Env
    console.log('--- Environment Check ---');
    console.log('GOOGLE_SHEET_ID:', process.env.GOOGLE_SHEET_ID ? 'Set' : 'MISSING');
    console.log('GOOGLE_SERVICE_ACCOUNT_EMAIL:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? 'Set' : 'MISSING');
    console.log('GOOGLE_PRIVATE_KEY:', process.env.GOOGLE_PRIVATE_KEY ? 'Set' : 'MISSING');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'MISSING');

    const service = new SyncService();
    try {
        console.log('--- Fetching Data ---');
        // @ts-ignore - access private for diagnosis
        const rawRows = await service.sheetService.fetchRawData();
        console.log(`Fetched ${rawRows.length} rows.`);

        console.log('--- Parsing Data ---');
        // @ts-ignore
        const parsedData = rawRows.map(row => service.sheetService.parseRow(row));
        console.log(`Parsed ${parsedData.length} records.`);

        console.log('--- Executing Sync ---');
        const result = await service.syncData();
        console.log('✅ Sync Result:', JSON.stringify(result, null, 2));

    } catch (error: any) {
        console.error('❌ DIAGNOSIS FAILED!');
        console.error('Error Name:', error.name);
        console.error('Error Message:', error.message);
        console.error('Error Stack:', error.stack);

        if (error.response) {
            console.error('API Response Data:', error.response.data);
        }
    }
}

diagnose();


import { SyncService } from '../src/lib/syncService';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function emergencyDiagnose() {
    console.log('🚨 EMERGENCY SYNC DIAGNOSIS START');

    try {
        const service = new SyncService();
        console.log('--- Step 1: Fetching Raw Data from Sheet ---');
        // @ts-ignore
        const rawRows = await service.sheetService.fetchRawData();
        console.log(`✅ Successfully fetched ${rawRows.length} rows.`);

        console.log('--- Step 2: Running syncData() and capturing errors ---');
        const result = await service.syncData();

        console.log('--- Step 3: Result Analysis ---');
        console.log(`Processed Count: ${result.processedCount}`);
        if (result.errors.length > 0) {
            console.log('❌ Found Errors during sync:');
            result.errors.forEach((err, i) => console.log(`  [${i}] ${err}`));
        } else {
            console.log('✅ syncData() returned with 0 errors.');
        }

    } catch (error: any) {
        console.error('🔥 CRITICAL ERROR DURING DIAGNOSIS:');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        if (error.details) console.error('Details:', error.details);
        if (error.hint) console.error('Hint:', error.hint);
    }
}

emergencyDiagnose();


const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

async function diagnose() {
    console.log('🔍 Starting Emergency Sync Diagnosis...');

    try {
        const { SyncService } = require('../src/lib/syncService');
        const service = new SyncService();

        console.log('--- Fetching Data ---');
        // @ts-ignore
        const rawRows = await service.sheetService.fetchRawData();
        console.log(`Fetched ${rawRows.length} rows.`);

        if (rawRows.length > 0) {
            console.log('Sample Row 1 Keys:', Object.keys(rawRows[0]));
        }

        console.log('--- Executing Full Sync ---');
        const result = await service.syncData();
        console.log('✅ Sync Result:', JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('❌ DIAGNOSIS FAILED!');
        console.error('Error Message:', error.message);
        console.error('Error Stack:', error.stack);
    }
}

diagnose();

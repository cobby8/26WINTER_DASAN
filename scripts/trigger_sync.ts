import dotenv from 'dotenv';
import path from 'path';

// Load env explicitly before other imports
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Now import SyncService
import { SyncService } from '../src/lib/syncService';

async function runSync() {
    console.log('🔄 Starting Manual Sync...');
    const service = new SyncService();
    try {
        const result = await service.syncData();
        console.log('✅ Sync Complete!');
        console.log(`Processed: ${result.processedCount}`);
        if (result.errors.length > 0) {
            console.log('⚠️ Errors:', result.errors);
        }
    } catch (error) {
        console.error('❌ Sync Failed:', error);
    }
}

runSync();

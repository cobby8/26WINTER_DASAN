
import { SyncService } from '../src/lib/syncService';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function runSync() {
    console.log('--- Triggering Sync via Script ---');
    try {
        const service = new SyncService();
        const result = await service.syncData();
        console.log('Sync Result:', JSON.stringify(result, null, 2));
    } catch (e: unknown) {
        if (e instanceof Error) {
            console.error('Sync Error:', e.message);
            console.error(e.stack);
        } else {
            console.error('Sync Error:', String(e));
        }
    }
}

runSync();

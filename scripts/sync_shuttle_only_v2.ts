
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { SyncService } from '../src/lib/syncService';

async function runShuttleSyncOnly() {
    console.log('--- Triggering Shuttle One-Shot Sync ---');
    try {
        const service = new SyncService();
        // Skip Phase 0, 1, 2, 3 explicitly by only calling syncShuttleTransport
        // But syncShuttleTransport is part of syncData.
        // We can call it directly!

        console.log('Bypassing Class/Student Sync. Direct Shuttle Sync initiated.');
        const result = await service.syncShuttleTransport();

        console.log('Shuttle Sync Result:', JSON.stringify(result, null, 2));
    } catch (e: any) {
        console.error('Shuttle Sync Error:', e.message);
        console.error(e.stack);
    }
}

runShuttleSyncOnly();

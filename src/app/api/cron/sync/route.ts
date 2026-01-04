
import { NextResponse } from 'next/server';
import { SyncService } from '@/lib/syncService';

export const dynamic = 'force-dynamic'; // Ensure it's not cached

export async function GET(request: Request) {
    try {
        console.log('[Background Sync] Starting sync process...');
        const syncService = new SyncService();
        const result = await syncService.syncData();
        console.log('[Background Sync] Completed:', result);

        return NextResponse.json({
            success: true,
            message: 'Sync completed successfully',
            result
        });
    } catch (error: any) {
        console.error('[Background Sync] Error:', error);
        return NextResponse.json({
            success: false,
            message: error.message
        }, { status: 500 });
    }
}

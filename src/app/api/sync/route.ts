import { NextResponse } from 'next/server';
import { SyncService } from '@/lib/syncService';

// Force rebuild

export async function POST() {
    try {
        const syncService = new SyncService();
        const result = await syncService.syncData();

        return NextResponse.json({
            success: true,
            message: `Synced ${result.processedCount} records.`,
            errors: result.errors
        });
    } catch (error: any) {
        console.error('Sync API Error:', error);
        return NextResponse.json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        }, { status: 500 });
    }
}

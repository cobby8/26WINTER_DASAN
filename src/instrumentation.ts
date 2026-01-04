
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        console.log('Winter App Server Starting...');

        // Basic interval for local development background sync (every 10 minutes)
        if (process.env.NODE_ENV === 'development') {
            const SYNC_INTERVAL = 10 * 60 * 1000; // 10 minutes

            setInterval(async () => {
                console.log('[Instrumentation] Triggering background sync...');
                try {
                    // Call the API route or service directly
                    // Importing service dynamically to avoid build-time issues if possible, 
                    // or just fetch the local API if server is up.
                    // Ideally, use the service directly here.
                    const { SyncService } = await import('@/lib/syncService');
                    const service = new SyncService();
                    const result = await service.syncData();
                    console.log('[Instrumentation] Background Sync Result:', result);
                } catch (err) {
                    console.error('[Instrumentation] Background Sync Failed:', err);
                }
            }, SYNC_INTERVAL);

            console.log(`[Instrumentation] Background sync scheduled every ${SYNC_INTERVAL / 1000}s`);
        }
    }
}

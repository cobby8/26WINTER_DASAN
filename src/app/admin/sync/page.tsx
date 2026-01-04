'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function SyncPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleSync = async () => {
        setLoading(true);
        setResult(null);
        try {
            const res = await fetch('/api/sync', { method: 'POST' });
            const data = await res.json();
            setResult(data);
        } catch (error) {
            setResult({ success: false, message: 'Request failed' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8">
            <Card className="max-w-md mx-auto">
                <CardHeader>
                    <CardTitle>Google Sheet Data Sync</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-gray-500">
                        Import data from the Google Sheet to Supabase.
                    </p>

                    <Button
                        onClick={handleSync}
                        disabled={loading}
                        className="w-full"
                    >
                        {loading ? 'Syncing...' : 'Start Sync'}
                    </Button>

                    {result && (
                        <div className={`p-4 rounded-md text-sm ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            <p className="font-bold">{result.message}</p>
                            {result.error && (
                                <p className="mt-1 text-xs opacity-80">영문 원인: {result.error}</p>
                            )}
                            {result.errors && result.errors.length > 0 && (
                                <ul className="list-disc list-inside mt-2">
                                    {result.errors.map((err: string, i: number) => (
                                        <li key={i}>{err}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';

export default function StudentLoginPage() {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Simple lookup by name and parent phone (last 4 digits matching)
            // Since phone formatting varies, we might need a robust check.
            // For now, let's assume exact match or contains.
            const { data, error: fetchError } = await supabase
                .from('students')
                .select('id, name, parent_phone')
                .eq('name', name.trim())
                .single();

            if (fetchError || !data) {
                throw new Error('Student not found. Please check the name.');
            }

            // Check phone - simplified for MVP (check if input matches end of stored phone)
            const storedPhone = data.parent_phone.replace(/[^0-9]/g, '');
            const inputPhone = phone.replace(/[^0-9]/g, '');

            if (!storedPhone.endsWith(inputPhone) || inputPhone.length < 4) {
                throw new Error('Phone number verification failed.');
            }

            // Success - Redirect to dashboard
            // We'll pass the ID in query param or set a cookie.
            // For simplicity/MVP, lets use a cookie-like approach or just direct link
            // A safer way is using a server action to set an HttpOnly cookie.
            // But for this "Academy Lookup" style, just redirecting to dynamic route is common.
            document.cookie = `studentId=${data.id}; path=/; max-age=3600`;
            router.push(`/portal/dashboard`);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-blue-600">Winter Class Portal</CardTitle>
                    <p className="text-sm text-gray-500">Student & Parent Login</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Student Name</Label>
                            <Input
                                id="name"
                                placeholder="홍길동"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Parent Phone (Last 4 Digits)</Label>
                            <Input
                                id="phone"
                                placeholder="1234"
                                maxLength={4}
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                            />
                        </div>
                        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Verifying...' : 'Check My Status'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="justify-center text-xs text-gray-400">
                    Protected by Winter Academy System
                </CardFooter>
            </Card>
        </div>
    );
}

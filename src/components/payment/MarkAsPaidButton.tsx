'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function MarkAsPaidButton({ paymentId }: { paymentId: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleMarkAsPaid = async () => {
        if (!confirm('Mark this invoice as PAID?')) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('payments')
                .update({
                    status: 'paid',
                    payment_date: new Date().toISOString().split('T')[0],
                    payment_method: 'Manual Confirm'
                })
                .eq('id', paymentId);

            if (error) throw error;

            router.refresh();
        } catch (e: any) {
            alert('Error: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button onClick={handleMarkAsPaid} disabled={loading}>
            {loading ? 'Updating...' : 'Mark as Paid'}
        </Button>
    );
}

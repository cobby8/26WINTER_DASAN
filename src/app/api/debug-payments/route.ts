
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    // Check distribution of statuses
    const { data: allPayments } = await supabaseAdmin.from('payments').select('*');

    // Check total records
    const totalCount = allPayments?.length || 0;

    // Group by status
    const statusCounts: Record<string, number> = {};
    const statusAmounts: Record<string, number> = {};

    allPayments?.forEach(p => {
        const s = p.status || 'undefined';
        statusCounts[s] = (statusCounts[s] || 0) + 1;
        statusAmounts[s] = (statusAmounts[s] || 0) + (p.amount || 0);
    });

    return NextResponse.json({
        totalCount,
        statusCounts,
        statusAmounts, // Check this!
        firstPending: allPayments?.find(p => p.status === 'pending')
    });
}

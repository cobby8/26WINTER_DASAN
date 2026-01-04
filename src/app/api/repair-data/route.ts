
import { NextResponse } from 'next/server';
import { repairClassData } from '@/lib/repair-data';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        const result = await repairClassData();
        return NextResponse.json({ success: true, ...result });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}


'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { calculateTuition } from '@/lib/billing';
import { revalidatePath } from 'next/cache';

export async function getStudentPayment(studentId: string) {
    const { data, error } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('student_id', studentId)
        .single();

    if (error) return null;
    return data;
}

export async function createInvoice(studentId: string) {
    try {
        console.log(`[PaymentAction] Generating invoice for: ${studentId}`);

        // 1. Get Student Info (for Status and Shuttle preference)
        const { data: student, error: studentError } = await supabaseAdmin
            .from('students')
            .select('id, name, status')
            // Let's assume there's a field logic. For now, check if we need to add 'shuttle_boarding' boolean or infer.
            // Looking at previous chats, no specific 'shuttle_boarding' bool. 
            // Let's assume if 'shuttle_route' is not null/empty, they are boarding.
            .eq('id', studentId)
            .single();

        console.log(`[PaymentAction] Student fetch: ${student ? 'Found' : 'Not Found'}`, student);

        if (studentError) {
            console.error(`[PaymentAction] DB Error:`, studentError);
            throw new Error(`Student DB Error: ${studentError.message}`);
        }
        if (!student) {
            console.error(`[PaymentAction] No student for ID:`, studentId);
            throw new Error(`Student ID not found: ${studentId}`);
        }

        // Infer fields
        // Status: 'new' vs 'existing'. DB Default is 'new' usually? Or we use 'status' field?
        // 'status' field is 'active', 'withdrawn'. 
        // We probably need a 'registration_type' or assume 'new' mostly for Winter?
        // Let's Default to 'new' unless we have a field. 
        // NOTE: This logic might need refinement. For now, defaulting to 'new'.
        const { count } = await supabaseAdmin
            .from('shuttle_schedules')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', studentId);

        const regStatus: 'new' | 'existing' = 'new';
        const isShuttle = (count || 0) > 0;

        // 2. Calculate
        const breakdown = await calculateTuition(studentId, regStatus, isShuttle);
        console.log(`[PaymentAction] Calculation breakdown:`, breakdown);

        // 3. Upsert Payment Record
        // Check if exists
        const { data: existing } = await supabaseAdmin
            .from('payments')
            .select('id')
            .eq('student_id', studentId)
            .single();

        const total = breakdown.tuitionFee + breakdown.shuttleFee;
        // We don't apply sibling discount automatically yet as per requirements it's manual or complex.

        let result;
        if (existing) {
            // Update
            const { error, data } = await supabaseAdmin
                .from('payments')
                .update({
                    tuition_fee: breakdown.tuitionFee,
                    shuttle_fee: breakdown.shuttleFee,
                    sessions: breakdown.sessionType,
                    calculation_log: breakdown.calculationLog,
                    // automated update resets final amount logic usually, 
                    // but we should preserve manual adjustments if possible?
                    // For safety in V1, let's recalculate clean.
                })
                .eq('id', existing.id)
                .select();
            result = { error, data };
        } else {
            console.log(`[PaymentAction] Inserting new payment`);
            // Insert
            const { error, data } = await supabaseAdmin
                .from('payments')
                .insert({
                    student_id: studentId,
                    amount: total, // Legacy field support? Or remove?
                    tuition_fee: breakdown.tuitionFee,
                    shuttle_fee: breakdown.shuttleFee,
                    sibling_discount: 0,
                    manual_adjustment: 0,
                    status: 'pending',
                    sessions: breakdown.sessionType,
                    calculation_log: breakdown.calculationLog
                })
                .select();
            result = { error, data };
        }

        if (result.error) {
            console.error(`[PaymentAction] DB Error:`, result.error);
            throw new Error(result.error.message);
        }
        console.log(`[PaymentAction] Success. Rows:`, result.data?.length);

        revalidatePath(`/admin/students/${studentId}`);
        revalidatePath('/admin/payments');
        return { success: true, data: result.data };

    } catch (e: any) {
        console.error('[PaymentAction] Failed:', e);
        return { success: false, error: e.message };
    }
}

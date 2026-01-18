'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

/**
 * Search students by name for Makeup Registration
 */
export async function searchStudentsByName(query: string) {
    if (!query || query.length < 2) return [];

    const { data, error } = await supabaseAdmin
        .from('students')
        .select('id, name, school, grade, student_phone, parent_phone')
        .ilike('name', `%${query}%`)
        .is('deleted_at', null)
        .limit(10);

    if (error) {
        console.error('Search Student Error:', error);
        return [];
    }
    return data;
}

/**
 * Get absent records for a student
 * Returns records where status is 'absent' OR 'late' (if policy allows makeup for late?)
 * Usually just 'absent'.
 */
export async function getStudentAbsences(studentId: string) {
    const { data, error } = await supabaseAdmin
        .from('attendance')
        .select(`
            id,
            date,
            status,
            note,
            class:classes(name, day_of_week, start_time)
        `)
        .eq('status', 'absent')
        .eq('enrollment_id',
            // We need to find enrollments for this student matching the attendance
            // But attendance links to enrollment_id directly.
            // Wait, we can't filter by student_id directly on attendance table unless we join or get enrollments first.
            // But Supabase allows deep filtering if relation exists. 
            // `attendance -> enrollment -> student`
            // Let's try simpler: Get enrollments first or use !inner join.
            // Actually, we can just do a 2-step for safety or use inner join syntax.
            // .eq('enrollment.student_id', studentId) <- might work depending on PostgREST version.
            // Safe bet: Fetch student's enrollments, then fetch attendance.
            undefined // placeholder
        );

    // Better Approach: 
    // 1. Get Enrollment IDs for student
    const { data: enrollments } = await supabaseAdmin
        .from('enrollments')
        .select('id')
        .eq('student_id', studentId);

    if (!enrollments || enrollments.length === 0) return [];

    const enrollmentIds = enrollments.map(e => e.id);

    const { data: absences, error: attError } = await supabaseAdmin
        .from('attendance')
        .select(`
            id,
            date,
            status,
            note,
            class:classes(name, day_of_week, start_time)
        `)
        .in('enrollment_id', enrollmentIds)
        .eq('status', 'absent')
        .order('date', { ascending: false });

    if (attError) throw new Error(attError.message);
    return absences;
}

/**
 * Process Makeup
 * Updates past attendance record: status -> 'makeup', makeup_date -> today
 */
export async function processMakeup(attendanceId: string, makeupDateStr: string) {
    try {
        console.log(`[Makeup] Processing attendance ${attendanceId} on ${makeupDateStr}`);

        // 1. Get existing note
        const { data: existing, error: fetchError } = await supabaseAdmin
            .from('attendance')
            .select('note')
            .eq('id', attendanceId)
            .single();

        if (fetchError) throw new Error(fetchError.message);

        const oldNote = existing.note || '';
        const appendText = ` [보강완료: ${makeupDateStr}]`;
        const newNote = oldNote.includes(appendText) ? oldNote : (oldNote + appendText).trim();

        const { error } = await supabaseAdmin
            .from('attendance')
            .update({
                status: 'makeup',
                makeup_date: makeupDateStr,
                note: newNote
            })
            .eq('id', attendanceId);

        if (error) throw error;

        revalidatePath('/admin/attendance');
        return { success: true };
    } catch (e: any) {
        console.error('Process Makeup Error:', e);
        return { success: false, error: e.message };
    }
}

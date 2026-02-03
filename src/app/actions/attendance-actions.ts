'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { syncAttendanceStatusToShuttle } from './shuttle-ops-actions';

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
 */
export async function getStudentAbsences(studentId: string) {
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

/**
 * Update Attendance Status (Secure Server Action)
 * Handles DB updates, Notifications, Shuttle Sync, and Makeup Logic
 */
export async function updateAttendanceStatus({
    classId,
    enrollmentId,
    date,
    newStatus,
    note = '',
    studentId,
    studentName,
    className
}: {
    classId: string;
    enrollmentId: string;
    date: string;
    newStatus: string;
    note?: string;
    studentId: string;
    studentName: string;
    className: string;
}) {
    try {
        console.log(`[Attendance] Update: ${studentName} -> ${newStatus}`);

        // 1. Check for existing attendance record via enrollment_id + date + class_id
        // Usually unique constraint is on (enrollment_id, date) or (enrollment_id, class_id, date)
        const { data: existing } = await supabaseAdmin
            .from('attendance')
            .select('id, status')
            .eq('enrollment_id', enrollmentId)
            .eq('date', date)
            .eq('class_id', classId)
            .single();

        const attendanceId = existing?.id;

        // --- A. Delete if 'none' ---
        if (newStatus === 'none') {
            if (attendanceId) {
                // Delete associated makeup tickets
                await supabaseAdmin
                    .from('makeup_tickets')
                    .delete()
                    .eq('original_attendance_id', attendanceId);

                // Delete attendance record
                const { error } = await supabaseAdmin
                    .from('attendance')
                    .delete()
                    .eq('id', attendanceId);

                if (error) throw error;
            }
            return { success: true, attendanceId: null };
        }

        // --- B. Insert or Update ---
        let finalAttendanceId = attendanceId;

        if (attendanceId) {
            const { error } = await supabaseAdmin
                .from('attendance')
                .update({
                    status: newStatus,
                    note: note
                })
                .eq('id', attendanceId);
            if (error) throw error;
        } else {
            const { data: newRecord, error } = await supabaseAdmin
                .from('attendance')
                .insert({
                    enrollment_id: enrollmentId,
                    class_id: classId,
                    date: date,
                    status: newStatus,
                    note: note
                })
                .select('id')
                .single();
            if (error) throw error;
            finalAttendanceId = newRecord?.id;
        }

        // --- C. Notifications ---
        // Only notify for specific statuses
        if (['present', 'late', 'absent', 'makeup'].includes(newStatus)) {
            const messages: Record<string, string> = {
                present: '등원했습니다.',
                late: '지각 처리되었습니다.',
                absent: '결석 처리되었습니다.',
                makeup: '보강 처리되었습니다.'
            };
            const titles: Record<string, string> = {
                present: '등원 알림',
                late: '지각 알림',
                absent: '결석 알림',
                makeup: '보강 알림'
            };

            const notificationPayload = {
                student_id: studentId, // Check if this maps to a valid user or if table allows student_id
                // Assuming 'notifications' table works with student_id based on client code usage
                type: 'attendance',
                title: titles[newStatus],
                message: `[${className}] ${studentName} 학생이 ${messages[newStatus]}`,
                is_read: false
            };

            const { error: notiError } = await supabaseAdmin
                .from('notifications')
                .insert(notificationPayload);

            if (notiError) {
                console.error('[Attendance] Notification failed:', notiError.message);
                // Non-blocking error
            }
        }

        // --- D. Post-Processing (Shuttle & Makeup) ---
        if (newStatus === 'absent' && finalAttendanceId) {
            // Sync to Shuttle
            await syncAttendanceStatusToShuttle(studentId, date, true);

            // Makeup Logic
            // If note doesn't imply deduction or previous cycle
            if (note.startsWith('[보강]')) {
                const { data: ticket } = await supabaseAdmin
                    .from('makeup_tickets')
                    .select('id')
                    .eq('original_attendance_id', finalAttendanceId)
                    .single();

                if (!ticket) {
                    await supabaseAdmin.from('makeup_tickets').insert({
                        student_id: studentId,
                        original_attendance_id: finalAttendanceId,
                        status: 'available',
                        expiry_date: '2026-02-28' // Winter Session End
                    });
                }
            }
        }

        revalidatePath('/admin/attendance');
        return { success: true, attendanceId: finalAttendanceId };

    } catch (e: any) {
        console.error('[Attendance] Update Action Error:', e);
        return { success: false, error: e.message };
    }
}

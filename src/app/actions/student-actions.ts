'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function getStudentEnrollments(studentId: string) {
    const { data, error } = await supabaseAdmin
        .from('enrollments')
        .select(`
            id,
            class_id,
            status,
            classes (
                id,
                name,
                day_of_week,
                start_time,
                end_time
            )
        `)
        .eq('student_id', studentId)
        .eq('status', 'active');

    if (error) {
        console.error('Error fetching enrollments:', error);
        return [];
    }

    return data.map(enrollment => ({
        id: enrollment.id,
        class_id: enrollment.class_id,
        status: enrollment.status,
        class: enrollment.classes
    }));
}

export async function getAvailableClasses() {
    const { data, error } = await supabaseAdmin
        .from('classes')
        .select('*')
        .order('day_of_week')
        .order('start_time');

    if (error) return [];
    return data;
}

// ... imports

export async function getEnrollmentLogs(studentId: string) {
    const { data, error } = await supabaseAdmin
        .from('enrollment_logs')
        .select(`
            id,
            action,
            reason,
            created_at,
            classes (
                name,
                branch,
                session,
                day_of_week
            )
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching logs:', error);
        return [];
    }
    return data;
}

export async function addEnrollment(studentId: string, classId: string) {
    // 1. Check if already exists (including cancelled) to reactivate? 
    // For now, let's just insert/upsert. 
    // If strict unique constraint on (student_id, class_id) exists, we might need to update status if 'cancelled'.

    // First, check existing
    const { data: existing } = await supabaseAdmin
        .from('enrollments')
        .select('id, status')
        .eq('student_id', studentId)
        .eq('class_id', classId)
        .single();

    if (existing) {
        if (existing.status === 'active') {
            throw new Error('Already enrolled in this class');
        }
        // Reactivate
        const { error: updateError } = await supabaseAdmin
            .from('enrollments')
            .update({ status: 'active', type: 'manual_readd' })
            .eq('id', existing.id);

        if (updateError) throw new Error(updateError.message);
    } else {
        // Insert new
        const { error } = await supabaseAdmin
            .from('enrollments')
            .insert({
                student_id: studentId,
                class_id: classId,
                status: 'active',
                type: 'manual_add'
            });
        if (error) throw new Error(error.message);
    }

    // Log it
    await supabaseAdmin.from('enrollment_logs').insert({
        student_id: studentId,
        class_id: classId,
        action: 'enrolled',
        reason: 'Manual addition by admin'
    });

    revalidatePath('/admin/students');
}

export async function removeEnrollment(enrollmentId: string, studentId: string, classId: string, reason: string = 'Admin cancelled') {
    try {
        console.log(`[ServerAction] Removing enrollment: ${enrollmentId}, Student: ${studentId}, Class: ${classId}`);

        // Soft Delete: Update status to 'cancelled'
        const { error, data } = await supabaseAdmin
            .from('enrollments')
            .update({ status: 'cancelled' })
            .eq('id', enrollmentId)
            .select();

        if (error) {
            console.error('[ServerAction] Database error:', error);
            throw new Error(`Database error: ${error.message}`);
        }

        if (!data || data.length === 0) {
            console.error('[ServerAction] No record updated. ID might be wrong or already deleted.');
            // Check if it exists at all
            const { data: check } = await supabaseAdmin.from('enrollments').select('id, status').eq('id', enrollmentId).single();
            if (!check) throw new Error('Enrollment record not found');
            if (check.status === 'cancelled') return { success: true, message: 'Already cancelled' };
        }

        // Log it
        const { error: logError } = await supabaseAdmin.from('enrollment_logs').insert({
            student_id: studentId,
            class_id: classId,
            action: 'cancelled',
            reason: reason
        });

        if (logError) console.error('[ServerAction] Log insertion failed:', logError);

        revalidatePath('/admin/students');
        return { success: true };
    } catch (e: any) {
        console.error('[ServerAction] Unexpected error:', e);
        return { success: false, error: e.message };
    }
}

export async function deleteClass(classId: string) {
    try {
        console.log(`[ServerAction] Deleting class: ${classId}`);

        // 0. Fetch Enrollment IDs linked to this class
        const { data: enrollments, error: fetchErr } = await supabaseAdmin
            .from('enrollments')
            .select('id')
            .eq('class_id', classId);

        if (fetchErr) throw new Error(`Failed to fetch enrollments: ${fetchErr.message}`);

        const enrollmentIds = enrollments.map(e => e.id);

        if (enrollmentIds.length > 0) {
            // 1. Fetch Attendance IDs to delete makeup tickets
            const { data: attendanceRecords } = await supabaseAdmin
                .from('attendance')
                .select('id')
                .in('enrollment_id', enrollmentIds);

            if (attendanceRecords && attendanceRecords.length > 0) {
                const attIds = attendanceRecords.map(a => a.id);
                // 2. Delete Makeup Tickets linked to these attendance records
                await supabaseAdmin.from('makeup_tickets')
                    .delete()
                    .in('original_attendance_id', attIds);

                // 3. Delete Attendance records
                const { error: attError } = await supabaseAdmin
                    .from('attendance')
                    .delete()
                    .in('id', attIds);

                if (attError) throw new Error(`Failed to delete attendance: ${attError.message}`);
            }
        }

        // 4. Delete Dependent Enrollments
        const { error: enrollError } = await supabaseAdmin
            .from('enrollments')
            .delete()
            .eq('class_id', classId);

        if (enrollError) throw new Error(`Failed to delete enrollments: ${enrollError.message}`);

        // 5. Delete Class
        const { error: classError } = await supabaseAdmin
            .from('classes')
            .delete()
            .eq('id', classId);

        if (classError) throw new Error(`Failed to delete class: ${classError.message}`);

        revalidatePath('/admin/classes');
        return { success: true };
    } catch (e: any) {
        console.error('[ServerAction] Delete class failed:', e);
        return { success: false, error: e.message };
    }
}

export async function deleteStudent(studentId: string) {
    try {
        console.log(`[ServerAction] Hard Deleting student: ${studentId}`);

        // 1. Delete Attendance - Removed manual delete by student_id as column doesn't exist.
        // Cascading deletion handles this via enrollments -> attendance.

        // 2. Delete Shuttle Schedules
        // Note: logs will be handled by ON DELETE SET NULL or we should delete them manually if strict cleanup is needed.
        // Let's delete logs manually for cleanliness if they reference student_id directly? 
        // shuttle_ops_logs references student_id.
        const { error: logError } = await supabaseAdmin
            .from('shuttle_ops_logs')
            .delete()
            .eq('student_id', studentId);
        if (logError) throw new Error(`Failed to delete shuttle logs: ${logError.message}`);

        const { error: schedError } = await supabaseAdmin
            .from('shuttle_schedules')
            .delete()
            .eq('student_id', studentId);
        if (schedError) throw new Error(`Failed to delete shuttle schedules: ${schedError.message}`);

        // 3. Delete Enrollments
        const { error: enrollError } = await supabaseAdmin
            .from('enrollments')
            .delete()
            .eq('student_id', studentId);
        if (enrollError) throw new Error(`Failed to delete enrollments: ${enrollError.message}`);

        // 4. Delete Student
        const { error: studentError } = await supabaseAdmin
            .from('students')
            .delete()
            .eq('id', studentId);

        if (studentError) throw new Error(`Failed to delete student: ${studentError.message}`);

        revalidatePath('/admin/students');
        return { success: true };
    } catch (e: any) {
        console.error('[ServerAction] Delete student failed:', e);
        return { success: false, error: e.message };
    }
}

export async function createStudent(data: any) {
    try {
        console.log(`[ServerAction] Creating student:`, data);

        // Extract schedules if present
        const { schedules, ...studentData } = data;

        // Remove empty strings to keep DB clean
        const cleanData = Object.fromEntries(
            Object.entries(studentData).map(([k, v]) => [k, v === '' ? null : v])
        );

        const { data: newStudent, error } = await supabaseAdmin
            .from('students')
            .insert({
                ...cleanData,
                created_at: new Date().toISOString(),
                status: 'active'
            })
            .select()
            .single();

        if (error) throw new Error(error.message);

        // Handle Schedules
        if (schedules && Array.isArray(schedules) && schedules.length > 0) {
            console.log(`[ServerAction] Adding ${schedules.length} schedules`);
            const scheduleMap = schedules.map((s: any) => ({
                student_id: newStudent.id,
                day_of_week: s.day_of_week,
                type: s.type,
                time: s.time,
                location_name: s.location_name,
                location_address: s.location_address,
                location_lat: s.location_lat,
                location_lng: s.location_lng,
                sequence_order: s.sequence_order || 0
            }));

            const { error: scheduleError } = await supabaseAdmin
                .from('shuttle_schedules')
                .insert(scheduleMap);

            if (scheduleError) {
                console.error('[ServerAction] Failed to insert schedules:', scheduleError);
                // Non-fatal, return student but warn?
            }
        }

        revalidatePath('/admin/students');
        return { success: true, data: newStudent };
    } catch (e: any) {
        console.error('[ServerAction] Create student failed:', e);
        return { success: false, error: e.message };
    }
}

export async function updateStudent(id: string, data: any) {
    try {
        console.log(`[ServerAction] Updating student ${id}:`, data);

        const cleanData = Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
        );

        const { data: updatedStudent, error } = await supabaseAdmin
            .from('students')
            .update({
                ...cleanData,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);

        revalidatePath('/admin/students');
        revalidatePath(`/admin/students/${id}`);
        return { success: true, data: updatedStudent };
    } catch (e: any) {
        console.error('[ServerAction] Update student failed:', e);
        return { success: false, error: e.message };
    }
}

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import AttendanceItem from './AttendanceItem';

interface StudentAttendance {
    studentId: string;
    studentName: string;
    grade: string;
    school: string;
    phone: string;
    parentPhone: string;
    enrollmentId: string;
    attendanceId: string | null;
    status: string; // 'none', 'present', 'late', 'absent', 'makeup'
    note: string;
}

interface ClassGroup {
    classId: string;
    className: string;
    startTime: string;
    students: StudentAttendance[];
}

interface Props {
    date: string;
    initialData: ClassGroup[];
}

export default function AttendanceList({ date, initialData }: Props) {
    const [data, setData] = useState(initialData);

    // This function will be passed down to Items to update local state and DB
    const updateStatus = async (classId: string, enrollmentId: string, newStatus: string, note: string = '') => {
        // Optimistic Update
        setData(prev => prev.map(cls => {
            if (cls.classId !== classId) return cls;
            return {
                ...cls,
                students: cls.students.map(std => {
                    if (std.enrollmentId !== enrollmentId) return std;
                    return { ...std, status: newStatus, note };
                })
            };
        }));

        // DB Update
        try {
            // Find the student record to get attendanceId if it exists
            const cls = data.find(c => c.classId === classId);
            const std = cls?.students.find(s => s.enrollmentId === enrollmentId);
            const attendanceId = std?.attendanceId;

            let finalAttendanceId = attendanceId;

            if (attendanceId) {
                // Update existing
                await supabase.from('attendance').update({
                    status: newStatus,
                    note: note
                }).eq('id', attendanceId);
            } else {
                // Insert new
                const { data: newAtt, error } = await supabase.from('attendance').insert({
                    enrollment_id: enrollmentId,
                    class_id: classId,
                    date: date,
                    status: newStatus,
                    note: note
                }).select('id').single();

                if (!error && newAtt) {
                    finalAttendanceId = newAtt.id;
                    // Update state with new ID so subsequent updates work
                    setData(prev => prev.map(c => {
                        if (c.classId !== classId) return c;
                        return {
                            ...c,
                            students: c.students.map(s => {
                                if (s.enrollmentId !== enrollmentId) return s;
                                return { ...s, attendanceId: newAtt.id };
                            })
                        };
                    }));
                }
            }

            // Handle Logic for 'Absent' (Carry-over vs Makeup)
            if (newStatus === 'absent' && finalAttendanceId && std) {
                // Sync to Shuttle
                const { syncAttendanceStatusToShuttle } = await import('@/app/actions/shuttle-ops-actions');
                await syncAttendanceStatusToShuttle(std.studentId, date, true);

                // Check note for tag
                if (note.startsWith('[이월]')) {
                    // 1. Logic for Carry-Over: Update payment deduction
                    // We need to find the student's payment record and increment deduction?
                    // Or just log it. For now, let's try to update the payment record.
                    // Finding payment for this student (we need studentId)

                    // Simple approach: Fetch latest payment and increment deduction by unit price?
                    // Complex because unit price isn't stored.
                    // IMPORTANT: Ideally this should be server-side logic (RPC or API).
                    // For MVP client-side: We'll just assume a fixed amount or skip calculation for now?
                    // Let's just create a log or skip actual payment update until we have unit price logic.
                    // "Deduction logic to be implemented in billing cycle" - as per plan.
                    // So we keep the note as the record of truth.
                } else if (note.startsWith('[보강]')) {
                    // 2. Logic for Makeup: Create a Ticket
                    // Check if ticket already exists for this attendance?
                    const { data: existingTicket } = await supabase
                        .from('makeup_tickets')
                        .select('id')
                        .eq('original_attendance_id', finalAttendanceId)
                        .single();

                    if (!existingTicket) {
                        await supabase.from('makeup_tickets').insert({
                            student_id: std.studentId,
                            original_attendance_id: finalAttendanceId,
                            status: 'available',
                            expiry_date: '2026-02-28' // End of winter session?
                        });
                        // console.log('Makeup ticket created');
                    }
                }
            }

        } catch (error) {
            console.error("Failed to update attendance", error);
            // Rollback logic could go here
        }
    };

    if (initialData.length === 0) {
        return <div className="text-center py-10 text-gray-500">수업이 없는 날입니다.</div>;
    }

    return (
        <div className="grid grid-cols-1 gap-6">
            {data.map((cls) => (
                <Card key={cls.classId}>
                    <CardHeader className="bg-gray-50 dark:bg-gray-800 rounded-t-lg p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                            <div className="flex-1 min-w-0">
                                <CardTitle className="text-lg sm:text-xl font-bold leading-tight break-words">
                                    {cls.className}
                                </CardTitle>
                                <div className="flex items-center gap-2 mt-1 sm:mt-0">
                                    <span className="text-xs sm:text-sm font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded sm:bg-transparent sm:p-0 sm:text-gray-500">
                                        {cls.startTime}
                                    </span>
                                    <Badge variant="secondary" className="sm:hidden bg-gray-200 text-gray-700">
                                        {cls.students.length}명
                                    </Badge>
                                </div>
                            </div>
                            <Badge variant="outline" className="hidden sm:inline-flex border-gray-300">
                                {cls.students.length}명 수강생
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {cls.students.length === 0 ? (
                            <div className="p-6 text-center text-gray-400">수강생이 없습니다.</div>
                        ) : (
                            <div className="divide-y">
                                {cls.students.map(student => (
                                    <AttendanceItem
                                        key={student.enrollmentId}
                                        classId={cls.classId}
                                        student={student}
                                        onUpdate={updateStatus}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

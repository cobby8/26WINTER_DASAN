import { supabaseAdmin } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import AttendanceList from '@/components/attendance/AttendanceList';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { DateNav } from '@/components/attendance/DateNav';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const revalidate = 0;

interface Props {
    searchParams: { date?: string };
}

const DAYS_MAP: { [key: string]: string } = {
    'Monday': '월요일',
    'Tuesday': '화요일',
    'Wednesday': '수요일',
    'Thursday': '목요일',
    'Friday': '금요일',
    'Saturday': '토요일',
    'Sunday': '일요일'
};

export default async function AttendancePage(props: { searchParams: Promise<{ date?: string }> }) {
    const searchParams = await props.searchParams;
    const dateStr = searchParams.date || format(new Date(), 'yyyy-MM-dd');

    // Fix: Parse YYYY-MM-DD manually to avoid timezone issues with `new Date()` or `parseISO`
    // which might default to UTC and shift date when formatted in local time.
    const [year, month, day] = dateStr.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day); // Local time construction

    // Manual Day Mapping to ensure consistency regardless of server locale
    const DAY_INDEX_MAP = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const dayNameKo = DAY_INDEX_MAP[targetDate.getDay()];

    // 1. Fetch Classes for this day
    const { data: classes, error: classError } = await supabaseAdmin
        .from('classes')
        .select('id, name, start_time, end_time, session, branch, start_date, end_date')
        .eq('day_of_week', dayNameKo)
        .order('start_time');

    if (classError) return <div>Error loading classes: {classError.message}</div>;

    // Winter 2026 Session Logic
    const isHoliday = (d: Date) => {
        const time = d.getTime();
        // 2026/02/16 ~ 2026/02/22 (Feb 16 is Mon, Feb 22 is Sun)
        const start = new Date(2026, 1, 16).getTime();
        const end = new Date(2026, 1, 22).getTime();
        return time >= start && time <= end;
    };

    const getSessionForDate = (d: Date): '1차' | '2차' | 'Holiday' | 'None' => {
        if (isHoliday(d)) return 'Holiday';

        const time = d.getTime();
        // 1st: 2026/01/05 ~ 2026/01/30
        const s1Start = new Date(2026, 0, 5).getTime();
        const s1End = new Date(2026, 0, 30).getTime();
        if (time >= s1Start && time <= s1End) return '1차';

        // 2nd: 2026/02/02 ~ 2026/02/27
        const s2Start = new Date(2026, 1, 2).getTime();
        const s2End = new Date(2026, 1, 27).getTime();
        if (time >= s2Start && time <= s2End) return '2차';

        return 'None'; // Out of session bounds
    };

    const currentSession = getSessionForDate(targetDate);

    // 2. Fetch Enrollments & Attendance for these classes
    let resultData: any[] = [];
    let message = null;

    if (currentSession === 'Holiday') {
        message = "겨울방학 특강 휴무 기간입니다 (2/16 ~ 2/22)";
    } else if (classes && classes.length > 0) {
        // Filter classes by session if possible
        // Note: Classes usually have session info now.
        // If class session is '1차', show only in period 1.
        // If class session is '2차', show only in period 2.
        // If class session is null, maybe show always? Or assume 1차/2차 logic.

        const validClasses = classes.filter(cls => {
            if (!cls.session) return true; // Show if strict session not set
            // If we are in '1차' period, show '1차' classes only
            if (currentSession === '1차' && cls.session === '1차') return true;
            if (currentSession === '2차' && cls.session === '2차') return true;
            return false;
        });

        const classIds = validClasses.map(c => c.id);

        if (validClasses.length > 0) {
            // Fetch Enrollments (Students for these classes)
            const { data: enrollments, error: enrollError } = await supabaseAdmin
                .from('enrollments')
                .select(`
            id,
            student_id,
            class_id,
            status,
            students ( id, name, grade, student_phone )
        `)
                .in('class_id', classIds)
                .eq('status', 'active'); // Only active students

            // Fetch Existing Attendance
            const { data: attendanceParams, error: attError } = await supabaseAdmin
                .from('attendance')
                .select('*')
                .eq('date', dateStr)
                .in('class_id', classIds);

            // Combine Data
            resultData = validClasses.map(cls => {
                const classEnrollments = enrollments?.filter(e => {
                    if (e.class_id !== cls.id) return false;

                    // Filter by Date (Class Period)
                    // If no dates set, assume valid
                    if (!cls.start_date && !cls.end_date) return true;

                    const start = cls.start_date ? new Date(cls.start_date) : new Date('2000-01-01');
                    const end = cls.end_date ? new Date(cls.end_date) : new Date('2099-12-31');

                    // Normalize for comparison
                    start.setHours(0, 0, 0, 0);
                    end.setHours(23, 59, 59, 999);

                    // Use a safe check date (Noon) to avoid boundary issues
                    const checkDate = new Date(targetDate);
                    checkDate.setHours(12, 0, 0, 0);

                    return checkDate >= start && checkDate <= end;
                }) || [];

                const studentsWithStatus = classEnrollments.map(enroll => {
                    const att = attendanceParams?.find(a => a.enrollment_id === enroll.id);
                    // @ts-ignore
                    const student = Array.isArray(enroll.students) ? enroll.students[0] : enroll.students;

                    return {
                        studentId: student?.id,
                        studentName: student?.name,
                        grade: student?.grade,
                        phone: student?.student_phone,
                        enrollmentId: enroll.id,
                        attendanceId: att?.id || null,
                        status: att?.status || 'none',
                        note: att?.note || '',
                    };
                });

                // Sort Students by Name (Korean Order)
                studentsWithStatus.sort((a, b) => a.studentName.localeCompare(b.studentName, 'ko'));

                return {
                    classId: cls.id,
                    className: cls.name,
                    startTime: cls.start_time,
                    students: studentsWithStatus
                };
            });
        } else {
            if (currentSession !== 'None') message = `해당 날짜(${currentSession})에 예정된 수업이 없습니다.`;
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Attendance</h2>
                <DateNav dateStr={dateStr} />
            </div>

            {message && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md mb-4 font-medium">
                    {message}
                </div>
            )}

            {!message && resultData.length === 0 && (
                <div className="text-center py-10 text-gray-500">
                    해당 날짜에 등록된 수업이 없습니다.
                </div>
            )}

            <AttendanceList key={dateStr} date={dateStr} initialData={resultData} />
        </div>
    );
}

import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Bell, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

export const revalidate = 0;

export default async function StudentDashboard() {
    const cookieStore = await cookies();
    const studentId = cookieStore.get('studentId')?.value;

    if (!studentId) redirect('/portal');

    // Fetch Student Data
    const { data: student, error } = await supabaseAdmin
        .from('students')
        .select(`
      *,
      enrollments (
        *,
        classes (name, day_of_week, start_time)
      ),
      payments (*)
    `)
        .eq('id', studentId)
        .single();

    if (error || !student) redirect('/portal');

    // Fetch Attendance History
    const { data: attendance } = await supabaseAdmin
        .from('attendance')
        .select(`date, status, classes(name)`)
        .in('enrollment_id', student.enrollments.map((e: any) => e.id))
        .order('date', { ascending: false });

    // Calculate Stats
    const totalClasses = attendance?.length || 0;
    const attended = attendance?.filter((a: any) => a.status === 'present').length || 0;
    const absent = attendance?.filter((a: any) => a.status === 'absent').length || 0;
    const attendanceRate = totalClasses > 0 ? Math.round((attended / totalClasses) * 100) : 0;

    // Calculate Tuition
    const payment = student.payments?.[0];
    const totalDue = payment ? (payment.tuition_fee + payment.shuttle_fee - payment.carry_over_deduction) : 0;
    const isPaid = payment?.status === 'paid';

    // Today's Date
    const today = new Date();
    const dateStr = today.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' });

    return (
        <div className="bg-[#F2F4F6] min-h-screen">
            {/* Header */}
            <header className="px-6 py-5 flex justify-between items-center bg-white">
                <h1 className="text-xl font-bold text-gray-900">Winter Class</h1>
                <div className="flex gap-4 items-center">
                    <Link href="/portal?logout=true" className="text-sm text-gray-500 hover:text-gray-800">
                        Logout
                    </Link>
                    <Button variant="ghost" size="icon" className="relative">
                        <Bell className="w-6 h-6 text-gray-400" />
                        <span className="absolute top-2 right-2 w-1 h-1 bg-red-500 rounded-full"></span>
                    </Button>
                </div>
            </header>

            <main className="px-5 py-6 space-y-6">

                {/* 1. Student Profile Card (Blue Gradient) */}
                <section className="bg-blue-600 rounded-[24px] p-6 text-white shadow-lg shadow-blue-200">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-3xl font-bold mb-1">{student.name}</h2>
                            <p className="text-blue-100 text-sm font-medium">{student.school} / {student.grade}</p>
                        </div>
                        {/* <Avatar className="w-12 h-12 border-2 border-white/20">
                    <AvatarFallback className="bg-blue-500 text-white font-bold">{student.name[0]}</AvatarFallback>
                </Avatar> */}
                    </div>

                    <div className="flex gap-8">
                        <div>
                            <p className="text-blue-100 text-xs mb-1">출석률</p>
                            <p className="text-2xl font-bold">{attendanceRate}%</p>
                        </div>
                        <div>
                            <p className="text-blue-100 text-xs mb-1">결석</p>
                            <p className="text-2xl font-bold">{absent}회</p>
                        </div>
                    </div>
                </section>

                {/* 2. Today's Status (Simple Timeline) */}
                <section>
                    <h3 className="text-gray-800 font-bold text-lg mb-3">오늘의 일정</h3>
                    <Card className="rounded-[20px] border-none shadow-sm p-5 bg-white">
                        <div className="text-gray-500 text-sm mb-4">{dateStr}</div>
                        <div className="space-y-4 relative pl-4 border-l-2 border-gray-100 ml-1">
                            {/* Mock Data for visual structure */}
                            {student.enrollments.map((enr: any) => (
                                <div key={enr.id} className="relative">
                                    <div className="absolute -left-[21px] top-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white ring-1 ring-blue-100"></div>
                                    <p className="text-gray-900 font-bold text-base leading-none mb-1">{enr.classes.name}</p>
                                    <p className="text-gray-400 text-sm">{enr.classes.start_time}</p>
                                </div>
                            ))}
                            {student.enrollments.length === 0 && (
                                <div className="text-gray-400 text-sm">일정이 없습니다.</div>
                            )}
                        </div>
                    </Card>
                </section>

                {/* 3. Tuition Status (Compact Toss Style) */}
                <section>
                    <h3 className="text-gray-800 font-bold text-lg mb-3">수납 현황</h3>
                    <Card className="rounded-[20px] border-none shadow-sm p-5 bg-white flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors">
                        <div>
                            <p className="text-xs text-gray-400 font-medium mb-1">Total Amount</p>
                            <p className="text-xl font-bold text-gray-900">{totalDue.toLocaleString()} KRW</p>
                        </div>
                        <Badge className={isPaid ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-red-50 text-red-600 hover:bg-red-100"}>
                            {isPaid ? "납부완료" : "미납"}
                        </Badge>
                    </Card>
                </section>

                {/* 4. My Classes List */}
                <section className="pb-8">
                    <h3 className="text-gray-800 font-bold text-lg mb-3">내 수업</h3>
                    <div className="space-y-3">
                        {student.enrollments.map((enr: any) => (
                            <Card key={enr.id} className="rounded-[20px] border-none shadow-sm p-5 bg-white">
                                <p className="text-gray-900 font-bold mb-1">{enr.classes.name}</p>
                                <div className="flex justify-between items-center text-sm text-gray-500">
                                    <span>{enr.classes.day_of_week} ({enr.classes.start_time})</span>
                                    <span className="text-gray-300 font-light text-xs">Class ID: {enr.classes.id.slice(0, 4)}</span>
                                </div>
                            </Card>
                        ))}
                    </div>
                </section>

            </main>
        </div>
    );
}

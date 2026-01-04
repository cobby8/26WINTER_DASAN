import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const revalidate = 0;

export default async function StudentDashboard() {
    const cookieStore = await cookies();
    const studentId = cookieStore.get('studentId')?.value;

    if (!studentId) {
        redirect('/portal');
    }

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

    if (error || !student) {
        // Cookie might be invalid
        redirect('/portal');
    }

    // Fetch Attendance History
    const { data: attendance } = await supabaseAdmin
        .from('attendance')
        .select(`
      date,
      status,
      note,
      classes (name)
    `)
        .in('enrollment_id', student.enrollments.map((e: any) => e.id))
        .order('date', { ascending: false });

    // Calculate Payment Stats
    const payment = student.payments?.[0];
    const totalDue = payment ? (payment.tuition_fee + payment.shuttle_fee - payment.carry_over_deduction) : 0;
    const isPaid = payment?.status === 'paid';

    // Attendance Stats
    const totalClasses = attendance?.length || 0;
    const attended = attendance?.filter((a: any) => a.status === 'present').length || 0;
    const absent = attendance?.filter((a: any) => a.status === 'absent').length || 0;
    const attendanceRate = totalClasses > 0 ? Math.round((attended / totalClasses) * 100) : 0;

    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="font-bold text-lg text-blue-600">Winter Class</h1>
                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/portal?logout=true">Logout</Link>
                    </Button>
                </div>
            </header>

            <main className="max-w-md mx-auto px-4 space-y-6 mt-6">
                {/* Profile Card */}
                <Card className="border-none shadow-md bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    <CardContent className="p-6">
                        <h2 className="text-2xl font-bold">{student.name}</h2>
                        <p className="opacity-90">{student.school} / {student.grade}</p>
                        <div className="mt-4 flex space-x-4 text-sm">
                            <div>
                                <span className="block opacity-75">출석률</span>
                                <span className="font-bold text-lg">{attendanceRate}%</span>
                            </div>
                            <div>
                                <span className="block opacity-75">결석</span>
                                <span className="font-bold text-lg">{absent}회</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Payment Status */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Tuition Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                            <div>
                                <p className="text-xs text-gray-500">Total Amount</p>
                                <p className="font-bold">{totalDue.toLocaleString()} KRW</p>
                            </div>
                            <Badge variant={isPaid ? 'default' : 'destructive'} className="h-8 px-3">
                                {isPaid ? 'PAID' : 'UNPAID'}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Classes */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">My Classes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {student.enrollments.map((enr: any) => (
                            <div key={enr.id} className="text-sm p-3 border rounded-lg flex justify-between">
                                <span className="font-medium">{enr.classes.name}</span>
                                <span className="text-gray-500">{enr.classes.day_of_week} {enr.classes.start_time}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Attendance History */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Attendance History</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {attendance && attendance.length > 0 ? (
                            attendance.map((att: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                                    <div>
                                        <p className="font-medium">{att.date}</p>
                                        <p className="text-xs text-gray-500">{att.classes.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <Badge variant={
                                            att.status === 'present' ? 'default' :
                                                att.status === 'absent' ? 'destructive' : 'secondary'
                                        }>
                                            {att.status.toUpperCase()}
                                        </Badge>
                                        {att.status === 'absent' && att.note && (
                                            <p className="text-xs text-red-500 mt-1 max-w-[150px] truncate">{att.note}</p>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-400 py-4 text-sm">No attendance records yet.</p>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

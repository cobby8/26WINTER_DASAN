import { supabaseAdmin } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, BookOpen, DollarSign, Wallet } from 'lucide-react';
import { AttendanceChart, RevenueChart } from '@/components/admin/DashboardCharts';
import { subDays, format, startOfMonth } from 'date-fns';

export const revalidate = 0;

export default async function AdminDashboard() {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const startOfMonthDate = startOfMonth(today);
    const startOfMonthIso = startOfMonthDate.toISOString();

    // 1. Basic Counts (Active Students & Classes - Exclude Deleted)
    const { count: studentCount } = await supabaseAdmin.from('students')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

    const { count: classCount } = await supabaseAdmin.from('classes')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

    // 2. Revenue Data (Filtered to This Month & Deduplicated)
    const { data: payments } = await supabaseAdmin.from('payments')
        .select('student_id, amount, status, tuition_fee, shuttle_fee, carry_over_deduction, created_at')
        .gte('created_at', startOfMonthIso);

    // Helper to deduplicate payments by student_id (Take latest or paid one)
    const uniquePaymentsMap = new Map();
    payments?.forEach(p => {
        const existing = uniquePaymentsMap.get(p.student_id);
        if (!existing) {
            uniquePaymentsMap.set(p.student_id, p);
        } else {
            // Logic: Prefer 'paid' status over others. If same status, prefer newer created_at.
            if (p.status === 'paid' && existing.status !== 'paid') {
                uniquePaymentsMap.set(p.student_id, p);
            } else if (p.status === existing.status) {
                if (new Date(p.created_at) > new Date(existing.created_at)) {
                    uniquePaymentsMap.set(p.student_id, p);
                }
            }
        }
    });

    const uniquePayments = Array.from(uniquePaymentsMap.values());

    let paidRevenue = 0;
    let unpaidRevenue = 0;

    uniquePayments.forEach((p: any) => {
        const expectedAmount = (p.tuition_fee || 0) + (p.shuttle_fee || 0) - (p.carry_over_deduction || 0);

        if (p.status === 'paid') {
            paidRevenue += (p.amount || 0);
        } else if (p.status === 'pending') {
            unpaidRevenue += expectedAmount;
        }
    });

    const revenueData = [
        { name: '납부 완료', value: paidRevenue },
        { name: '미납', value: unpaidRevenue },
    ];

    // 3. Attendance Trends (Last 7 Days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = subDays(today, 6 - i);
        return format(d, 'yyyy-MM-dd');
    });

    const trendStartDate = last7Days[0];
    const { data: attendanceLogs } = await supabaseAdmin
        .from('attendance')
        .select('date, status')
        .gte('date', trendStartDate)
        .lte('date', format(today, 'yyyy-MM-dd'));

    const attendanceData = last7Days.map(date => {
        const count = attendanceLogs?.filter(log => log.date === date && log.status === 'present').length || 0;
        return { date, count };
    });

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">{currentMonth}월 운영 현황 (Dashboard)</h2>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">총 원생</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{studentCount || 0}명</div>
                        <p className="text-xs text-muted-foreground">현재 등록된 학생</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">주간 수업</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{classCount || 0}개</div>
                        <p className="text-xs text-muted-foreground">개설된 반 개수</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{currentMonth}월 수납</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{paidRevenue.toLocaleString()}원</div>
                        <p className="text-xs text-muted-foreground">
                            납부율 {Math.round((paidRevenue / ((paidRevenue + unpaidRevenue) || 1)) * 100)}%
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">미수납액</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">{unpaidRevenue.toLocaleString()}원</div>
                        <p className="text-xs text-muted-foreground">
                            관리 필요
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-7">
                <AttendanceChart data={attendanceData} />
                <RevenueChart data={revenueData} />
            </div>
        </div>
    );
}

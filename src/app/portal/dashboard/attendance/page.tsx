import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ko } from 'date-fns/locale';

export const revalidate = 0;

export default async function AttendancePage() {
    const cookieStore = await cookies();
    const studentId = cookieStore.get('studentId')?.value;

    if (!studentId) redirect('/portal');

    // Fetch Attendance
    const { data: attendance } = await supabaseAdmin
        .from('attendance')
        .select(`
            id, date, status, note,
            classes (name, start_time)
        `)
        .in('enrollment_id', (
            await supabaseAdmin.from('enrollments').select('id').eq('student_id', studentId)
        ).data?.map(e => e.id) || [])
        .order('date', { ascending: false });

    // Dates for Calendar Modifiers
    const presentDates = attendance?.filter((a: any) => a.status === 'present').map((a: any) => new Date(a.date)) || [];
    const absentDates = attendance?.filter((a: any) => a.status === 'absent').map((a: any) => new Date(a.date)) || [];
    const lateDates = attendance?.filter((a: any) => a.status === 'late').map((a: any) => new Date(a.date)) || [];

    return (
        <div className="bg-[#F2F4F6] min-h-screen pb-24">
            <header className="px-6 py-5 bg-white mb-6">
                <h1 className="text-xl font-bold text-gray-900">출결 현황</h1>
            </header>

            <main className="px-5 space-y-6">
                {/* 1. Calendar View */}
                <Card className="rounded-[24px] border-none shadow-sm p-4 bg-white flex justify-center">
                    {/* Note: In a real app, this should be a client component to handle month changes smoothly if data is large. 
                        For now, we pass standard dates. The standard 'Calendar' component is interactive, 
                        we might want to disable selection or make it read-only visual. */}
                    <Calendar
                        mode="single"
                        locale={ko}
                        selected={new Date()}
                        className="rounded-md border-none"
                        modifiers={{
                            present: presentDates,
                            absent: absentDates,
                            late: lateDates
                        }}
                        modifiersStyles={{
                            present: { color: 'white', backgroundColor: '#3b82f6', borderRadius: '50%' }, // Blue
                            absent: { color: 'white', backgroundColor: '#ef4444', borderRadius: '50%' }, // Red
                            late: { color: 'white', backgroundColor: '#eab308', borderRadius: '50%' }   // Yellow
                        }}
                    />
                </Card>

                {/* 2. Legend */}
                <div className="flex justify-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-gray-600">출석</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-gray-600">결석</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span className="text-gray-600">지각</span>
                    </div>
                </div>

                {/* 3. Recent History List */}
                <section>
                    <h3 className="text-gray-800 font-bold text-lg mb-3">최근 활동</h3>
                    <div className="space-y-3">
                        {attendance?.slice(0, 10).map((att: any) => (
                            <Card key={att.id} className="rounded-[20px] border-none shadow-sm p-5 bg-white flex justify-between items-center">
                                <div>
                                    <p className="text-gray-900 font-bold mb-1">{att.date}</p>
                                    <p className="text-gray-500 text-sm">{Array.isArray(att.classes) ? att.classes[0]?.name : att.classes?.name}</p>
                                </div>
                                <div className="text-right">
                                    <Badge variant={
                                        att.status === 'present' ? 'default' :
                                            att.status === 'absent' ? 'destructive' : 'secondary'
                                    } className={
                                        att.status === 'present' ? 'bg-blue-100 text-blue-600 hover:bg-blue-200 shadow-none' :
                                            att.status === 'absent' ? 'bg-red-100 text-red-600 hover:bg-red-200 shadow-none' : ''
                                    }>
                                        {att.status === 'present' ? '출석' : att.status === 'absent' ? '결석' : att.status}
                                    </Badge>
                                    {att.note && <p className="text-xs text-red-400 mt-1">{att.note}</p>}
                                </div>
                            </Card>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}

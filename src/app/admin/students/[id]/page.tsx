import { supabaseAdmin } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import BillingCard from '@/components/payment/BillingCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStudentAttendanceHistory } from '@/app/actions/student-actions';
import StudentAttendanceTab from '@/components/attendance/StudentAttendanceTab';

export const revalidate = 0;

interface Props {
    searchParams: { id?: string };
    params: Promise<{ id: string }>;
}

export default async function StudentDetailPage({ params }: Props) {
    const { id } = await params;

    // Fetch Student
    const { data: student, error: studentError } = await supabaseAdmin
        .from('students')
        .select('*')
        .eq('id', id)
        .single();

    if (studentError || !student) {
        return <div>Student not found</div>;
    }

    // Fetch Enrollments with Class details
    const { data: enrollments, error: enrollError } = await supabaseAdmin
        .from('enrollments')
        .select(`
      *,
      classes (
        name,
        day_of_week,
        start_time,
        end_time
      )
    `)
        .eq('student_id', id);

    // Fetch Payment Info
    const { data: payment } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('student_id', id)
        .single();

    // Fetch Attendance History
    const attendanceData = await getStudentAttendanceHistory(id);

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin/students">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold tracking-tight">{student.name}</h2>
                    <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                        {student.status === 'active' ? '재원생' : '퇴원생'}
                    </Badge>
                </div>
            </div>

            <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                    <TabsTrigger value="info">기본 정보</TabsTrigger>
                    <TabsTrigger value="enrollment">수강 관리</TabsTrigger>
                    <TabsTrigger value="attendance">출석부</TabsTrigger>
                </TabsList>

                {/* --- Tab 1: Info (Basic + Billing) --- */}
                <TabsContent value="info" className="space-y-6 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Basic Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle>기본 정보</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex justify-between border-b pb-2">
                                    <span className="font-medium text-gray-500">성별</span>
                                    <span>{student.gender}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="font-medium text-gray-500">학년</span>
                                    <span>{student.grade}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="font-medium text-gray-500">학교</span>
                                    <span>{student.school}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="font-medium text-gray-500">생년월일</span>
                                    <span>{student.birth_date}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="font-medium text-gray-500">주소</span>
                                    <span>{student.address}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Contact Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle>연락처 정보</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex justify-between border-b pb-2">
                                    <span className="font-medium text-gray-500">학생 연락처</span>
                                    <span>{student.student_phone}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="font-medium text-gray-500">학부모 성함</span>
                                    <span>{student.parent_name}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="font-medium text-gray-500">학부모 연락처</span>
                                    <span>{student.parent_phone}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Note */}
                    {student.note && (
                        <Card>
                            <CardHeader>
                                <CardTitle>특이사항 / 메모</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="whitespace-pre-wrap">{student.note}</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* --- Tab 2: Enrollment (Billing + Class List) --- */}
                <TabsContent value="enrollment" className="space-y-6 mt-6">
                    {/* Billing Card */}
                    <BillingCard studentId={id} initialPayment={payment} />

                    {/* Enrollments */}
                    <Card>
                        <CardHeader>
                            <CardTitle>수강 정보</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {enrollments && enrollments.length > 0 ? (
                                <div className="space-y-4">
                                    {enrollments.map((enroll: any) => (
                                        <div key={enroll.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                                            <div>
                                                <h4 className="font-bold">{enroll.classes?.name}</h4>
                                                <p className="text-sm text-gray-500">
                                                    {enroll.classes?.day_of_week} ({enroll.classes?.start_time} - {enroll.classes?.end_time})
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <Badge variant={enroll.status === 'active' ? 'default' : 'destructive'}>
                                                    {enroll.status === 'active' ? '수강중' : enroll.status}
                                                </Badge>
                                                {enroll.shuttle_use && (
                                                    <div className="mt-1">
                                                        <Badge variant="secondary">셔틀 이용</Badge>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500">신청한 수업이 없습니다.</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- Tab 3: Attendance --- */}
                <TabsContent value="attendance" className="mt-6">
                    <StudentAttendanceTab
                        logs={attendanceData.logs}
                        tenureDays={attendanceData.tenureDays}
                        startDate={attendanceData.startDate}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}


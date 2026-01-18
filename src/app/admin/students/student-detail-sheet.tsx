'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Phone, School, User, Calendar, MapPin, FileText, Plus, X, BookOpen } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { getStudentEnrollments, getAvailableClasses, addEnrollment, removeEnrollment, getEnrollmentLogs, getStudentAttendanceHistory } from "@/app/actions/student-actions";
import StudentAttendanceTab from "@/components/attendance/StudentAttendanceTab";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { getStudentPayment } from "@/app/actions/payment-actions";
import BillingCard from "@/components/payment/BillingCard";

interface Student {
    id: string;
    name: string;
    gender?: string;
    grade?: string;
    school?: string;
    student_phone?: string;
    parent_name?: string;
    parent_phone?: string;
    address?: string;
    birth_date?: string;
    note?: string;
    registration_source?: string;
    created_at?: string;
}

interface StudentDetailSheetProps {
    student: Student | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function EnrollmentLogList({ studentId, refreshKey }: { studentId: string, refreshKey?: number }) {
    const [logs, setLogs] = useState<any[]>([]);

    useEffect(() => {
        getEnrollmentLogs(studentId).then(setLogs);
    }, [studentId, refreshKey]);

    if (logs.length === 0) return <div className="text-xs text-gray-400 italic">기록된 이력이 없습니다.</div>;

    return (
        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {logs.map((log) => (
                <div key={log.id} className="text-xs flex flex-col p-2 bg-gray-50 rounded border border-gray-100">
                    <div className="flex justify-between items-center">
                        <span className={`font-semibold ${log.action === 'enrolled' ? 'text-green-600' : 'text-red-500'}`}>
                            {log.action === 'enrolled' ? '수강 등록' : '수강 취소'}
                        </span>
                        <span className="text-gray-400 text-[10px]">{log.created_at ? new Date(log.created_at).toLocaleString() : '-'}</span>
                    </div>
                    <div className="text-gray-700 mt-1 font-medium">
                        {log.classes?.name}
                    </div>
                    <div className="text-gray-500 text-[10px]">
                        {log.classes?.session || ''} {log.classes?.branch || ''}
                    </div>
                    {log.reason && <div className="text-gray-400 text-[10px] mt-0.5">사유: {log.reason}</div>}
                </div>
            ))}
        </div>
    );
}

export function StudentDetailSheet({ student, open, onOpenChange }: StudentDetailSheetProps) {
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [availableClasses, setAvailableClasses] = useState<any[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>("");
    const [isAddClassOpen, setIsAddClassOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [logRefreshKey, setLogRefreshKey] = useState(0); // Force refresh logs
    const [payment, setPayment] = useState<any>(null);
    const [attendanceData, setAttendanceData] = useState<{ logs: any[], tenureDays: number, startDate: string | null }>({ logs: [], tenureDays: 0, startDate: null });

    useEffect(() => {
        if (open && student) {
            loadEnrollments();
            loadClasses();
            loadPayment();
            loadAttendance();
            setLogRefreshKey(prev => prev + 1);
        }
    }, [open, student]);

    const loadPayment = async () => {
        if (!student) return;
        const data = await getStudentPayment(student.id);
        setPayment(data);
    };

    const loadAttendance = async () => {
        if (!student) return;
        const data = await getStudentAttendanceHistory(student.id);
        setAttendanceData(data);
    };

    const loadEnrollments = async () => {
        if (!student) return;
        setIsLoading(true);
        try {
            const data = await getStudentEnrollments(student.id);
            setEnrollments(data);
        } catch (error) {
            console.error(error);
            toast.error("수강 정보를 불러오는데 실패했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    const loadClasses = async () => {
        const data = await getAvailableClasses();
        setAvailableClasses(data);
    };

    const handleAddClass = async () => {
        if (!student || !selectedClassId) return;
        try {
            await addEnrollment(student.id, selectedClassId);
            toast.success("수강반이 추가되었습니다.");
            setIsAddClassOpen(false);
            setSelectedClassId("");
            loadEnrollments();
            setLogRefreshKey(prev => prev + 1);
        } catch (error) {
            toast.error("수강반 추가 실패");
        }
    };

    const handleRemoveClass = async (enrollmentId: string, classId: string) => {
        console.log('Attempting to delete:', { enrollmentId, classId });

        if (!enrollmentId || !classId) {
            toast.error("오류: 수업 정보가 올바르지 않습니다.");
            return;
        }

        try {
            const result = await removeEnrollment(enrollmentId, student!.id, classId, '사용자 요청 취소');

            if (result.success) {
                toast.success("수강이 취소되었습니다.");
                loadEnrollments();
                setLogRefreshKey(prev => prev + 1);
            } else {
                toast.error(`수강 취소 실패: ${result.error}`);
            }
        } catch (error: any) {
            console.error('Delete failed:', error);
            toast.error(`오류 발생: ${error.message}`);
        }
    };

    if (!student) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[600px] overflow-y-auto p-0 gap-0 border-l border-gray-100 shadow-2xl">
                {/* ... Header ... */}
                <div className="bg-white px-8 pt-10 pb-6 border-b border-gray-50">
                    <SheetHeader className="mb-6">
                        {/* ... Header Content ... */}
                        <div className="flex items-start justify-between">
                            <div className="space-y-1.5">
                                <SheetTitle className="text-4xl font-bold text-gray-900 tracking-tight">{student.name}</SheetTitle>
                                <div className="flex items-center space-x-2 text-sm text-gray-500">
                                    <span className="font-medium text-gray-700">{student.school}</span>
                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                    <span>{student.grade || '학년 미입력'}</span>
                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                    <span>{student.gender || '성별 미입력'}</span>
                                </div>
                            </div>
                            <Avatar className="h-16 w-16 border border-gray-100">
                                <AvatarImage src="" />
                                <AvatarFallback className="text-xl bg-gray-50 text-gray-600 font-medium">
                                    {student.name.slice(0, 1)}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </SheetHeader>

                    <Tabs defaultValue="info" className="w-full mt-4">
                        <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b border-gray-100 space-x-8 rounded-none">
                            <TabsTrigger
                                value="info"
                                className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-gray-900 data-[state=active]:text-gray-900 text-gray-400 font-medium text-sm transition-all shadow-none"
                            >
                                정보
                            </TabsTrigger>
                            <TabsTrigger
                                value="attendance"
                                className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-gray-900 data-[state=active]:text-gray-900 text-gray-400 font-medium text-sm transition-all shadow-none"
                            >
                                출석부
                            </TabsTrigger>
                            <TabsTrigger
                                value="counseling"
                                className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-gray-900 data-[state=active]:text-gray-900 text-gray-400 font-medium text-sm transition-all shadow-none"
                            >
                                상담 기록
                            </TabsTrigger>
                            <TabsTrigger
                                value="files"
                                className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-gray-900 data-[state=active]:text-gray-900 text-gray-400 font-medium text-sm transition-all shadow-none"
                            >
                                파일
                            </TabsTrigger>
                        </TabsList>

                        <div className="pt-8">
                            <TabsContent value="info" className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-2 focus-visible:outline-none">
                                {/* ... Info Content ... */}
                                {/* Section 1: Contact */}
                                <section className="space-y-4">
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contact & Family</h4>
                                    <div className="grid grid-cols-1 gap-0 border border-gray-100 rounded-lg divide-y divide-gray-100">
                                        <div className="flex p-4">
                                            <div className="w-32 text-sm text-gray-500">학생 연락처</div>
                                            <div className="font-mono text-sm text-gray-900">{student.student_phone || '-'}</div>
                                        </div>
                                        <div className="flex p-4">
                                            <div className="w-32 text-sm text-gray-500">부모님 성함</div>
                                            <div className="text-sm text-gray-900 font-medium">{student.parent_name}</div>
                                        </div>
                                        <div className="flex p-4">
                                            <div className="w-32 text-sm text-gray-500">부모님 연락처</div>
                                            <div className="font-mono text-sm text-gray-900">{student.parent_phone}</div>
                                        </div>
                                        <div className="flex p-4">
                                            <div className="w-32 text-sm text-gray-500">주소</div>
                                            <div className="text-sm text-gray-900 leading-snug">{student.address || '-'}</div>
                                        </div>
                                        <div className="flex p-4">
                                            <div className="w-32 text-sm text-gray-500">가입 경로</div>
                                            <div className="text-sm text-gray-900 leading-snug font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-sm inline-block">
                                                {student.registration_source || '-'}
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Section 1.5: Classes */}
                                <section className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Enrolled Classes</h4>
                                        <Dialog open={isAddClassOpen} onOpenChange={setIsAddClassOpen}>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm" className="h-7 text-xs border-dashed">
                                                    <Plus className="w-3 h-3 mr-1" /> 수업 추가
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-md">
                                                <DialogHeader>
                                                    <DialogTitle>수업 추가 등록</DialogTitle>
                                                </DialogHeader>
                                                <div className="py-4 space-y-4">
                                                    <div className="text-sm text-gray-500">
                                                        등록할 수업을 선택해주세요. (총 {availableClasses.length}개 수업)
                                                    </div>
                                                    <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                                        <SelectTrigger className="h-auto py-3">
                                                            <SelectValue placeholder="수업 선택" />
                                                        </SelectTrigger>
                                                        <SelectContent className="max-h-[300px]">
                                                            {availableClasses.map((cls) => (
                                                                <SelectItem key={cls.id} value={cls.id} className="py-3 border-b border-gray-50 last:border-0">
                                                                    <div className="flex flex-col items-start gap-1">
                                                                        <div className="flex items-center gap-2">
                                                                            {(cls.branch || cls.session) && (
                                                                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-bold border border-slate-200">
                                                                                    {cls.branch} {cls.session}
                                                                                </span>
                                                                            )}
                                                                            <span className="font-semibold text-gray-900">
                                                                                {cls.day_of_week} {cls.start_time?.slice(0, 5)}
                                                                            </span>
                                                                        </div>
                                                                        <span className="text-xs text-gray-500 truncate max-w-[300px]">
                                                                            {cls.name.replace(/\[.*?\]\s*/, '')}
                                                                        </span>
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <DialogFooter>
                                                    <Button onClick={handleAddClass} disabled={!selectedClassId}>등록하기</Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2">
                                        {isLoading ? (
                                            <div className="text-sm text-gray-400 py-2">Loading classes...</div>
                                        ) : enrollments.length === 0 ? (
                                            <div className="text-sm text-gray-400 py-2 italic">수강 중인 수업이 없습니다.</div>
                                        ) : (
                                            enrollments.map((enroll) => (
                                                <div key={enroll.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-white hover:border-gray-300 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white
                                                            ${enroll.class?.day_of_week === '월요일' ? 'bg-yellow-500' :
                                                                enroll.class?.day_of_week === '화요일' ? 'bg-orange-500' :
                                                                    enroll.class?.day_of_week === '수요일' ? 'bg-green-500' :
                                                                        enroll.class?.day_of_week === '목요일' ? 'bg-blue-500' :
                                                                            enroll.class?.day_of_week === '금요일' ? 'bg-purple-500' : 'bg-gray-500'
                                                            }`}>
                                                            {enroll.class?.day_of_week?.slice(0, 1) || '?'}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-medium text-gray-900">{enroll.class?.name}</span>
                                                                {/* Display Session/Branch Badge */}
                                                                {(enroll.class?.session || enroll.class?.branch) && (
                                                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600 font-medium">
                                                                        {enroll.class?.session} {enroll.class?.branch}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-xs text-gray-500 font-mono">
                                                                {enroll.class?.start_time?.slice(0, 5)} ~ {enroll.class?.end_time?.slice(0, 5)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50"
                                                        onClick={() => {
                                                            if (confirm("정말 이 수업을 수강 취소하시겠습니까? \n\n취소 후에도 수강 이력에는 '취소됨' 상태로 기록이 남습니다.")) {
                                                                handleRemoveClass(enroll.id, enroll.class_id);
                                                            }
                                                        }}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </section>

                                <Separator className="my-4" />

                                {/* Section 2.5: Billing */}
                                <section className="space-y-4">
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tuition & Billing</h4>
                                    <BillingCard studentId={student.id} initialPayment={payment} />
                                </section>

                                <Separator className="my-4" />

                                {/* Section 3: Enrollment History Log */}
                                <section className="space-y-4">
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Course History</h4>
                                    <EnrollmentLogList studentId={student.id} refreshKey={logRefreshKey} />
                                </section>

                                <Separator className="my-4" />

                                {/* Section 2: Details */}
                                <section className="space-y-4">
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Details & Memo</h4>
                                    <div className="grid grid-cols-1 gap-0 border border-gray-100 rounded-lg divide-y divide-gray-100">
                                        <div className="flex p-4 items-center">
                                            <div className="w-32 text-sm text-gray-500">생년월일</div>
                                            <div className="font-mono text-sm text-gray-900">{student.birth_date || '-'}</div>
                                        </div>
                                        <div className="flex p-4 items-center">
                                            <div className="w-32 text-sm text-gray-500">등록일</div>
                                            <div className="font-mono text-sm text-gray-900">
                                                {student.created_at ? new Date(student.created_at).toLocaleDateString() : '-'}
                                            </div>
                                        </div>
                                        <div className="flex flex-col p-4 space-y-2">
                                            <div className="text-sm text-gray-500">특이사항</div>
                                            <div className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap bg-gray-50 p-3 rounded-md border border-gray-100">
                                                {student.note || '메모가 없습니다.'}
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </TabsContent>

                            <TabsContent value="attendance" className="animate-in fade-in-50 slide-in-from-bottom-2 focus-visible:outline-none">
                                <StudentAttendanceTab
                                    logs={attendanceData.logs}
                                    tenureDays={attendanceData.tenureDays}
                                    startDate={attendanceData.startDate}
                                />
                            </TabsContent>

                            <TabsContent value="counseling" className="animate-in fade-in-50 slide-in-from-bottom-2 focus-visible:outline-none">
                                <div className="border border-dashed border-gray-200 rounded-lg p-12 text-center">
                                    <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                        <FileText className="w-5 h-5 text-gray-300" />
                                    </div>
                                    <h3 className="text-sm font-medium text-gray-900">No records yet</h3>
                                    <p className="text-sm text-gray-500 mt-1 mb-6">등록된 상담 기록이 없습니다.</p>
                                    <Button size="sm" variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50">
                                        기록 남기기
                                    </Button>
                                </div>
                            </TabsContent>

                            <TabsContent value="files" className="animate-in fade-in-50 slide-in-from-bottom-2 focus-visible:outline-none">
                                <div className="border border-dashed border-gray-200 rounded-lg p-12 text-center">
                                    <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                        <FileText className="w-5 h-5 text-gray-300" />
                                    </div>
                                    <h3 className="text-sm font-medium text-gray-900">No files attached</h3>
                                    <Button size="sm" variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50 mt-4">
                                        파일 업로드
                                    </Button>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </SheetContent>
        </Sheet>
    );
}

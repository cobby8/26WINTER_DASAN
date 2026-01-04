'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Baby, Phone } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";

interface StudentAttendance {
    studentId: string;
    studentName: string;
    grade: string;
    school: string;
    phone: string;
    parentPhone: string;
    enrollmentId: string;
    attendanceId: string | null;
    status: string;
    note: string;
}

interface Props {
    classId: string;
    student: StudentAttendance;
    onUpdate: (classId: string, enrollmentId: string, status: string, note: string) => void;
}

export default function AttendanceItem({ classId, student, onUpdate }: Props) {
    const [showAbsentDialog, setShowAbsentDialog] = useState(false);
    const [absentType, setAbsentType] = useState('make-up'); // 'carry-over' or 'make-up'
    const [note, setNote] = useState('');

    // Custom colors as requested: 
    // 출석(Green), 지각(Light Red), 결석(Red), 보강(Blue), 미체크(Gray)
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'present': return 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200';
            case 'late': return 'bg-red-100 text-red-600 hover:bg-red-200 border-red-200';
            case 'absent': return 'bg-red-500 text-white hover:bg-red-600 border-red-500';
            case 'makeup': return 'bg-blue-500 text-white hover:bg-blue-600 border-blue-500';
            default: return 'bg-gray-100 text-gray-500 border-gray-200'; // none
        }
    };

    const statusLabels: { [key: string]: string } = {
        'present': '출석',
        'late': '지각',
        'absent': '결석',
        'makeup': '보강',
        'none': '미체크',
    };

    const handleStatusClick = (status: string) => {
        if (status === 'absent') {
            setNote(student.note || '');
            setShowAbsentDialog(true);
        } else {
            onUpdate(classId, student.enrollmentId, status, '');
        }
    };

    const confirmAbsent = () => {
        // Combine type and note into the note field for now
        // Ideally we should have structured columns, but 'note' is specified for detail
        // We will prefix the note with the type for logic processing later
        const finalNote = `[${absentType === 'carry-over' ? '이월' : '보강'}] ${note}`;
        onUpdate(classId, student.enrollmentId, 'absent', finalNote);
        setShowAbsentDialog(false);
    };

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors gap-4 sm:gap-0">
            <div className="flex flex-col flex-1">
                <div className="flex items-baseline space-x-2 mb-1 sm:mb-0">
                    <span className="font-bold text-lg sm:text-base">{student.studentName}</span>
                    <span className="text-[12px] sm:text-[11px] text-gray-400">
                        {student.school && `${student.school} `}{student.grade}
                    </span>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <a href={`tel:${student.phone}`} className="text-xs text-gray-500 hover:text-blue-600 flex items-center bg-gray-50 px-2 py-1 sm:px-1.5 sm:py-0.5 rounded border border-gray-100">
                        <User className="h-3 w-3 mr-1 text-blue-400" />
                        {student.phone}
                    </a>
                    {student.parentPhone && (
                        <a href={`tel:${student.parentPhone}`} className="text-xs text-gray-500 hover:text-orange-600 flex items-center bg-gray-50 px-2 py-1 sm:px-1.5 sm:py-0.5 rounded border border-gray-100">
                            <Baby className="h-3 w-3 mr-1 text-orange-400" />
                            보호자
                        </a>
                    )}
                </div>
                {student.note && (
                    <div className="text-[11px] text-orange-500 mt-2 sm:mt-1 font-medium bg-orange-50 px-1.5 py-0.5 rounded inline-block w-fit">
                        {student.note}
                    </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-2">
                <div className="flex items-center justify-between sm:justify-end sm:mr-4">
                    <span className="sm:hidden text-xs text-gray-400 font-medium whitespace-nowrap">현재 상태</span>
                    <Badge variant="outline" className={`border ${getStatusColor(student.status)} text-xs px-2 py-0.5 whitespace-nowrap`}>
                        {statusLabels[student.status]}
                    </Badge>
                </div>

                <div className="grid grid-cols-4 sm:flex gap-1.5 sm:gap-1">
                    <Button
                        size="sm"
                        variant="ghost"
                        className={`h-10 sm:h-9 flex-1 sm:flex-none border border-transparent ${student.status === 'present' ? 'bg-green-100 text-green-700 border-green-200' : 'text-gray-500 bg-gray-50'}`}
                        onClick={() => handleStatusClick('present')}
                    >
                        출석
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className={`h-10 sm:h-9 flex-1 sm:flex-none border border-transparent ${student.status === 'late' ? 'bg-red-100 text-red-600 border-red-200' : 'text-gray-500 bg-gray-50'}`}
                        onClick={() => handleStatusClick('late')}
                    >
                        지각
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className={`h-10 sm:h-9 flex-1 sm:flex-none border border-transparent ${student.status === 'absent' ? 'bg-red-500 text-white hover:bg-red-600' : 'text-gray-500 bg-gray-50'}`}
                        onClick={() => handleStatusClick('absent')}
                    >
                        결석
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className={`h-10 sm:h-9 flex-1 sm:flex-none border border-transparent ${student.status === 'makeup' ? 'bg-blue-500 text-white hover:bg-blue-600' : 'text-gray-500 bg-gray-50'}`}
                        onClick={() => handleStatusClick('makeup')}
                    >
                        보강
                    </Button>
                </div>
            </div>

            {/* Absent Dialog */}
            <Dialog open={showAbsentDialog} onOpenChange={setShowAbsentDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>결석 처리</DialogTitle>
                        <DialogDescription>
                            결석 사유와 처리 방식을 선택해주세요.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <RadioGroup value={absentType} onValueChange={setAbsentType}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="carry-over" id="r1" />
                                <Label htmlFor="r1">이월 (수강료 차감)</Label>
                            </div>
                            <div className="ml-6 text-sm text-gray-500">
                                경조사, 질병 등. 다음 달 수강료에서 1회분이 차감됩니다.
                            </div>

                            <div className="flex items-center space-x-2 mt-2">
                                <RadioGroupItem value="make-up" id="r2" />
                                <Label htmlFor="r2">보강 (보강권 지급)</Label>
                            </div>
                            <div className="ml-6 text-sm text-gray-500">
                                개인 사정. 수강료 차감 없이 보강 수업을 잡아야 합니다.
                            </div>
                        </RadioGroup>

                        <div className="grid grid-cols-4 items-center gap-4 mt-4">
                            <Label htmlFor="note" className="text-right">
                                사유/메모
                            </Label>
                            <Input
                                id="note"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="col-span-3"
                                placeholder="결석 사유 입력"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAbsentDialog(false)}>취소</Button>
                        <Button onClick={confirmAbsent}>확인</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

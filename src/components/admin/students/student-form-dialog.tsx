
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { createStudent, updateStudent } from '@/app/actions/student-actions';
import ShuttleScheduleManager from '../shuttle/shuttle-schedule-manager';
import { ShuttleSchedule } from '@/app/actions/shuttle-actions';

interface StudentFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    student?: any; // If present, Edit mode
    onSuccess?: () => void;
}

export function StudentFormDialog({ open, onOpenChange, student, onSuccess }: StudentFormDialogProps) {
    const isEdit = !!student;
    const [loading, setLoading] = useState(false);

    // Initial State
    const [formData, setFormData] = useState({
        name: '',
        school: '',
        grade: '',
        student_phone: '',
        parent_name: '',
        parent_phone: ''
    });

    // Reset or Populate on Open
    useEffect(() => {
        if (open) {
            if (student) {
                setFormData({
                    name: student.name || '',
                    school: student.school || '',
                    grade: student.grade || '',
                    student_phone: student.student_phone || '',
                    parent_name: student.parent_name || '',
                    parent_phone: student.parent_phone || ''
                });
            } else {
                setFormData({
                    name: '',
                    school: '',
                    grade: '',
                    student_phone: '',
                    parent_name: '',
                    parent_phone: ''
                });
            }
        }
    }, [open, student]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const [schedules, setSchedules] = useState<Partial<ShuttleSchedule>[]>([]);

    useEffect(() => {
        if (open) {
            if (student) {
                setSchedules(student.shuttle_schedules || []);
            } else {
                setSchedules([]);
            }
        }
    }, [open, student]);

    // ... existing formData state ...

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!formData.name) {
                toast.error('학생 이름은 필수입니다.');
                setLoading(false);
                return;
            }

            let result;
            if (isEdit) {
                result = await updateStudent(student.id, formData);
                // Schedules are handled by Manager component independently in Edit mode
            } else {
                // Pass collected schedules to create action
                result = await createStudent({ ...formData, schedules });
            }

            if (result.success) {
                toast.success(isEdit ? '학생 정보가 수정되었습니다.' : '학생이 등록되었습니다.');
                onOpenChange(false);
                if (onSuccess) onSuccess();
            } else {
                toast.error(result.error || '작업 실패');
            }
        } catch (error) {
            console.error(error);
            toast.error('오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? '학생 정보 수정' : '학생 등록'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">이름 *</Label>
                            <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="학생 이름" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="school">학교</Label>
                            <Input id="school" name="school" value={formData.school} onChange={handleChange} placeholder="학교명" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="grade">학년</Label>
                            <Input id="grade" name="grade" value={formData.grade} onChange={handleChange} placeholder="예: 초3" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="student_phone">학생 연락처</Label>
                            <Input id="student_phone" name="student_phone" value={formData.student_phone} onChange={handleChange} placeholder="010-0000-0000" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="parent_name">학부모 이름</Label>
                            <Input id="parent_name" name="parent_name" value={formData.parent_name} onChange={handleChange} placeholder="학부모 성함" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="parent_phone">학부모 연락처</Label>
                            <Input id="parent_phone" name="parent_phone" value={formData.parent_phone} onChange={handleChange} placeholder="010-0000-0000" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-blue-600 font-semibold">셔틀 스케줄 관리</Label>
                        <ShuttleScheduleManager
                            schedules={schedules}
                            studentId={student?.id}
                            onUpdate={!isEdit ? setSchedules : undefined}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            * 스케줄을 추가하면 청구서 생성 시 셔틀비가 자동으로 계산됩니다.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? '저장 중...' : (isEdit ? '수정 완료' : '등록 완료')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

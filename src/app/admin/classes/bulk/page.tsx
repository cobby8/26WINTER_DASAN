'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { deleteClass } from '@/app/actions/student-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Save, ArrowLeft, RefreshCw, Check, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface ClassData {
    id: string;
    name: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
    capacity: number;
    tuition: number;
    start_date?: string;
    end_date?: string;
}

export default function BulkEditClassesPage() {
    const router = useRouter();
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Bulk Input States
    const [bulkStartTime, setBulkStartTime] = useState('');
    const [bulkDuration, setBulkDuration] = useState(''); // Default empty to allow independent updates
    const [bulkCapacity, setBulkCapacity] = useState('');
    const [bulkTuition, setBulkTuition] = useState('');
    const [bulkStartDate, setBulkStartDate] = useState('');
    const [bulkEndDate, setBulkEndDate] = useState('');

    // Tracking modified rows for validation/saving
    const [modifiedIds, setModifiedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('classes')
            .select('*')
            .order('day_of_week')
            .order('start_time');

        if (error) {
            console.error('Error fetching classes:', error);
            alert('수업 정보를 불러오지 못했습니다.');
        } else {
            const safeData = data?.map(c => ({
                ...c,
                tuition: c.tuition || 0,
                start_date: c.start_date || '',
                end_date: c.end_date || ''
            })) || [];
            setClasses(safeData);
        }
        setLoading(false);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(classes.map(c => c.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectRow = (id: string, checked: boolean) => {
        const newSet = new Set(selectedIds);
        if (checked) newSet.add(id);
        else newSet.delete(id);
        setSelectedIds(newSet);
    };

    const calculateEndTime = (start: string, durationMin: string) => {
        if (!start || !durationMin) return '';

        // Handle HH:MM:SS (from DB) or HH:MM (from input)
        // Ensure we only look at the refined HH:MM part
        const timeStr = start.length > 5 ? start.substring(0, 5) : start;
        const [h, m] = timeStr.split(':').map(Number);

        const totalMin = h * 60 + m + parseInt(durationMin);
        const endH = Math.floor(totalMin / 60) % 24;
        const endM = totalMin % 60;

        return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    };

    const applyBulkChanges = () => {
        if (selectedIds.size === 0) {
            toast.error('선택된 수업이 없습니다.');
            return;
        }

        let changedCount = 0;
        const newModifiedIds = new Set(modifiedIds);

        const newClasses = classes.map(c => {
            if (selectedIds.has(c.id)) {
                let hasChanges = false;
                const newItem = { ...c };

                // 1. Update Start Time
                if (bulkStartTime) {
                    newItem.start_time = bulkStartTime;
                    hasChanges = true;
                }

                // 2. Update End Time (Duration)
                // If bulkDuration is set, calculate new end time
                // Use new start_time if we just updated it, otherwise use existing start_time
                if (bulkDuration) {
                    const baseTime = bulkStartTime || c.start_time;
                    const newEnd = calculateEndTime(baseTime, bulkDuration);

                    if (newEnd && newEnd !== c.end_time) {
                        newItem.end_time = newEnd;
                        hasChanges = true;
                    }
                }

                // 3. Update Capacity
                if (bulkCapacity) {
                    const val = parseInt(bulkCapacity);
                    if (!isNaN(val) && val !== c.capacity) {
                        newItem.capacity = val;
                        hasChanges = true;
                    }
                }

                // 4. Update Tuition
                if (bulkTuition) {
                    const val = parseInt(bulkTuition);
                    if (!isNaN(val) && val !== c.tuition) {
                        newItem.tuition = val;
                        hasChanges = true;
                    }
                }

                // 5. Update Dates
                if (bulkStartDate) {
                    newItem.start_date = bulkStartDate;
                    hasChanges = true;
                }
                if (bulkEndDate) {
                    newItem.end_date = bulkEndDate;
                    hasChanges = true;
                }

                if (hasChanges) {
                    newModifiedIds.add(c.id);
                    changedCount++;
                    return newItem;
                }
            }
            return c;
        });

        if (changedCount > 0) {
            setClasses(newClasses);
            setModifiedIds(newModifiedIds);
            toast.success(`${changedCount}개 수업이 변경되었습니다.`);
        } else {
            toast.info('변경할 값을 입력해주세요.');
        }
    };

    const handleSave = async () => {
        if (modifiedIds.size === 0) return;
        setSaving(true);

        const updates = classes.filter(c => modifiedIds.has(c.id)).map(c => ({
            id: c.id,
            start_time: c.start_time,
            end_time: c.end_time,
            capacity: c.capacity,
            tuition: c.tuition,
            start_date: c.start_date || null,
            end_date: c.end_date || null
        }));

        let hasError = false;
        for (const update of updates) {
            const { error } = await supabase.from('classes').update({
                start_time: update.start_time,
                end_time: update.end_time,
                capacity: update.capacity,
                tuition: update.tuition,
                start_date: update.start_date,
                end_date: update.end_date
            }).eq('id', update.id);

            if (error) {
                console.error(`Failed to update class ${update.id}`, error);
                hasError = true;
            }
        }

        if (hasError) {
            alert('일부 업데이트 중 오류가 발생했습니다.');
        } else {
            alert('성공적으로 저장되었습니다.');
            setModifiedIds(new Set());
            setSelectedIds(new Set()); // Clear selection
            router.refresh();
        }
        setSaving(false);
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;

        const confirmMessage = `선택한 ${selectedIds.size}개의 수업을 정말로 삭제하시겠습니까?\n\n주의: 수강생 내역 및 모든 출석 기록이 영구적으로 삭제되며 이 작업은 되돌릴 수 없습니다.`;
        if (!confirm(confirmMessage)) return;

        setDeleting(true);
        let successCount = 0;
        let failCount = 0;

        try {
            const idsToDelete = Array.from(selectedIds);
            for (const id of idsToDelete) {
                const result = await deleteClass(id);
                if (result.success) {
                    successCount++;
                } else {
                    console.error(`Failed to delete class ${id}:`, result.error);
                    failCount++;
                }
            }

            if (failCount > 0) {
                alert(`${successCount}개 삭제 성공, ${failCount}개 삭제 실패하였습니다.`);
            } else {
                alert(`선택한 ${successCount}개의 수업이 성공적으로 삭제되었습니다.`);
            }

            // Re-fetch data
            fetchClasses();
            setSelectedIds(new Set());
            setModifiedIds(new Set());
            router.refresh();
        } catch (error: any) {
            alert(`삭제 중 예기치 못한 오류가 발생했습니다: ${error.message}`);
        } finally {
            setDeleting(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ko-KR').format(amount);
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/admin/classes">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                    </Button>
                    <h2 className="text-3xl font-bold tracking-tight">수업 일괄 수정</h2>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 mr-2">
                        {modifiedIds.size}개 항목 수정됨
                    </span>
                    <Button
                        variant="destructive"
                        onClick={handleBulkDelete}
                        disabled={deleting || selectedIds.size === 0}
                        className="mr-2"
                    >
                        {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                        선택 삭제 (수강생 포함)
                    </Button>
                    <Button onClick={handleSave} disabled={saving || modifiedIds.size === 0} className="bg-blue-600 hover:bg-blue-700">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        변경 사항 저장
                    </Button>
                </div>
            </div>

            {/* Default Control Panel */}
            <div className="bg-gray-100 p-4 rounded-lg border space-y-4">
                <div className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                    <RefreshCw className="w-4 h-4" />
                    <span>일괄 적용 도구 ({selectedIds.size}개 선택됨)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-2 space-y-1">
                        <Label>시작 시간</Label>
                        <Input type="time" value={bulkStartTime} onChange={(e) => setBulkStartTime(e.target.value)} />
                    </div>
                    <div className="md:col-span-4 space-y-1">
                        <Label>수업 시간 (분)</Label>
                        <div className="flex space-x-2">
                            {[60, 80, 90, 120].map(min => (
                                <Button
                                    key={min}
                                    variant={bulkDuration === min.toString() ? "default" : "outline"}
                                    size="sm"
                                    className={`flex-1 ${bulkDuration === min.toString() ? "bg-slate-700 hover:bg-slate-800" : ""}`}
                                    onClick={() => setBulkDuration(min.toString())}
                                >
                                    {min}분
                                </Button>
                            ))}
                        </div>
                    </div>
                    <div className="md:col-span-2 space-y-1">
                        <Label>정원 (명)</Label>
                        <Input type="number" placeholder="20" value={bulkCapacity} onChange={(e) => setBulkCapacity(e.target.value)} />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                        <Label>수업료 (원)</Label>
                        <Input type="number" placeholder="300000" value={bulkTuition} onChange={(e) => setBulkTuition(e.target.value)} />
                    </div>

                    {/* New Date Fields */}
                    <div className="md:col-span-2 space-y-1">
                        <Label>수업 시작일</Label>
                        <Input type="date" value={bulkStartDate} onChange={(e) => setBulkStartDate(e.target.value)} />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                        <Label>수업 종료일</Label>
                        <Input type="date" value={bulkEndDate} onChange={(e) => setBulkEndDate(e.target.value)} />
                    </div>

                    <div className="md:col-span-8">
                        {/* Spacer */}
                    </div>

                    <div className="md:col-span-12">
                        <Button
                            onClick={applyBulkChanges}
                            disabled={selectedIds.size === 0}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Check className="w-4 h-4 mr-2" />
                            선택 적용
                        </Button>
                    </div>
                </div>
                <p className="text-xs text-gray-500">
                    * 시작 시간과 수업 시간(분)을 설정하면 종료 시간이 자동으로 계산됩니다. 빈 칸으로 둔 항목은 변경되지 않습니다.
                </p>
            </div>

            <div className="rounded-md border bg-white overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={selectedIds.size === classes.length && classes.length > 0}
                                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                />
                            </TableHead>
                            <TableHead className="w-[80px]">요일</TableHead>
                            <TableHead className="w-[200px]">강좌명</TableHead>
                            <TableHead className="w-[120px]">시작</TableHead>
                            <TableHead className="w-[120px]">종료</TableHead>
                            <TableHead className="w-[80px]">정원</TableHead>
                            <TableHead className="w-[100px]">수업료</TableHead>
                            <TableHead className="w-[110px]">시작일</TableHead>
                            <TableHead className="w-[110px]">종료일</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {classes.map((cls) => (
                            <TableRow key={cls.id} className={modifiedIds.has(cls.id) ? "bg-blue-50" : ""}>
                                <TableCell>
                                    <Checkbox
                                        checked={selectedIds.has(cls.id)}
                                        onCheckedChange={(checked) => handleSelectRow(cls.id, checked as boolean)}
                                    />
                                </TableCell>
                                <TableCell className="font-medium text-gray-500">{cls.day_of_week}</TableCell>
                                <TableCell className="text-gray-500 text-sm">{cls.name}</TableCell>
                                <TableCell>{cls.start_time}</TableCell>
                                <TableCell>{cls.end_time}</TableCell>
                                <TableCell>{cls.capacity}</TableCell>
                                <TableCell>{formatCurrency(cls.tuition)}원</TableCell>
                                <TableCell className="text-xs">{cls.start_date || '-'}</TableCell>
                                <TableCell className="text-xs">{cls.end_date || '-'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

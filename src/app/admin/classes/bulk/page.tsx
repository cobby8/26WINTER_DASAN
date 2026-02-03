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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

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
    registeredCount: number; // New field
    branch?: string; // For filtering
    session?: string; // For filtering
}

export default function BulkEditClassesPage() {
    const router = useRouter();
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Filter States
    const [filterBranch, setFilterBranch] = useState<string>('all');
    const [filterSession, setFilterSession] = useState<string>('all');
    const [filterDay, setFilterDay] = useState<string>('all');
    const [searchName, setSearchName] = useState<string>('');

    // Selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Bulk Input States
    const [bulkStartTime, setBulkStartTime] = useState('');
    const [bulkDuration, setBulkDuration] = useState('');
    const [bulkCapacity, setBulkCapacity] = useState('');
    const [bulkTuition, setBulkTuition] = useState('');
    const [bulkStartDate, setBulkStartDate] = useState('');
    const [bulkEndDate, setBulkEndDate] = useState('');

    const [modifiedIds, setModifiedIds] = useState<Set<string>>(new Set());

    // Derived values for filters
    const uniqueBranches = Array.from(new Set(classes.map(c => c.branch).filter(Boolean))).sort();
    const uniqueSessions = Array.from(new Set(classes.map(c => c.session).filter(Boolean))).sort();
    const days = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];

    // Filter Logic
    const filteredClasses = classes.filter(cls => {
        if (filterBranch !== 'all' && cls.branch !== filterBranch) return false;
        if (filterSession !== 'all' && cls.session !== filterSession) return false;
        if (filterDay !== 'all' && cls.day_of_week !== filterDay) return false;
        if (searchName && !cls.name.toLowerCase().includes(searchName.toLowerCase())) return false;
        return true;
    });

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        setLoading(true);

        // 1. Fetch Classes
        const { data: classData, error: classError } = await supabase
            .from('classes')
            .select('*')
            .is('deleted_at', null)
            .order('day_of_week')
            .order('start_time');

        if (classError) {
            console.error('Error fetching classes:', classError);
            alert('수업 정보를 불러오지 못했습니다.');
            setLoading(false);
            return;
        }

        // 2. Fetch Enrollments for Counts
        const { data: enrollments, error: enrollError } = await supabase
            .from('enrollments')
            .select('class_id')
            .eq('status', 'active');

        const counts: { [key: string]: number } = {};
        if (enrollments) {
            enrollments.forEach(e => {
                counts[e.class_id] = (counts[e.class_id] || 0) + 1;
            });
        }

        const safeData = classData?.map(c => ({
            ...c,
            tuition: c.tuition || 0,
            start_date: c.start_date || '',
            end_date: c.end_date || '',
            registeredCount: counts[c.id] || 0
        })) || [];

        setClasses(safeData);
        setLoading(false);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            // Select only filtered classes
            setSelectedIds(new Set(filteredClasses.map(c => c.id)));
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

                if (bulkStartTime) {
                    newItem.start_time = bulkStartTime;
                    hasChanges = true;
                }
                if (bulkDuration) {
                    const baseTime = bulkStartTime || c.start_time;
                    const newEnd = calculateEndTime(baseTime, bulkDuration);
                    if (newEnd && newEnd !== c.end_time) {
                        newItem.end_time = newEnd;
                        hasChanges = true;
                    }
                }
                if (bulkCapacity) {
                    const val = parseInt(bulkCapacity);
                    if (!isNaN(val) && val !== c.capacity) {
                        newItem.capacity = val;
                        hasChanges = true;
                    }
                }
                if (bulkTuition) {
                    const val = parseInt(bulkTuition);
                    if (!isNaN(val) && val !== c.tuition) {
                        newItem.tuition = val;
                        hasChanges = true;
                    }
                }
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
                        선택 삭제
                    </Button>
                    <Button onClick={handleSave} disabled={saving || modifiedIds.size === 0} className="bg-blue-600 hover:bg-blue-700">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        변경 사항 저장
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-lg border">
                <div className="w-[150px]">
                    <Select value={filterBranch} onValueChange={setFilterBranch}>
                        <SelectTrigger>
                            <SelectValue placeholder="지점 선택" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">모든 지점</SelectItem>
                            {uniqueBranches.map(b => (
                                <SelectItem key={b as string} value={b as string}>{b}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-[150px]">
                    <Select value={filterSession} onValueChange={setFilterSession}>
                        <SelectTrigger>
                            <SelectValue placeholder="차수 선택" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">모든 차수</SelectItem>
                            {uniqueSessions.map(s => (
                                <SelectItem key={s as string} value={s as string}>{s}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-[150px]">
                    <Select value={filterDay} onValueChange={setFilterDay}>
                        <SelectTrigger>
                            <SelectValue placeholder="요일 선택" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">모든 요일</SelectItem>
                            {days.map(d => (
                                <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex-1 min-w-[200px]">
                    <Input
                        placeholder="강좌명 검색..."
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                    />
                </div>

                <div className="flex items-center text-sm text-gray-500">
                    {filteredClasses.length}개 / 전체 {classes.length}개
                </div>
            </div>

            {/* Control Panel */}
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
                                    checked={selectedIds.size === filteredClasses.length && filteredClasses.length > 0}
                                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                />
                            </TableHead>
                            <TableHead className="w-[80px]">요일</TableHead>
                            <TableHead className="w-[80px]">분반</TableHead>
                            <TableHead className="w-[200px]">강좌명</TableHead>
                            <TableHead className="w-[100px] text-right">등록/정원</TableHead>
                            <TableHead className="w-[100px]">시작</TableHead>
                            <TableHead className="w-[100px]">종료</TableHead>
                            <TableHead className="w-[100px]">수업료</TableHead>
                            <TableHead className="w-[110px]">시작일</TableHead>
                            <TableHead className="w-[110px]">종료일</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredClasses.length > 0 ? (
                            filteredClasses.map((cls) => (
                                <TableRow key={cls.id} className={modifiedIds.has(cls.id) ? "bg-blue-50" : ""}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedIds.has(cls.id)}
                                            onCheckedChange={(checked) => handleSelectRow(cls.id, checked as boolean)}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-500">{cls.day_of_week}</TableCell>
                                    <TableCell className="text-xs">
                                        {(cls.branch || cls.session) ? (
                                            <div className="flex flex-col gap-1">
                                                {cls.branch && <span className="bg-blue-100 text-blue-700 px-1 rounded text-center">{cls.branch}</span>}
                                                {cls.session && <span className="bg-purple-100 text-purple-700 px-1 rounded text-center">{cls.session}</span>}
                                            </div>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell className="text-gray-500 text-sm">{cls.name}</TableCell>
                                    {/* Registered / Capacity */}
                                    <TableCell className="text-right">
                                        <span className={`font-bold ${cls.registeredCount >= cls.capacity ? 'text-red-500' : 'text-green-600'}`}>
                                            {cls.registeredCount}
                                        </span>
                                        <span className="text-gray-400 mx-1">/</span>
                                        <span className="text-gray-600">{cls.capacity}</span>
                                    </TableCell>
                                    <TableCell>{cls.start_time}</TableCell>
                                    <TableCell>{cls.end_time}</TableCell>
                                    <TableCell>{formatCurrency(cls.tuition)}원</TableCell>
                                    <TableCell className="text-xs">{cls.start_date || '-'}</TableCell>
                                    <TableCell className="text-xs">{cls.end_date || '-'}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={10} className="h-24 text-center text-gray-500">
                                    검색 결과가 없습니다.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

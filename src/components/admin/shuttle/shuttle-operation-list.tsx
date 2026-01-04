'use client';

import { useState, useEffect, useRef } from 'react';
import { DailyShuttleItem } from '@/app/actions/shuttle-ops-actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Phone, MapPin, User, Baby, Map as MapIcon, Mic, Check, X, Clock, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

// --- Components ---
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    updateShuttleException,
    updateShuttleRouteOrder,
    deleteDailyShuttle,
    addShuttleAcademyStop,
    updateShuttleRouteSection,
    updateShuttleScheduleInfo,
    updateShuttleStatus
} from '@/app/actions/shuttle-ops-actions';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
    items: DailyShuttleItem[];
    dateStr: string;
}

// --- Constants ---
const ACADEMY_LOCATION = {
    name: "다산 센터",
    address: "경기 남양주시 다산중앙로 123", // Placeholder
    lat: 37.6254, // Placeholder for Dasan
    lng: 127.1485
};

// --- Components ---

const StatusSelector = ({ currentStatus, onUpdate }: { currentStatus: string, onUpdate: (val: string) => void }) => {
    const options = [
        { value: 'pending', label: '대기', activeClass: 'bg-slate-100 text-slate-600 font-bold ring-1 ring-slate-300' },
        { value: 'boarded', label: '탑승', activeClass: 'bg-blue-100 text-blue-700 font-bold ring-1 ring-blue-300' },
        { value: 'missed', label: '미탑승', activeClass: 'bg-red-100 text-red-600 font-bold ring-1 ring-red-300' },
        { value: 'self_commute', label: '자차', activeClass: 'bg-purple-100 text-purple-700 font-bold ring-1 ring-purple-300' },
    ];

    return (
        <div className="flex items-center gap-1 justify-center">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    onClick={() => onUpdate(opt.value)}
                    className={`px-2 py-1.5 rounded-md text-xs transition-all ${currentStatus === opt.value
                        ? opt.activeClass
                        : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                        }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
};

const MemoCell = ({ initialNote, onSave }: { initialNote: string, onSave: (note: string) => void }) => {
    const [note, setNote] = useState(initialNote || '');
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        setNote(initialNote || '');
    }, [initialNote]);

    const handleBlur = () => {
        if (note !== initialNote) {
            onSave(note);
        }
    };

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        if ('webkitSpeechRecognition' in window) {
            const recognition = new (window as any).webkitSpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'ko-KR';

            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);
            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                const newNote = note ? `${note} ${transcript}` : transcript;
                setNote(newNote);
                onSave(newNote);
            };

            recognitionRef.current = recognition;
            recognition.start();
        } else {
            toast.error("이 브라우저는 음성 인식을 지원하지 않습니다.");
        }
    };

    return (
        <div className="relative flex items-center">
            <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onBlur={handleBlur}
                className="h-8 text-xs pr-8"
                placeholder="메모..."
            />
            <button
                onClick={toggleListening}
                className={`absolute right-2 p-1 rounded-full ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <Mic className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}

// --- Time Edit Component ---

const TimeEditDialog = ({
    isOpen,
    onClose,
    item,
    dateStr,
    onSave
}: {
    isOpen: boolean,
    onClose: () => void,
    item: DailyShuttleItem,
    dateStr: string,
    onSave: (scheduleId: string | null) => void
}) => {
    const [time, setTime] = useState(item.actual_time || item.time);
    const [isCancelled, setIsCancelled] = useState(!!item.is_cancelled);
    const [locationName, setLocationName] = useState(item.location_name);
    const [locationAddress, setLocationAddress] = useState(item.location_address);
    const [updateMasterTime, setUpdateMasterTime] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        setTime(item.actual_time || item.time);
        setIsCancelled(!!item.is_cancelled);
        setLocationName(item.location_name);
        setLocationAddress(item.location_address);
        setUpdateMasterTime(false);
        setShowDeleteConfirm(false);
    }, [item]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            let timeToSend: string | null = time;
            if (time === item.time && !isCancelled) timeToSend = null;

            const isAcademyStop = !item.student_id;
            let res;

            if (isAcademyStop) {
                // For academy stops, we update the MASTER schedule time too
                res = await updateShuttleException(item.schedule_id, item.student_id, dateStr, time, isCancelled);
                await updateShuttleScheduleInfo(item.schedule_id, {
                    location_name: locationName,
                    location_address: locationAddress,
                    time: time
                });
            } else {
                const resExc = await updateShuttleException(item.schedule_id, item.student_id, dateStr, timeToSend, isCancelled);
                res = resExc;

                const infoUpdates: any = {};
                if (locationName !== item.location_name) infoUpdates.location_name = locationName;
                if (locationAddress !== item.location_address) infoUpdates.location_address = locationAddress;
                if (updateMasterTime) infoUpdates.time = time;

                if (Object.keys(infoUpdates).length > 0) {
                    await updateShuttleScheduleInfo(item.schedule_id, infoUpdates);
                }
            }

            if (res.success) {
                toast.success("스케줄이 업데이트되었습니다.");
                onSave(item.schedule_id);
                onClose();
            } else {
                toast.error("업데이트 실패: " + res.error);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handlePermanentDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await deleteDailyShuttle(item.schedule_id, dateStr);
            if (res.success) {
                toast.success('영구 삭제되었습니다.');
                onSave(null);
                window.location.reload();
            } else {
                toast.error('삭제 실패: ' + res.error);
                setShowDeleteConfirm(false);
            }
        } catch (err: any) {
            toast.error('오류 발생: ' + err.message);
            setShowDeleteConfirm(false);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-xs rounded-xl overflow-hidden p-0 border-none shadow-2xl">
                {!showDeleteConfirm ? (
                    <>
                        <DialogHeader className="p-4 bg-slate-50 border-b">
                            <DialogTitle className="text-lg font-bold text-slate-800">{item.student_name} 설정</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 p-4 py-6">
                            <div className="flex items-center gap-4">
                                <Label htmlFor="time" className="w-16 text-sm font-semibold text-slate-500">시간</Label>
                                <div className="flex-1 flex flex-col gap-1">
                                    <Input
                                        id="time"
                                        type="time"
                                        value={time.substring(0, 5)}
                                        onChange={(e) => setTime(e.target.value + ":00")}
                                        disabled={isCancelled}
                                        className="h-10 border-slate-200"
                                    />
                                    {!isCancelled && (
                                        <div className="flex items-center gap-1.5 px-1 py-0.5">
                                            <Checkbox
                                                id="master-time"
                                                checked={updateMasterTime}
                                                onCheckedChange={(c) => setUpdateMasterTime(!!c)}
                                                className="h-3.5 w-3.5 border-blue-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                            />
                                            <Label htmlFor="master-time" className="text-[10px] text-blue-600 font-bold cursor-pointer">
                                                기본 시간도 함께 변경 (마스터)
                                            </Label>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <Label className="w-16 text-sm font-semibold text-slate-500">장소명</Label>
                                <Input
                                    value={locationName}
                                    onChange={(e) => setLocationName(e.target.value)}
                                    className="flex-1 h-10 border-slate-200"
                                />
                            </div>
                            <div className="flex items-center gap-4">
                                <Label className="w-16 text-sm font-semibold text-slate-500">주소</Label>
                                <Input
                                    value={locationAddress}
                                    onChange={(e) => setLocationAddress(e.target.value)}
                                    className="flex-1 h-10 text-xs border-slate-200"
                                />
                            </div>

                            <div className="flex items-center gap-2 mt-2 p-3 bg-red-50 rounded-lg border border-red-100">
                                <Checkbox
                                    id="cancel"
                                    checked={isCancelled}
                                    onCheckedChange={(c) => setIsCancelled(!!c)}
                                    className="border-red-300 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                                />
                                <Label htmlFor="cancel" className="text-red-600 font-bold cursor-pointer text-sm">
                                    운행 취소 / 결석 (Skip)
                                </Label>
                            </div>
                        </div>
                        <DialogFooter className="flex flex-row justify-between items-center p-4 bg-slate-50 border-t gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 font-bold"
                            >
                                영구 삭제
                            </Button>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={onClose} className="border-slate-300">취소</Button>
                                <Button type="button" size="sm" onClick={handleSave} disabled={isSaving} className="bg-slate-900 hover:bg-slate-800 px-6">
                                    {isSaving ? '저장 중...' : '저장'}
                                </Button>
                            </div>
                        </DialogFooter>
                    </>
                ) : (
                    <div className="p-6 text-center animate-in fade-in zoom-in duration-200">
                        <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                            <X className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">정말로 삭제하시겠습니까?</h3>
                        <p className="text-sm text-slate-500 mb-6">
                            이 스케줄은 영구적으로 삭제되며,<br />
                            구글 시트에서도 '삭제'로 표시됩니다.
                        </p>
                        <div className="flex flex-col gap-2">
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={handlePermanentDelete}
                                disabled={isDeleting}
                                className="w-full h-12 text-base font-bold bg-red-600 hover:bg-red-700"
                            >
                                {isDeleting ? '삭제 중...' : '확인, 영구 삭제'}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                                className="w-full h-10 text-slate-500"
                            >
                                돌아가기
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog >
    );
};

// --- Sortable Row Component ---
const SortableShuttleRow = ({ item, isReorderMode, children }: { item: DailyShuttleItem, isReorderMode: boolean, children: any }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: item.schedule_id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    if (!isReorderMode) {
        return <>{children}</>; // Normal render without wrapper if not reordering? Or just wrapper without listeners?
        // Better to return children directly to keep Table structure clean, but we might need wrapper for table rows.
        // Actually, dnd-kit sortable usually wraps the entire item. 
        // Let's just wrap the TableRow in the main component.
        // Wait, TableRow must be direct child of TableBody? No. 
        // But SortableContext expects items.
        // Let's attach ref to TableRow.
    }

    return (
        <TableRow
            ref={setNodeRef}
            style={style}
            {...attributes}
            className={`bg-white ${item.is_cancelled ? 'opacity-60' : ''}`}
        >
            {/* Drag Handle Column */}
            <TableCell className="w-[40px] px-1 text-center">
                <div {...listeners} className="cursor-grab touch-none p-2 hover:bg-slate-100 rounded">
                    <GripVertical className="h-4 w-4 text-slate-400" />
                </div>
            </TableCell>
            {children}
        </TableRow>
    );
};

// --- Main Component ---

export default function ShuttleOperationList({ items, dateStr }: Props) {
    const router = useRouter();
    const [localItems, setLocalItems] = useState<DailyShuttleItem[]>(items);

    // Edit Dialog State
    const [editingItem, setEditingItem] = useState<DailyShuttleItem | null>(null);

    // Reorder State
    const [isReorderMode, setIsReorderMode] = useState(false);
    const [isSavingOrder, setIsSavingOrder] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        // Sort items by time primarily as requested by user
        const sorted = [...items].sort((a, b) => {
            const timeA = a.actual_time || a.time;
            const timeB = b.actual_time || b.time;

            if (timeA !== timeB) {
                return timeA.localeCompare(timeB);
            }

            // If times are equal, fall back to sequence_order
            if (a.sequence_order !== undefined && b.sequence_order !== undefined) {
                return a.sequence_order - b.sequence_order;
            }
            return 0;
        });
        setLocalItems(sorted);
    }, [items]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            setLocalItems((items) => {
                const oldIndex = items.findIndex((item) => item.schedule_id === active.id);
                const newIndex = items.findIndex((item) => item.schedule_id === over?.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleSaveOrder = async () => {
        setIsSavingOrder(true);
        try {
            const res = await updateShuttleRouteOrder(localItems, dateStr);
            if (res.success) {
                toast.success('경로 순서가 저장되었습니다.');
                setIsReorderMode(false);
            } else {
                toast.error('저장 실패: ' + res.error);
            }
        } catch (e) {
            toast.error('저장 중 오류 발생');
        } finally {
            setIsSavingOrder(false);
        }
    };

    const handleStatusUpdate = async (scheduleId: string, studentId: string, newStatus: string) => {
        const targetItem = localItems.find(i => i.schedule_id === scheduleId);
        if (!targetItem) return;

        const updatedItem = { ...targetItem, current_status: newStatus as any };
        setLocalItems(prev => prev.map(item => item.schedule_id === scheduleId ? updatedItem : item));

        const res = await updateShuttleStatus(scheduleId, studentId, dateStr, newStatus as any, targetItem.note);

        if (res.success) {
            toast.success('상태가 업데이트되었습니다.');
        } else {
            toast.error('업데이트 실패: ' + res.error);
            setLocalItems(items); // Rollback
        }
    };

    const handleNoteUpdate = async (scheduleId: string, studentId: string, newNote: string) => {
        const targetItem = localItems.find(i => i.schedule_id === scheduleId);
        if (!targetItem) return;

        const updatedItem = { ...targetItem, note: newNote };
        setLocalItems(prev => prev.map(item => item.schedule_id === scheduleId ? updatedItem : item));

        const res = await updateShuttleStatus(scheduleId, studentId, dateStr, targetItem.current_status, newNote);
        if (!res.success) {
            toast.error('메모 저장 실패');
        }
    }

    const handleAddAcademyStop = async (
        branchId: 1 | 2,
        sequenceOrder: number,
        stopType: 'academy_start' | 'academy_end' = 'academy_end',
        baseTime: string = '00:00:00'
    ) => {
        try {
            // Helper to add 5 minutes to baseTime (HH:MM:SS)
            let finalTime = baseTime;
            if (baseTime && baseTime !== '00:00:00') {
                const [h, m, s] = baseTime.split(':').map(Number);
                const date = new Date();
                date.setHours(h, m + 5, s || 0);
                finalTime = date.toTimeString().split(' ')[0]; // HH:MM:SS
            }

            const res = await addShuttleAcademyStop(dateStr, branchId, sequenceOrder, stopType, finalTime);
            if (res.success) {
                const label = stopType === 'academy_start' ? '학원출발' : '학원도착';
                const timeLabel = finalTime !== '00:00:00' ? ` (${finalTime.substring(0, 5)})` : '';
                toast.success(`${branchId}호점 ${label}${timeLabel} 지점이 삽입되었습니다.`);
                router.refresh();
            } else {
                toast.error('지점 삽입 실패: ' + res.error);
            }
        } catch (err) {
            toast.error('지점 삽입 중 오류가 발생했습니다.');
        }
    };

    const handleExceptionSave = (scheduleId: string | null) => {
        if (scheduleId === null) {
            // Absolute delete: find editing item?
            if (editingItem) {
                setLocalItems(prev => prev.filter(i => i.schedule_id !== editingItem.schedule_id));
            }
            return;
        }

        // Otherwise it's just a refetch/refresh needed or simple time update?
        // Since we reload the page on hard delete anyway, this just covers the time update UX.
        // But for better UX, let's just use router.refresh() if possible, or wait for reload.
    };

    const generateTMapRoute = (sectionItems: DailyShuttleItem[]) => {
        // 결석이나 미운행 제외하고 운행할 지점들만 필터링
        const targets = sectionItems.filter(i =>
            !i.is_cancelled &&
            i.current_status !== 'missed' &&
            i.current_status !== 'self_commute'
        );

        if (targets.length < 2) {
            toast.info("운행 경로를 생성하기 위한 지점이 부족합니다.");
            return;
        }

        // 마지막 지점이 무조건 목적지(Goal)
        const lastItem = targets[targets.length - 1];
        const goal = {
            name: lastItem.student_name || lastItem.location_name,
            lat: lastItem.location_lat || 0,
            lng: lastItem.location_lng || 0
        };

        // 처음부터 마지막 직전까지가 경유지(Viapoints)
        const viapoints = targets.slice(0, targets.length - 1);
        const viaString = viapoints
            .filter(vp => vp.location_lat && vp.location_lng)
            .map(vp => `${vp.student_name || vp.location_name},${vp.location_lng},${vp.location_lat}`)
            .join('|');

        if (goal.lat === 0 || goal.lng === 0) {
            toast.error('목적지 좌표가 유효하지 않습니다.');
            return;
        }

        const urlScheme = `tmap://route?goalname=${encodeURIComponent(goal.name)}&goalx=${goal.lng}&goaly=${goal.lat}&viapoints=${encodeURIComponent(viaString)}`;

        // PC 웹용 대체 URL (경유지 기능이 웹에서는 제한적일 수 있으나 목적지라도 표시)
        const webUrl = `https://map.naver.com/v5/directions/-/-/${goal.lat},${goal.lng},${encodeURIComponent(goal.name)}/-/car`;
        // Note: T-Map 웹은 다중 경유지 URL 파라미터가 공식적으로 제한적이라 네이버/카카오 API 대비 호환성이 낮을 수 있음.
        // 하지만 유저가 T-Map을 선호하므로, 모바일 앱 호출을 우선순위로 둡니다.

        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile) {
            window.location.href = urlScheme;
        } else {
            // PC 환경 안내
            toast.info("PC 환경입니다. 모바일에서 접속하시면 T-Map 앱으로 자동 연결됩니다.");
            // 목적지라도 웹 지도로 열어줌
            const tmapWebUrl = `https://apis.openapi.sk.com/tmap/app/routes?appKey=${process.env.NEXT_PUBLIC_TMAP_APP_KEY}&destName=${encodeURIComponent(goal.name)}&destX=${goal.lng}&destY=${goal.lat}`;
            window.open(tmapWebUrl, '_blank');
        }
    };

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400 bg-white rounded-lg border border-dashed">
                <div className="text-4xl mb-2">🚌</div>
                <p>운행 스케줄이 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Section Controls */}
            <div className="flex justify-between items-center px-2 md:px-0">
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddAcademyStop(1, 0)}
                        className="text-xs bg-slate-50 border-slate-300 text-slate-600"
                    >
                        + 1호점 삽입 (최상단)
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddAcademyStop(2, 0)}
                        className="text-xs bg-slate-50 border-slate-300 text-slate-600"
                    >
                        + 2호점 삽입 (최상단)
                    </Button>
                </div>
            </div>

            {/* Desktop Table Header Controls */}
            <div className="flex justify-between items-center px-2 md:px-0">
                <span className="text-sm font-bold text-slate-600">
                    총 {localItems.length}명
                    {isReorderMode && <span className="text-orange-600 ml-2 animate-pulse">순서 변경 모드</span>}
                </span>
                <div className="flex gap-2">
                    {isReorderMode ? (
                        <>
                            <Button variant="outline" size="sm" onClick={() => { setIsReorderMode(false); setLocalItems(items); }}>취소</Button>
                            <Button size="sm" onClick={handleSaveOrder} disabled={isSavingOrder}>
                                {isSavingOrder ? '저장 중...' : '순서 저장'}
                            </Button>
                        </>
                    ) : (
                        <Button variant="outline" size="sm" onClick={() => setIsReorderMode(true)}>
                            순서 변경
                        </Button>
                    )}
                </div>
            </div>

            {/* Desktop/Tablet View (Table) with Sections */}
            <div className="hidden md:block bg-white rounded-lg border shadow-sm overflow-x-auto">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <Table className="table-fixed w-full min-w-[1100px] border-collapse">
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                {isReorderMode && <TableHead className="w-[50px] text-center">이동</TableHead>}
                                <TableHead className="w-[80px] text-center font-bold px-1">학생</TableHead>
                                <TableHead className="w-[100px] text-center font-bold px-1">연락처</TableHead>
                                <TableHead className="w-[100px] text-center font-bold px-1">시간</TableHead>
                                <TableHead className="min-w-[300px] text-left font-bold px-2">목적지</TableHead>
                                <TableHead className="w-[60px] text-center font-bold px-1">구분</TableHead>
                                <TableHead className="w-[200px] text-center font-bold px-1">상태</TableHead>
                                <TableHead className="w-[160px] text-center font-bold px-1">메모</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <SortableContext
                                items={localItems.map(i => i.schedule_id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {(() => {
                                    // Helper to render a single row
                                    // 1. Define row renderer
                                    const renderRow = (item: DailyShuttleItem, index: number, currentSection: number) => {
                                        const isBoarding = item.type === 'boarding';
                                        const isAcademyStart = item.type === 'academy_start';
                                        const isAcademyEnd = item.type === 'academy_end';
                                        const isAcademyStop = isAcademyStart || isAcademyEnd;

                                        let rowBg = 'bg-white';
                                        if (isAcademyStop) rowBg = 'bg-slate-100 font-bold';
                                        if (isAcademyStart) rowBg = 'bg-blue-50 font-bold';
                                        if (item.is_cancelled) rowBg = 'bg-slate-100 opacity-60';

                                        const displayTime = item.actual_time || item.time;
                                        const isOverridden = !!item.actual_time;
                                        const isCancelled = !!item.is_cancelled;

                                        const insertAcademyButtons = (
                                            <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
                                                <div className="flex gap-1 pointer-events-auto bg-white/95 backdrop-blur-sm px-1 py-0.5 rounded-full shadow-lg border border-slate-200">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-5 text-[9px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-0 font-bold whitespace-nowrap"
                                                        onClick={() => handleAddAcademyStop(1, (item.sequence_order ?? index) + 1, 'academy_start', displayTime)}
                                                    >
                                                        +1출발
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-5 text-[9px] text-slate-600 hover:text-slate-700 hover:bg-slate-50 px-2 py-0 font-bold whitespace-nowrap"
                                                        onClick={() => handleAddAcademyStop(1, (item.sequence_order ?? index) + 1, 'academy_end', displayTime)}
                                                    >
                                                        +1도착
                                                    </Button>
                                                    <div className="w-[1px] bg-slate-200 mx-0.5 self-stretch" />
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-5 text-[9px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-0 font-bold whitespace-nowrap"
                                                        onClick={() => handleAddAcademyStop(2, (item.sequence_order ?? index) + 1, 'academy_start', displayTime)}
                                                    >
                                                        +2출발
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-5 text-[9px] text-slate-600 hover:text-slate-700 hover:bg-slate-50 px-2 py-0 font-bold whitespace-nowrap"
                                                        onClick={() => handleAddAcademyStop(2, (item.sequence_order ?? index) + 1, 'academy_end', displayTime)}
                                                    >
                                                        +2도착
                                                    </Button>
                                                </div>
                                            </div>
                                        );

                                        const content = (
                                            <>
                                                <TableCell className="font-bold text-center text-base px-1 truncate relative">
                                                    <span className={isCancelled ? 'line-through decoration-slate-400 text-slate-500' : ''}>
                                                        {item.student_name}
                                                    </span>
                                                </TableCell>

                                                <TableCell className="text-center px-1">
                                                    <div className="flex justify-center gap-1">
                                                        {item.student_phone && (
                                                            <Button asChild size="icon" variant="outline" className="h-8 w-8 rounded-md border-slate-300 text-slate-600 hover:text-blue-600 hover:border-blue-400">
                                                                <a href={`tel:${item.student_phone}`}>
                                                                    <User className="h-4 w-4" />
                                                                </a>
                                                            </Button>
                                                        )}
                                                        {item.parent_phone && (
                                                            <Button asChild size="icon" variant="outline" className="h-8 w-8 rounded-md border-slate-300 text-slate-600 hover:text-orange-600 hover:border-orange-400">
                                                                <a href={`tel:${item.parent_phone}`}>
                                                                    <Baby className="h-4 w-4" />
                                                                </a>
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                <TableCell className="text-center px-1 cursor-pointer hover:bg-slate-100 rounded" onClick={() => !isReorderMode && setEditingItem(item)}>
                                                    <div className="flex flex-col items-center justify-center">
                                                        <span className={`font-mono font-bold text-lg ${isCancelled ? 'line-through text-slate-400' : 'text-slate-700'} ${isOverridden ? 'text-blue-600' : ''}`}>
                                                            {displayTime.substring(0, 5)}
                                                        </span>
                                                        {isOverridden && !isCancelled && (
                                                            <span className="text-[10px] text-slate-400 line-through">
                                                                {item.time.substring(0, 5)}
                                                            </span>
                                                        )}
                                                        {isCancelled && <span className="text-[10px] text-red-500 font-bold">결석</span>}
                                                    </div>
                                                </TableCell>

                                                <TableCell className="text-left px-2 relative min-h-[60px] pb-6">
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-8 w-8 shrink-0 text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100 p-0"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const url = `tmap://route?goalname=${encodeURIComponent(item.location_name)}&goalx=${item.location_lng}&goaly=${item.location_lat}`;
                                                                window.location.href = url;
                                                            }}
                                                            title="T-Map 바로가기"
                                                        >
                                                            <span className="font-black text-xs">T</span>
                                                        </Button>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="font-semibold text-sm truncate">{item.location_name}</span>
                                                            {item.location_address && (
                                                                <span className="text-[11px] text-slate-400 truncate block">
                                                                    {item.location_address}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {!isReorderMode && insertAcademyButtons}
                                                </TableCell>

                                                <TableCell className="text-center px-1">
                                                    <div className="flex flex-col items-center gap-1">
                                                        {isAcademyStop ? (
                                                            <Badge
                                                                variant="outline"
                                                                className={isAcademyStart
                                                                    ? "bg-blue-600 text-white border-blue-600"
                                                                    : "bg-slate-900 text-white border-slate-900"}
                                                            >
                                                                {isAcademyStart ? '출발(지점)' : '도착(지점)'}
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className={isBoarding ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-green-100 text-green-700 border-green-200'}>
                                                                {isBoarding ? '등원' : '하원'}
                                                            </Badge>
                                                        )}
                                                        {currentSection > 0 && (
                                                            <Badge variant="outline" className="text-[10px] h-4 px-1">{currentSection}구간</Badge>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                <TableCell className="text-center px-1">
                                                    {!isCancelled && !isAcademyStop ? (
                                                        <StatusSelector
                                                            currentStatus={item.current_status}
                                                            onUpdate={(val) => handleStatusUpdate(item.schedule_id, item.student_id, val)}
                                                        />
                                                    ) : (
                                                        <span className="text-xs text-slate-400">-</span>
                                                    )}
                                                </TableCell>

                                                <TableCell className="text-center px-2">
                                                    <MemoCell
                                                        initialNote={item.note || ''}
                                                        onSave={(val) => handleNoteUpdate(item.schedule_id, item.student_id, val)}
                                                    />
                                                </TableCell>
                                            </>
                                        );

                                        if (isReorderMode) {
                                            return (
                                                <SortableShuttleRow key={item.schedule_id} item={item} isReorderMode={true}>
                                                    {content}
                                                </SortableShuttleRow>
                                            );
                                        }

                                        return (
                                            <TableRow key={item.schedule_id} className={`hover:bg-slate-50 group relative ${rowBg}`}>
                                                {content}
                                            </TableRow>
                                        );
                                    };

                                    // 2. Dynamic Rendering Loop - Academy Start-End Based Sectioning
                                    let activeSection = 0; // Starts at 0, 1st Academy Start makes it 1
                                    const tableRows: React.ReactNode[] = [];
                                    let inSection = false;

                                    localItems.forEach((item, index) => {
                                        if (item.type === 'academy_start') {
                                            activeSection++;
                                            inSection = true;
                                        }

                                        tableRows.push(renderRow(item, index, activeSection));

                                        if (item.type === 'academy_end') {
                                            inSection = false;
                                        }
                                    });

                                    return tableRows;
                                })()}
                            </SortableContext>
                        </TableBody>
                    </Table>
                </DndContext>

                <div className="p-4 border-t bg-slate-100 flex flex-col items-center gap-2">
                    <p className="text-[10px] text-slate-400 italic mb-2">정류장 사이의 '+' 버튼을 눌러 학원 지점을 삽입할 수 있습니다.</p>
                    <div className="flex gap-2">
                        {(() => {
                            // Calculate Sections for T-Map Buttons - Start/End Pairing
                            const sectionMap = new Map<number, DailyShuttleItem[]>();
                            let sId = 0;
                            localItems.forEach(item => {
                                if (item.type === 'academy_start') {
                                    sId++;
                                }
                                if (sId > 0) {
                                    if (!sectionMap.has(sId)) sectionMap.set(sId, []);
                                    sectionMap.get(sId)?.push(item);
                                }
                            });

                            return Array.from(sectionMap.entries()).map(([id, items]) => (
                                <Button
                                    key={id}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => generateTMapRoute(items)}
                                    className="text-xs h-8"
                                >
                                    <MapIcon className="h-3 w-3 mr-1" />
                                    {id}구간 경로
                                </Button>
                            ));
                        })()}
                    </div>
                </div>
            </div>

            {/* Mobile View (Cards) */}
            <div className="md:hidden space-y-3">
                {localItems.map((item) => {
                    const isBoarding = item.type === 'boarding';
                    const isAcademyStart = item.type === 'academy_start';
                    const isAcademyEnd = item.type === 'academy_end';
                    const isAcademyStop = isAcademyStart || isAcademyEnd;

                    let borderClass = isBoarding ? 'border-l-4 border-l-orange-400' : 'border-l-4 border-l-green-500';
                    if (isAcademyStart) borderClass = 'border-l-4 border-l-blue-600 bg-blue-50/30';
                    if (isAcademyEnd) borderClass = 'border-l-4 border-l-slate-900 bg-slate-50';

                    const isCancelled = !!item.is_cancelled;
                    if (isCancelled) borderClass = 'border-l-4 border-l-slate-300 bg-slate-50';

                    const displayTime = item.actual_time || item.time;
                    const isOverridden = !!item.actual_time;

                    return (
                        <div key={item.schedule_id} className={`bg-white p-4 rounded-lg shadow-sm border border-slate-100 ${borderClass}`}>
                            {/* Header */}
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="flex items-center gap-2" onClick={() => setEditingItem(item)}>
                                        <div className="flex flex-col">
                                            <span className={`text-3xl font-bold tracking-tighter ${isCancelled ? 'line-through text-slate-400' : 'text-slate-800'} ${isOverridden ? 'text-blue-600' : ''}`}>
                                                {displayTime.substring(0, 5)}
                                            </span>
                                            {isOverridden && !isCancelled && <span className="text-xs text-slate-400 line-through">{item.time.substring(0, 5)}</span>}
                                        </div>
                                        {isAcademyStop ? (
                                            <Badge variant="outline" className={isAcademyStart ? 'text-white bg-blue-600 border-blue-600' : 'text-white bg-slate-900 border-slate-900'}>
                                                {isAcademyStart ? '출발(지점)' : '도착(지점)'}
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className={isBoarding ? 'text-orange-600 bg-orange-50' : 'text-green-600 bg-green-50'}>
                                                {isBoarding ? '등원' : '하원'}
                                            </Badge>
                                        )}
                                        {isCancelled && <Badge variant="destructive" className="text-xs">결석</Badge>}
                                    </div>
                                    <div className={`text-xl font-bold mt-1 ${isCancelled ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{item.student_name}</div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setEditingItem(item)}>
                                    <Clock className="h-4 w-4 text-slate-400" />
                                </Button>
                            </div>

                            {/* Status Selector Row (Mobile) */}
                            {!isCancelled && !isAcademyStop && (
                                <div className="mb-3 bg-slate-50 p-2 rounded-md flex justify-center">
                                    <StatusSelector
                                        currentStatus={item.current_status}
                                        onUpdate={(val) => handleStatusUpdate(item.schedule_id, item.student_id, val)}
                                    />
                                </div>
                            )}

                            {/* Location */}
                            <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-md text-sm text-slate-700 mb-3">
                                <MapPin className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />
                                <div>
                                    <div className="font-bold">{item.location_name}</div>
                                    <a
                                        href={`tmap://search?name=${encodeURIComponent(item.location_name)}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-slate-500 text-xs mt-0.5 block hover:text-pink-600"
                                    >
                                        {item.location_address}
                                    </a>
                                </div>
                            </div>

                            {/* Memo */}
                            <div className="mb-3">
                                <MemoCell
                                    initialNote={item.note || ''}
                                    onSave={(val) => handleNoteUpdate(item.schedule_id, item.student_id, val)}
                                />
                            </div>

                            {/* Contact Buttons */}
                            <div className="flex gap-2">
                                {item.student_phone && (
                                    <Button asChild variant="outline" className="flex-1 border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200">
                                        <a href={`tel:${item.student_phone}`}>
                                            <User className="h-4 w-4 mr-2" />
                                            학생
                                        </a>
                                    </Button>
                                )}
                                {item.parent_phone && (
                                    <Button asChild variant="outline" className="flex-1 border-slate-200 text-slate-600 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200">
                                        <a href={`tel:${item.parent_phone}`}>
                                            <Baby className="h-4 w-4 mr-2" />
                                            부모님
                                        </a>
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Edit DIALOG */}
            {editingItem && (
                <TimeEditDialog
                    isOpen={!!editingItem}
                    onClose={() => setEditingItem(null)}
                    item={editingItem}
                    dateStr={dateStr}
                    onSave={(scheduleId) => handleExceptionSave(scheduleId)}
                />
            )}
        </div>
    );
}

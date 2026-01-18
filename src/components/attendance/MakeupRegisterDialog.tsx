'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2, User, AlertCircle, CheckCircle } from 'lucide-react';
import { searchStudentsByName, getStudentAbsences, processMakeup } from '@/app/actions/attendance-actions';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    targetDate: string; // "YYYY-MM-DD" - Date of the makeup class (Today usually)
    onSuccess: () => void;
}

export function MakeupRegisterDialog({ isOpen, onClose, targetDate, onSuccess }: Props) {
    const [step, setStep] = useState<'search' | 'select-absence'>('search');
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [absences, setAbsences] = useState<any[]>([]);
    const [isLoadingAbsences, setIsLoadingAbsences] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Confirmation Alert State
    const [confirmAbsenceId, setConfirmAbsenceId] = useState<string | null>(null);

    const handleSearch = async () => {
        if (query.length < 2) {
            toast.error("두 글자 이상 입력해주세요.");
            return;
        }
        setIsSearching(true);
        try {
            const results = await searchStudentsByName(query);
            setSearchResults(results || []);
        } catch (e) {
            console.error(e);
            toast.error("검색 중 오류가 발생했습니다.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectStudent = async (student: any) => {
        setSelectedStudent(student);
        setIsLoadingAbsences(true);
        try {
            const data = await getStudentAbsences(student.id);
            setAbsences(data || []);
            setStep('select-absence');
        } catch (e) {
            console.error(e);
            toast.error("결석 기록을 불러오는데 실패했습니다.");
            setSelectedStudent(null);
        } finally {
            setIsLoadingAbsences(false);
        }
    };

    const handleConfirmMakeup = async () => {
        if (!confirmAbsenceId) return;

        setProcessingId(confirmAbsenceId);
        try {
            const result = await processMakeup(confirmAbsenceId, targetDate);
            if (result.success) {
                toast.success("보강 처리가 완료되었습니다.");
                // Remove processed from list locally to update UI immediately? 
                // Or proper pattern: close entire dialog, list refreshes.
                onSuccess();
                onClose();
                // Reset State
                setStep('search');
                setQuery('');
                setSearchResults([]);
                setSelectedStudent(null);
                setAbsences([]);
            } else {
                toast.error(`처리 실패: ${result.error}`);
            }
        } catch (e) {
            console.error(e);
            toast.error("처리 중 오류가 발생했습니다.");
        } finally {
            setProcessingId(null);
            setConfirmAbsenceId(null);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) {
                onClose();
                // Reset after close
                setTimeout(() => {
                    setStep('search');
                    setQuery('');
                    setSearchResults([]);
                    setSelectedStudent(null);
                    setAbsences([]);
                    setConfirmAbsenceId(null);
                }, 300);
            }
        }}>
            <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle>보강 등록</DialogTitle>
                    <DialogDescription>
                        {step === 'search'
                            ? "보강 수업을 듣는 학생을 검색하세요."
                            : `${selectedStudent?.name} 학생의 결석 목록입니다. 보강할 날짜를 선택하세요.`}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 pt-4">
                    {/* Step 1: Search */}
                    {step === 'search' && (
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="학생 이름 (2글자 이상)"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    autoFocus
                                />
                                <Button onClick={handleSearch} disabled={isSearching}>
                                    {isSearching ? <Loader2 className="animate-spin" /> : <Search className="w-4 h-4" />}
                                </Button>
                            </div>

                            <div className="space-y-2 mt-4">
                                {searchResults.length === 0 && query.length >= 2 && !isSearching && (
                                    <div className="text-center text-gray-500 py-8">검색 결과가 없습니다.</div>
                                )}
                                {searchResults.map(student => (
                                    <div
                                        key={student.id}
                                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                                        onClick={() => handleSelectStudent(student)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="font-semibold">{student.name}</div>
                                                <div className="text-xs text-slate-500">
                                                    {student.school || '학교미입력'} · {student.grade || '학년미입력'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {student.student_phone || student.parent_phone || '연락처 없음'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Absences List */}
                    {step === 'select-absence' && (
                        <div>
                            <div className="mb-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="px-0 text-slate-500 hover:text-slate-800"
                                    onClick={() => {
                                        setStep('search');
                                        setAbsences([]);
                                        setSelectedStudent(null);
                                    }}
                                >
                                    ← 학생 다시 선택
                                </Button>
                            </div>

                            {isLoadingAbsences ? (
                                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" /></div>
                            ) : absences.length === 0 ? (
                                <div className="text-center py-10 bg-slate-50 rounded-lg text-slate-500">
                                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                                    처리할 결석 기록이 없습니다.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {absences.map(abs => (
                                        <div
                                            key={abs.id}
                                            className="p-4 border rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all group"
                                            onClick={() => setConfirmAbsenceId(abs.id)}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-bold text-red-500 mb-1">
                                                        {abs.date} (결석)
                                                    </div>
                                                    <div className="text-sm font-medium text-slate-700">
                                                        {abs.class?.name}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {abs.class?.day_of_week} {abs.class?.start_time?.slice(0, 5)}
                                                    </div>
                                                    {abs.note && (
                                                        <div className="text-xs text-orange-500 mt-1 bg-orange-50 px-1 py-0.5 rounded w-fit">
                                                            {abs.note}
                                                        </div>
                                                    )}
                                                </div>
                                                <Button size="sm" variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 border-blue-200 bg-blue-50">
                                                    보강 처리
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>

            {/* Confirmation Alert Dialog (Can use native or custom UI, let's use a nested visual for speed or separate Alert Dialog) */}
            {confirmAbsenceId && (
                <Dialog open={!!confirmAbsenceId} onOpenChange={() => setConfirmAbsenceId(null)}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <AlertCircle className="text-blue-500" />
                                보강 처리 확인
                            </DialogTitle>
                            <DialogDescription className="py-2">
                                선택하신 날짜의 결석을 <strong>보강({targetDate} 수업)</strong>으로 처리하시겠습니까?<br />
                                <span className="text-xs text-slate-500 mt-2 block bg-slate-100 p-2 rounded">
                                    * 해당 날짜({absences.find(a => a.id === confirmAbsenceId)?.date})의 출석부에 '보강' 상태로 변경되며, 오늘 날짜가 기록됩니다.
                                </span>
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-end gap-2 mt-2">
                            <Button variant="outline" onClick={() => setConfirmAbsenceId(null)}>취소</Button>
                            <Button onClick={handleConfirmMakeup} disabled={!!processingId}>
                                {processingId ? <Loader2 className="animate-spin w-4 h-4" /> : '네, 처리합니다'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </Dialog>
    );
}

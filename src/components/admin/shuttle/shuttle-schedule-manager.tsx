
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { MapPin, Trash2, Bus, Clock } from 'lucide-react';
import { searchLocationV2, addShuttleSchedule, deleteShuttleSchedule, ShuttleSchedule } from '@/app/actions/shuttle-actions';

interface ShuttleScheduleManagerProps {
    schedules?: Partial<ShuttleSchedule>[];
    studentId?: string;
    onUpdate?: (schedules: Partial<ShuttleSchedule>[]) => void;
}

export default function ShuttleScheduleManager({ schedules = [], studentId, onUpdate }: ShuttleScheduleManagerProps) {
    const [localSchedules, setLocalSchedules] = useState<Partial<ShuttleSchedule>[]>(schedules);
    const [isAddOpen, setIsAddOpen] = useState(false);

    // Form State
    const [day, setDay] = useState<string>('Mon');
    const [type, setType] = useState<'boarding' | 'dropoff'>('boarding');
    const [time, setTime] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<any>(null);
    const [isSearching, setIsSearching] = useState(false);

    // Helpers
    const handleSearch = async () => {
        if (!searchQuery) return;
        setIsSearching(true);
        console.log('[Client] Searching for:', searchQuery);

        try {
            console.log('[Client] Calling searchLocationV2...');
            const res = await searchLocationV2(searchQuery);
            console.log('[Client] searchLocationV2 returned:', res);
            setIsSearching(false);

            if (res.success) {
                console.log('[Client] Search success, count:', res.data?.length);
                if (!res.data || res.data.length === 0) {
                    toast.info('검색 결과가 없습니다.');
                } else {
                    toast.success(`${res.data.length}개의 장소를 찾았습니다.`);
                }
                setSearchResults(res.data || []);
            } else {
                console.error('[Client] Search error:', res.error);
                toast.error('주소 검색 에러: ' + res.error);
            }
        } catch (e: any) {
            console.error('[Client] Exception:', e);
            toast.error('검색 중 오류 발생: ' + e.message);
            setIsSearching(false);
        }
    };

    const handleAdd = async () => {
        if (!time || !selectedLocation) {
            toast.error('시간과 장소를 선택해주세요.');
            return;
        }

        const newSchedule: Partial<ShuttleSchedule> = {
            day_of_week: day as any,
            type,
            time,
            location_name: selectedLocation.name,
            location_address: selectedLocation.address,
            location_lat: selectedLocation.lat,
            location_lng: selectedLocation.lng,
            sequence_order: 0 // Logic needed?
        };

        if (studentId) {
            // Server Sync Mode
            const res = await addShuttleSchedule({ ...newSchedule, student_id: studentId } as any);
            if (res.success) {
                toast.success('스케줄이 추가되었습니다.');
                const updated = [...localSchedules, res.data];
                // Sort
                updated.sort((a, b) => (a.day_of_week! > b.day_of_week! ? 1 : -1) || (a.time! > b.time! ? 1 : -1));
                setLocalSchedules(updated);
                setIsAddOpen(false);
                resetForm();
            } else {
                toast.error('추가 실패: ' + res.error);
            }
        } else {
            // Local Mode (Create Student)
            const updated = [...localSchedules, newSchedule];
            updated.sort((a, b) => (a.day_of_week! > b.day_of_week! ? 1 : -1) || (a.time! > b.time! ? 1 : -1));
            setLocalSchedules(updated);
            if (onUpdate) onUpdate(updated);
            setIsAddOpen(false);
            resetForm();
        }
    };

    const handleDelete = async (index: number, id?: string) => {
        if (studentId && id) {
            const res = await deleteShuttleSchedule(id);
            if (res.success) {
                toast.success('삭제되었습니다.');
                const updated = localSchedules.filter(s => s.id !== id);
                setLocalSchedules(updated);
            } else {
                toast.error('삭제 실패');
            }
        } else {
            const updated = localSchedules.filter((_, i) => i !== index);
            setLocalSchedules(updated);
            if (onUpdate) onUpdate(updated);
        }
    };

    const resetForm = () => {
        setSearchQuery('');
        setSearchResults([]);
        setSelectedLocation(null);
        setTime('');
    };

    const dayMap: Record<string, string> = { Mon: '월', Tue: '화', Wed: '수', Thu: '목', Fri: '금', Sat: '토', Sun: '일' };

    return (
        <div className="space-y-4 border rounded-md p-4 bg-slate-50">
            <div className="flex justify-between items-center">
                <h3 className="font-semibold flex items-center gap-2">
                    <Bus className="h-4 w-4" /> 셔틀 스케줄
                </h3>
                <Button size="sm" variant="outline" type="button" onClick={() => setIsAddOpen(!isAddOpen)}>
                    {isAddOpen ? '취소' : '일정 추가'}
                </Button>
            </div>

            {isAddOpen && (
                <div className="border rounded-md p-4 bg-white space-y-4 shadow-sm animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>요일</Label>
                            <Select value={day} onValueChange={setDay}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                                        <SelectItem key={d} value={d}>{dayMap[d]}요일</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>시간</Label>
                            <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>유형</Label>
                        <RadioGroup value={type} onValueChange={(v: any) => setType(v)} className="flex gap-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="boarding" id="r-boarding" />
                                <Label htmlFor="r-boarding">등원 (탑승)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="dropoff" id="r-dropoff" />
                                <Label htmlFor="r-dropoff">하원 (하차)</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="space-y-2">
                        <Label>장소 검색 (T-Map)</Label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="장소명 또는 주소 입력"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSearch();
                                    }
                                }}
                            />
                            <Button type="button" onClick={handleSearch} disabled={isSearching}>
                                {isSearching ? '검색중...' : '검색'}
                            </Button>
                        </div>

                        {searchResults.length === 0 && searchQuery && !isSearching && (
                            <div className="text-sm text-red-500 mt-2">
                                검색 결과가 없습니다. (검색어: {searchQuery})
                            </div>
                        )}
                        {searchResults.length > 0 && (
                            <div className="border rounded max-h-40 overflow-y-auto mt-2 text-sm bg-white">
                                {searchResults.map((place, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-2 cursor-pointer hover:bg-slate-100 ${selectedLocation?.name === place.name ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                                        onClick={() => {
                                            console.log('Selected:', place);
                                            setSelectedLocation(place);
                                        }}
                                    >
                                        <div className="font-medium">{place.name}</div>
                                        <div className="text-xs text-slate-500">{place.address}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {selectedLocation && (
                            <div className="text-sm text-green-600 font-medium">
                                선택됨: {selectedLocation.name}
                            </div>
                        )}
                    </div>

                    <Button type="button" onClick={handleAdd} className="w-full">추가하기</Button>
                </div>
            )}

            {localSchedules.length === 0 && !isAddOpen ? (
                <p className="text-sm text-slate-400 text-center py-4">등록된 일정이 없습니다.</p>
            ) : (
                <div className="space-y-2">
                    {localSchedules.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm p-2 bg-white rounded border">
                            <div className="flex items-center gap-3">
                                <div className={`px-2 py-1 rounded text-xs font-bold ${item.type === 'boarding' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {item.type === 'boarding' ? '등원' : '하원'}
                                </div>
                                <span className="font-semibold w-8">{dayMap[item.day_of_week || '']}</span>
                                <div className="flex items-center gap-1 text-slate-600">
                                    <Clock className="h-3 w-3" /> {item.time}
                                </div>
                                <div className="flex items-center gap-1 text-slate-800">
                                    <MapPin className="h-3 w-3" /> {item.location_name}
                                </div>
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600" onClick={() => handleDelete(idx, item.id)}>
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

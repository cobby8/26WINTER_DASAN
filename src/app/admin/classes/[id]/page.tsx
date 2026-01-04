
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { deleteClass } from '@/app/actions/student-actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { AlertTriangle, Trash2 } from 'lucide-react';

const DAYS = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];

interface Props {
    params: Promise<{ id: string }>;
}

export default function EditClassPage(props: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        day_of_week: '',
        start_time: '',
        end_time: '',
        capacity: '20',
        branch: '',
        session: '',
        start_date: '',
        end_date: ''
    });
    const [classId, setClassId] = useState<string | null>(null);

    useEffect(() => {
        const fetchClass = async () => {
            const params = await props.params;
            setClassId(params.id);

            const { data, error } = await supabase
                .from('classes')
                .select('*')
                .eq('id', params.id)
                .single();

            if (error) {
                alert('수업 정보를 불러오는데 실패했습니다.');
                router.push('/admin/classes');
                return;
            }

            if (data) {
                setFormData({
                    name: data.name,
                    day_of_week: data.day_of_week,
                    start_time: data.start_time,
                    end_time: data.end_time || data.start_time,
                    capacity: data.capacity?.toString() || '20',
                    branch: data.branch || '1호점',
                    session: data.session || '1차',
                    start_date: data.start_date || '',
                    end_date: data.end_date || ''
                });
            }
            setFetching(false);
        };

        fetchClass();
    }, [props.params, router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!classId) return;

            const { error } = await supabase.from('classes').update({
                name: formData.name,
                day_of_week: formData.day_of_week,
                start_time: formData.start_time,
                end_time: formData.end_time,
                capacity: parseInt(formData.capacity),
                branch: formData.branch,
                session: formData.session,
                start_date: formData.start_date || null,
                end_date: formData.end_date || null
            }).eq('id', classId);

            if (error) throw error;

            alert('수업 정보가 수정되었습니다.');
            router.push('/admin/classes');
            router.refresh();
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('정말로 이 수업을 삭제하시겠습니까? \n\n주의: 이 수업에 수강 중인 모든 학생의 수강 내역도 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.')) return;
        setLoading(true);
        try {
            if (!classId) return;

            const result = await deleteClass(classId);

            if (!result.success) throw new Error(result.error);

            alert('수업이 삭제되었습니다.');
            router.push('/admin/classes');
            router.refresh();
        } catch (error: any) {
            alert(`삭제 실패: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="p-8 text-center text-gray-500">로딩 중...</div>;

    return (
        <div className="max-w-2xl mx-auto py-8">
            <Card>
                <CardHeader>
                    <CardTitle>수업 수정</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="branch">지점</Label>
                                <Select
                                    value={formData.branch}
                                    onValueChange={(val) => handleSelectChange('branch', val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="지점 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1호점">1호점</SelectItem>
                                        <SelectItem value="2호점">2호점</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="session">분반/회차</Label>
                                <Select
                                    value={formData.session}
                                    onValueChange={(val) => handleSelectChange('session', val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="회차 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1차">1차</SelectItem>
                                        <SelectItem value="2차">2차</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="day_of_week">요일</Label>
                                <Select
                                    value={formData.day_of_week}
                                    onValueChange={(val) => handleSelectChange('day_of_week', val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="요일 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DAYS.map(day => (
                                            <SelectItem key={day} value={day}>{day}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="capacity">정원</Label>
                                <Input
                                    id="capacity"
                                    name="capacity"
                                    type="number"
                                    value={formData.capacity}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start_time">시작 시간</Label>
                                <Input
                                    id="start_time"
                                    name="start_time"
                                    type="time"
                                    value={formData.start_time}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end_time">종료 시간</Label>
                                <Input
                                    id="end_time"
                                    name="end_time"
                                    type="time"
                                    value={formData.end_time}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start_date">수업 시작일 (선택)</Label>
                                <Input
                                    id="start_date"
                                    name="start_date"
                                    type="date"
                                    value={formData.start_date}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end_date">수업 종료일 (선택)</Label>
                                <Input
                                    id="end_date"
                                    name="end_date"
                                    type="date"
                                    value={formData.end_date}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">강좌명</Label>
                            <Input
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="예: 겨울방학특강 월요일 14:00"
                                required
                            />
                        </div>

                        <div className="flex justify-between items-center pt-6 border-t mt-4">
                            <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                강제 삭제 (수강생 포함)
                            </Button>
                            <div className="space-x-2">
                                <Button type="button" variant="outline" onClick={() => router.back()}>
                                    취소
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    {loading ? '저장 중...' : '저장하기'}
                                </Button>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

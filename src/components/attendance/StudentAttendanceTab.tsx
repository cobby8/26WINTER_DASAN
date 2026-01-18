'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface AttendanceLog {
    id: string;
    date: string;
    status: string;
    note: string | null;
    makeup_date: string | null;
    class: {
        name: string;
        day_of_week: string;
        start_time: string;
    } | null;
}

interface Props {
    logs: AttendanceLog[];
    tenureDays: number;
    startDate: string | null;
}

export default function StudentAttendanceTab({ logs, tenureDays, startDate }: Props) {

    const getStatusBadge = (status: string, makeupDate: string | null) => {
        switch (status) {
            case 'present':
                return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">출석</Badge>;
            case 'late':
                return <Badge className="bg-red-100 text-red-600 hover:bg-red-200 border-red-200">지각</Badge>;
            case 'absent':
                return <Badge className="bg-red-500 text-white hover:bg-red-600 border-red-500">결석</Badge>;
            case 'makeup':
                return (
                    <div className="flex flex-col gap-1">
                        <Badge className="bg-blue-500 text-white hover:bg-blue-600 border-blue-500 w-fit">보강</Badge>
                        {makeupDate && <span className="text-[10px] text-blue-600 font-medium">{makeupDate} 완료</span>}
                    </div>
                );
            default:
                return <Badge variant="outline" className="text-gray-400">미체크</Badge>;
        }
    };

    const formatTenure = (days: number) => {
        if (days < 30) return `${days}일`;
        const months = Math.floor(days / 30);
        const remainDays = days % 30;
        const years = Math.floor(months / 12);
        const remainMonths = months % 12;

        if (years > 0) return `${years}년 ${remainMonths}개월`;
        return `${months}개월 ${remainDays}일`;
    };

    return (
        <div className="space-y-6">
            {/* Summary Metrics */}
            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">총 재원 기간</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatTenure(tenureDays)}</div>
                        <p className="text-xs text-gray-400 mt-1">시작일: {startDate || '-'}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">총 출석일</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {logs.filter(l => l.status === 'present' || l.status === 'makeup' || l.status === 'late').length}일
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                            결석 {logs.filter(l => l.status === 'absent').length}회
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Attendance Log Table */}
            <Card>
                <CardHeader>
                    <CardTitle>출석 기록</CardTitle>
                </CardHeader>
                <CardContent>
                    {logs.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">기록이 없습니다.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[120px]">날짜</TableHead>
                                    <TableHead>수업명</TableHead>
                                    <TableHead className="w-[100px]">상태</TableHead>
                                    <TableHead>비고</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="font-medium">
                                            {format(new Date(log.date), 'yyyy-MM-dd (eee)', { locale: ko })}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{log.class?.name || '-'}</div>
                                            <div className="text-xs text-gray-500">
                                                {log.class?.day_of_week} {log.class?.start_time}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(log.status, log.makeup_date)}
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-600">
                                            {log.note || '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

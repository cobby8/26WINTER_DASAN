'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface ClassData {
    id: string;
    branch: string | null;
    session: string | null;
    day_of_week: string;
    start_time: string;
    end_time: string;
    name: string;
    capacity: number;
    start_date?: string | null;
    end_date?: string | null;
}

interface ClassListProps {
    initialClasses: ClassData[];
    enrollmentCounts: { [key: string]: number };
}

export default function ClassList({ initialClasses, enrollmentCounts }: ClassListProps) {
    const [filterBranch, setFilterBranch] = useState<string>('all');
    const [filterSession, setFilterSession] = useState<string>('all');
    const [filterDay, setFilterDay] = useState<string>('all');
    const [searchName, setSearchName] = useState<string>('');

    // Unique values for dropdowns
    const uniqueBranches = Array.from(new Set(initialClasses.map(c => c.branch).filter(Boolean))).sort();
    const uniqueSessions = Array.from(new Set(initialClasses.map(c => c.session).filter(Boolean))).sort();
    const days = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];

    // Filter Logic
    const filteredClasses = initialClasses.filter(cls => {
        if (filterBranch !== 'all' && cls.branch !== filterBranch) return false;
        if (filterSession !== 'all' && cls.session !== filterSession) return false;
        if (filterDay !== 'all' && cls.day_of_week !== filterDay) return false;
        if (searchName && !cls.name.toLowerCase().includes(searchName.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="space-y-4">
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
                    총 {filteredClasses.length}개
                </div>
            </div>

            {/* Table */}
            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">지점/분반</TableHead>
                            <TableHead>요일</TableHead>
                            <TableHead>시간</TableHead>
                            <TableHead>강좌명</TableHead>
                            <TableHead className="text-right">등록/정원</TableHead>
                            <TableHead className="w-[100px] text-right">관리</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredClasses.length > 0 ? (
                            filteredClasses.map((cls) => (
                                <TableRow key={cls.id}>
                                    <TableCell>
                                        {(cls.branch || cls.session) ? (
                                            <div className="flex gap-1">
                                                {cls.branch && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">{cls.branch}</span>}
                                                {cls.session && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">{cls.session}</span>}
                                            </div>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell className="font-medium">{cls.day_of_week}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-xs text-gray-500">
                                            <span>{cls.start_time} ~ {cls.end_time}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {cls.name}
                                        {cls.start_date && (
                                            <div className="text-[10px] text-gray-400 mt-0.5">
                                                {cls.start_date} ~ {cls.end_date}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className={`font-bold ${(enrollmentCounts[cls.id] || 0) >= cls.capacity
                                            ? 'text-red-500'
                                            : 'text-green-600'
                                            }`}>
                                            {enrollmentCounts[cls.id] || 0}
                                        </span>
                                        <span className="text-gray-400 mx-1">/</span>
                                        <span className="text-gray-600">{cls.capacity}</span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/admin/classes/${cls.id}`}>수정</Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-gray-500">
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

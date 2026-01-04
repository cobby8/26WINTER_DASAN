
import { supabaseAdmin } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { RepairDataButton } from './repair-button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export const revalidate = 0;

export default async function ClassesPage() {
    // Fetch Classes
    const { data: classes, error } = await supabaseAdmin
        .from('classes')
        .select('*');

    if (error) {
        return <div className="p-4 text-red-500">Error loading classes: {error.message}</div>;
    }

    // Fetch Enrollment Counts (Active only)
    const { data: enrollments } = await supabaseAdmin
        .from('enrollments')
        .select('class_id')
        .eq('status', 'active');

    const enrollmentCounts: { [key: string]: number } = {};
    if (enrollments) {
        enrollments.forEach(e => {
            enrollmentCounts[e.class_id] = (enrollmentCounts[e.class_id] || 0) + 1;
        });
    }

    // Custom Sort Logic: Branch > Day > Time
    const sortedClasses = classes?.sort((a, b) => {
        // 1. Sort by Branch (1호점 < 2호점)
        const branchA = a.branch || '';
        const branchB = b.branch || '';
        if (branchA !== branchB) {
            return branchA.localeCompare(branchB);
        }

        // 2. Sort by Day of Week 
        const days = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];
        const dayA = days.indexOf(a.day_of_week);
        const dayB = days.indexOf(b.day_of_week);
        if (dayA !== dayB) {
            return dayA - dayB;
        }

        // 3. Sort by Time
        if (a.start_time !== b.start_time) {
            return a.start_time.localeCompare(b.start_time);
        }

        return 0;
    }) || [];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">수업 관리</h2>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <Link href="/admin/classes/bulk">일괄 수정</Link>
                    </Button>
                    <Button asChild>
                        <Link href="/admin/classes/new">
                            <Plus className="w-4 h-4 mr-2" />
                            수업 추가
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="rounded-md border">
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
                        {sortedClasses && sortedClasses.length > 0 ? (
                            sortedClasses.map((cls) => (
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
                                        {/* Class Period Indicator */}
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
                                <TableCell colSpan={6} className="h-24 text-center">
                                    등록된 수업이 없습니다.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

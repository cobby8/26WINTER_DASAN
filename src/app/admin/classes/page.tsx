import { supabaseAdmin } from '@/lib/supabase-admin';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { RepairDataButton } from './repair-button';
import ClassList from './class-list';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ClassesPage() {
    // Fetch Classes
    const { data: classes, error } = await supabaseAdmin
        .from('classes')
        .select('*')
        .is('deleted_at', null);



    // const classes: any[] = [
    //     { id: '1', name: 'DEBUG_CLASS_TEST', branch: '1호점', day_of_week: '월요일', start_time: '10:00', end_time: '11:00', session: '1차', capacity: 10 }
    // ];
    // const error: any = null;

    console.log('--- DEBUG: Classes Page Fetch ---');
    if (classes && classes.length > 0) {
        console.log(`Fetched ${classes.length} classes.`);
        console.log(`First Class Name from DB: ${classes[0].name}`);
        const target = classes.find(c => c.name.includes('2호점'));
        if (target) console.log(`Sample Target Class: ${target.name}`);
    } else {
        console.log('No classes or error:', error);
    }

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

            <ClassList initialClasses={sortedClasses} enrollmentCounts={enrollmentCounts} />
        </div>
    );
}

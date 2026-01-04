import { supabaseAdmin } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import StudentListClient from './student-list-client';

export const revalidate = 0; // Disable cache for now

export default async function StudentsPage() {
    const { data: students, error } = await supabaseAdmin
        .from('students')
        .select('*, shuttle_schedules(*)')
        .neq('status', 'deleted')
        .order('name');

    if (error) {
        return <div className="text-red-500">Error loading students: {error.message}</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header moved to StudentListClient to handle Modal state */}
            <StudentListClient initialStudents={students || []} />
        </div>
    );
}

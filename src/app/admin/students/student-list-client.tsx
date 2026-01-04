'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { StudentDetailSheet } from './student-detail-sheet';
import { StudentFormDialog } from '@/components/admin/students/student-form-dialog';
import { toast } from 'sonner';
import { deleteStudent } from '@/app/actions/student-actions';

interface Student {
    id: string;
    name: string;
    gender?: string;
    grade?: string;
    school?: string;
    student_phone?: string;
    parent_name?: string;
    parent_phone?: string;
    address?: string;
    birth_date?: string;
    note?: string;
    shuttle_route?: string; // Added
    created_at?: string;
}

interface StudentListClientProps {
    initialStudents: Student[];
}

export default function StudentListClient({ initialStudents }: StudentListClientProps) {
    const router = useRouter(); // For refreshing data
    const [students, setStudents] = useState<Student[]>(initialStudents);
    const [searchQuery, setSearchQuery] = useState('');

    // Sheet State (Read-only Detail)
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Form Dialog State (Create/Edit)
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | undefined>(undefined);

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (query.trim() === '') {
            setStudents(initialStudents);
        } else {
            const lowerQuery = query.toLowerCase();
            const filtered = initialStudents.filter(student =>
                student.name.toLowerCase().includes(lowerQuery) ||
                (student.student_phone && student.student_phone.includes(query)) ||
                (student.parent_name && student.parent_name.toLowerCase().includes(lowerQuery)) ||
                (student.parent_phone && student.parent_phone.includes(query))
            );
            setStudents(filtered);
        }
    };

    const handleSelectStudent = (student: Student) => {
        setSelectedStudent(student);
        setIsSheetOpen(true);
    };

    const handleAddStudent = () => {
        setEditingStudent(undefined);
        setIsFormOpen(true);
    };

    const handleEditStudent = (e: React.MouseEvent, student: Student) => {
        e.stopPropagation(); // Prevent row click
        setEditingStudent(student);
        setIsFormOpen(true);
    };

    const handleDeleteStudent = async (e: React.MouseEvent, studentId: string) => {
        e.stopPropagation();
        if (!confirm('정말 삭제하시겠습니까?')) return;

        try {
            const result = await deleteStudent(studentId);
            if (result.success) {
                toast.success('학생이 삭제되었습니다.');
                router.refresh();
            } else {
                toast.error('삭제 실패: ' + result.error);
            }
        } catch (err) {
            toast.error('오류 발생');
        }
    };

    const handleFormSuccess = () => {
        router.refresh(); // Refresh server data
        // For smoother UX, we could optimistically update 'students' state here too, but refresh is safer
    };

    // Filter students based on search query
    const filteredStudents = initialStudents.filter((student) => {
        const query = searchQuery.toLowerCase();
        return (
            student.name.toLowerCase().includes(query) ||
            student.school?.toLowerCase().includes(query) ||
            student.parent_name?.toLowerCase().includes(query) ||
            student.parent_phone?.includes(query)
        );
    });

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                <h2 className="text-xl font-bold tracking-tight text-gray-800">학생 관리</h2>
                <Button onClick={handleAddStudent} className="bg-blue-600 hover:bg-blue-700">
                    <PlusCircle className="mr-2 h-4 w-4" /> 학생 등록
                </Button>
            </div>

            <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="이름, 학교, 학부모 이름 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            <div className="border rounded-lg border-gray-200 bg-white overflow-hidden shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50 border-b border-gray-100 hover:bg-gray-50/50">
                            <TableHead className="w-[80px] text-xs font-semibold text-gray-500 uppercase tracking-wider pl-6">Grade</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Student Info</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Guardian</TableHead>
                            <TableHead className="w-[120px] text-right pr-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredStudents.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-16 text-gray-400">
                                    등록된 학생이 없거나 검색 결과가 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredStudents.map((student) => (
                                <TableRow
                                    key={student.id}
                                    className="cursor-pointer hover:bg-blue-50/50 border-b border-gray-50 last:border-0 group transition-colors"
                                    onClick={() => handleSelectStudent(student)}
                                >
                                    <TableCell className="pl-6 py-4 align-top">
                                        <div className="flex items-center mt-1">
                                            <span className={`inline-flex items-center justify-center min-w-[3rem] px-2 py-1 rounded text-[11px] font-bold border ${student.shuttle_route ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                                {student.grade || '미정'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 align-top">
                                        <div className="flex flex-col space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[15px] font-semibold text-gray-900 leading-none">
                                                    {student.name}
                                                </span>
                                                {student.shuttle_route && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-medium">
                                                        🚌 {student.shuttle_route}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[13px] text-gray-400 font-normal">
                                                {student.school}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 align-top">
                                        <span className="text-[13px] text-gray-500 font-mono tracking-tight">
                                            {student.student_phone || '-'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-4 align-top">
                                        <div className="flex flex-col space-y-0.5">
                                            <span className="text-[13px] text-gray-700 font-medium">
                                                {student.parent_name}
                                            </span>
                                            <span className="text-[11px] text-gray-400 font-mono">
                                                {student.parent_phone}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 align-middle text-right pr-6">
                                        <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleEditStudent(e, student);
                                                }}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleDeleteStudent(e, student.id);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <StudentDetailSheet
                student={selectedStudent}
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
            />

            <StudentFormDialog
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                student={editingStudent}
                onSuccess={handleFormSuccess}
            />
        </div>
    );
}

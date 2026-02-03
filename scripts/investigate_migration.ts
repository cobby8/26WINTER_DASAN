
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function investigate() {
    // fs removed
    const foundData: any = { students: [], sourceClass: null, targetClass: null, enrollments: [] };

    console.log('--- START ---');

    // 1. Students
    const studentNames = ['박준수', '박준서'];
    const { data: students } = await supabase
        .from('students')
        .select('id, name')
        .in('name', studentNames);

    if (students) foundData.students = students;

    // 2. Classes
    // We are looking for FRIDAY classes.
    // Source: 1호점 2교시(초등저) 11:00~12:20
    // Target: 2호점 2교시(초등저) 11:00~12:20

    // Fetch all Friday classes that match the time
    const { data: classes } = await supabase
        .from('classes')
        .select('id, name, branch')
        .ilike('name', '%금요일%')
        .ilike('name', '%11:00%');

    if (classes) {
        classes.forEach(c => {
            if (c.name.includes('1호점')) {
                foundData.sourceClass = { id: c.id, name: c.name };
            }
            if (c.name.includes('2호점')) {
                foundData.targetClass = { id: c.id, name: c.name };
            }
        });
    }

    // 3. Enrollments
    if (students && students.length > 0) {
        const studentIds = students.map(s => s.id);
        const { data: enrollments } = await supabase
            .from('enrollments')
            .select(`
                student_id,
                class_id,
                classes ( name )
            `)
            .in('student_id', studentIds);

        if (enrollments) {
            enrollments.forEach(e => {
                // @ts-ignore
                const cName = e.classes?.name;
                if (cName.includes('금요일')) {
                    foundData.enrollments.push({
                        studentId: e.student_id,
                        classId: e.class_id,
                        className: cName
                    });
                }
            });
        }
    }

    console.log('<<<JSON_START>>>');
    console.log(JSON.stringify(foundData, null, 2));
    console.log('<<<JSON_END>>>');
}

investigate();

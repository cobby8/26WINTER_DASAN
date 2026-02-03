
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env from root
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkJan30() {
    console.log('--- CHECKING JAN 30 (FRIDAY) STATUS ---');

    let report = '--- JAN 30 (FRI) STATUS REPORT ---\n';

    // 1. Get Active Schedules for Friday
    const { data: active, error: activeError } = await supabase
        .from('shuttle_schedules')
        .select(`
            id, 
            time, 
            type, 
            student_id, 
            students (name)
        `)
        .eq('day_of_week', 'Fri')
        .is('deleted_at', null)
        .order('time');

    if (activeError) {
        console.error('Active Fetch Error:', activeError);
        return;
    }

    report += `\n[1. Active Schedules] (Total: ${active?.length})\n`;
    active?.forEach(s => {
        const name = (s.students as any)?.name || (s.student_id ? 'Unknown' : 'System');
        report += `${s.time} - ${name} (${s.type})\n`;
    });

    // 2. Get Deleted Schedules for Friday
    const { data: deleted, error: deletedError } = await supabase
        .from('shuttle_schedules')
        .select(`
            id, 
            time, 
            type, 
            deleted_at,
            students (name)
        `)
        .eq('day_of_week', 'Fri')
        .not('deleted_at', 'is', null)
        .order('time');

    if (deletedError) {
        console.error('Deleted Fetch Error:', deletedError);
        return;
    }

    report += `\n[2. Deleted/Hidden Schedules] (Total: ${deleted?.length})\n`;
    deleted?.forEach(s => {
        const name = (s.students as any)?.name || 'System';
        report += `${s.time} - ${name} (${s.type}) [Deleted At: ${s.deleted_at}]\n`;
    });

    // 3. Check specific students from screenshot
    const namesToCheck = ['류민결', '권희윤', '김도운', '김남준'];
    report += `\n[3. Key Student Status]\n`;

    for (const name of namesToCheck) {
        const { data: student } = await supabase.from('students').select('*').eq('name', name);
        if (student && student.length > 0) {
            report += `- ${name}: Found ${student.length} student record(s).\n`;
            // Check schedules
            const { data: userScheds } = await supabase
                .from('shuttle_schedules')
                .select('*')
                .in('student_id', student.map(s => s.id))
                .eq('day_of_week', 'Fri');

            userScheds?.forEach(s => {
                report += `  -> ${s.time} (${s.type}) is ${s.deleted_at ? 'DELETED' : 'ACTIVE'}\n`;
            });
            if (!userScheds || userScheds.length === 0) report += `  -> No Friday schedules found.\n`;
        } else {
            report += `- ${name}: NOT FOUND in Student DB.\n`;
        }
    }

    fs.writeFileSync('jan30_check_report.txt', report, 'utf8');
    console.log('Report written to jan30_check_report.txt');
}

checkJan30();

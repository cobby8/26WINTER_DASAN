
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env from root
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeDuplicates() {
    console.log('--- DUPLICATE ANALYSIS ---');

    // 1. Check for Duplicate Students (Same Name)
    const { data: students, error: studentError } = await supabase
        .from('students')
        .select('id, name, created_at');

    if (studentError) {
        console.error('Error fetching students:', studentError);
        return;
    }

    const nameMap: Record<string, typeof students> = {};
    students?.forEach(s => {
        if (!nameMap[s.name]) nameMap[s.name] = [];
        nameMap[s.name].push(s);
    });

    let report = '--- DUPLICATE ANALYSIS REPORT ---\n';

    report += '\n[1. Duplicate Students by Name]\n';
    let dupStudentCount = 0;
    Object.keys(nameMap).forEach(name => {
        if (nameMap[name].length > 1) {
            report += `- ${name}: ${nameMap[name].length} records\n`;
            nameMap[name].forEach(s => report += `   ID: ${s.id} (Created: ${s.created_at})\n`);
            dupStudentCount++;
        }
    });
    if (dupStudentCount === 0) report += 'No duplicate students found.\n';


    // 2. Check for Duplicate Schedules (Same Student + Day + Time + Type)
    // We fetch ALL schedules
    const { data: schedules, error: schedError } = await supabase
        .from('shuttle_schedules')
        .select('id, student_id, day_of_week, time, type, deleted_at, students(name)')
        .is('deleted_at', null);

    if (schedError) {
        console.error('Error fetching schedules:', schedError);
        return;
    }

    report += `\n[2. Duplicate Schedules (Same ID)] (Total Active: ${schedules?.length})\n`;

    // Group by unique key
    const scheduleMap: Record<string, typeof schedules> = {};
    schedules?.forEach(s => {
        // Key: student_id + day + time + type
        const key = `${s.student_id}-${s.day_of_week}-${s.time}-${s.type}`;
        if (!scheduleMap[key]) scheduleMap[key] = [];
        scheduleMap[key].push(s);
    });

    let dupScheduleCount = 0;
    Object.keys(scheduleMap).forEach(key => {
        if (scheduleMap[key].length > 1) {
            const first = scheduleMap[key][0];
            const name = (first.students as any)?.name || 'Unknown';
            report += `- [${name}] ${first.day_of_week} ${first.time} (${first.type}): ${scheduleMap[key].length} copies\n`;
            dupScheduleCount += (scheduleMap[key].length - 1);
        }
    });
    report += `Found ${dupScheduleCount} excess duplicate schedule rows.\n`;

    // 3. Deeper Analysis: Same Name (Different ID) + Same Schedule
    report += '\n[3. Logical Duplicates (Same Name, Diff ID)]\n';

    // Make a map of Name -> Schedules
    const logicalMap: Record<string, string[]> = {};
    let logicalDupCount = 0;

    schedules?.forEach(s => {
        const name = (s.students as any)?.name;
        if (!name) return;

        // Key: Name + Day + Time + Type
        const key = `${name}-${s.day_of_week}-${s.time}-${s.type}`;
        if (!logicalMap[key]) logicalMap[key] = [];
        logicalMap[key].push(s.student_id);
    });

    Object.keys(logicalMap).forEach(key => {
        const ids = [...new Set(logicalMap[key])]; // Unique IDs having this schedule
        if (ids.length > 1) {
            report += `- ${key}: Exists for ${ids.length} different Student IDs (${ids.join(', ')})\n`;
            logicalDupCount++;
        }
    });
    report += `Found ${logicalDupCount} logical duplicates.\n`;

    fs.writeFileSync('duplicate_analysis_report.txt', report, 'utf8');
    console.log('Report written to duplicate_analysis_report.txt');
}

analyzeDuplicates();

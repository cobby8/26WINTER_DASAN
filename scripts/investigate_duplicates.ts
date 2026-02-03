
import { supabaseAdmin } from '../src/lib/supabase';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

console.log(`Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Loaded' : 'Missing'}`);
console.log(`Supabase Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Loaded' : 'Missing'}`);

async function investigate() {
    console.log('--- Analyzing Duplicates (File Output) ---');
    let report = '# Duplicate Investigation Report\n\n';

    // 1. Check Student Duplicates (ByName)
    const { data: students, error: sErr } = await supabaseAdmin
        .from('students')
        .select('id, name, student_phone, parent_phone, created_at')
        .is('deleted_at', null);

    if (sErr) {
        console.error('Student Fetch Error:', sErr);
        report += `Student Fetch Error: ${sErr.message}\n`;
    }

    const nameMap = new Map<string, any[]>();
    students?.forEach(s => {
        const key = s.name.trim();
        if (!nameMap.has(key)) nameMap.set(key, []);
        nameMap.get(key)!.push(s);
    });

    report += `[Students] Total Active: ${students?.length}\n`;
    let dupStudents = 0;
    for (const [name, list] of nameMap) {
        if (list.length > 1) {
            report += `Duplicate Student: ${name} (Count: ${list.length})\n`;
            list.forEach(s => report += `  - ID: ${s.id}, Created: ${s.created_at}, Phone: ${s.student_phone}/${s.parent_phone}\n`);
            dupStudents++;
        }
    }
    if (dupStudents === 0) report += 'No duplicate students found by Name.\n';


    // 2. Check Shuttle Schedule Duplicates
    const { data: schedules, error: schErr } = await supabaseAdmin
        .from('shuttle_schedules')
        .select('*, students(name)')
        .is('deleted_at', null);

    if (schErr) {
        console.error('Schedule Fetch Error:', schErr);
        report += `Schedule Fetch Error: ${schErr.message}\n`;
    }

    report += `\n[Schedules] Total Active: ${schedules?.length}\n`;

    // Group by Student + Day + Time
    const scheduleMap = new Map<string, any[]>();
    schedules?.forEach(s => {
        // Key: StudentID - Day - Time
        const key = `${s.student_id}-${s.day_of_week}-${s.time}`;
        if (!scheduleMap.has(key)) scheduleMap.set(key, []);
        scheduleMap.get(key)!.push(s);
    });

    let dupSchedules = 0;
    for (const [key, list] of scheduleMap) {
        if (list.length > 1) {
            const studentName = list[0].students?.name || 'Unknown';
            report += `Duplicate Schedule for ${studentName} (${key}) - Count: ${list.length}\n`;
            list.forEach(s => report += `  - ID: ${s.id}, Created: ${s.created_at}, Type: ${s.type}\n`);
            dupSchedules++;
        }
    }

    if (dupSchedules === 0) report += 'No exact duplicate schedules found.\n';

    // 3. Check "Sang Yun-ho" specifically
    const targetName = '상윤호';
    report += `\n--- Deep Dive: ${targetName} ---\n`;
    const targetStudents = students?.filter(s => s.name === targetName) || [];
    report += `Students named ${targetName}: ${targetStudents.length}\n`;

    for (const s of targetStudents) {
        const sScheds = schedules?.filter(sch => sch.student_id === s.id) || [];
        report += `  Student ID ${s.id} has ${sScheds.length} schedules.\n`;
        sScheds.forEach(sch => report += `    - ${sch.day_of_week} ${sch.time} (${sch.type}) [ID: ${sch.id}]\n`);
    }

    fs.writeFileSync('duplicate_report.md', report, 'utf8');
    console.log('Report written to duplicate_report.md');
}

investigate();

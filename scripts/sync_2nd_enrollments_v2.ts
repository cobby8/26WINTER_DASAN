
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

interface ParsedStudent {
    name: string;
    gender: string;
    grade: string;
    birthDate: string;
    school: string;
    parentName: string;
    studentPhone: string;
    parentPhone: string;
    address: string;
    note: string;
}

interface ParsedEnrollment {
    session: string;
    branch: string; // Default branch from '지점' col
    desiredClasses: { day: string, time: string, cellText: string }[];
    shuttleRaw: string;
}

class StandaloneSheetService {
    private auth;
    private sheetId: string;

    constructor() {
        this.auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        this.sheetId = process.env.GOOGLE_SHEET_ID || '';
    }

    async fetchRawData(sheetName: string): Promise<any[]> {
        const sheets = google.sheets({ version: 'v4', auth: this.auth });
        const range = `${sheetName}!A1:AZ2000`;

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: this.sheetId,
            range: range,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) return [];

        let headerRowIdx = 0;
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
            const row = rows[i];
            if (row.some(c => c && (c.includes('이름') || c.includes('성명') || c.includes('수강생')))) {
                headerRowIdx = i;
                break;
            }
        }

        const headers = rows[headerRowIdx];
        const data = rows.slice(headerRowIdx + 1);
        console.log(`[SheetService] Headers found at row ${headerRowIdx + 1}.`);

        return data.map((row) => {
            const rowObject: any = {};
            headers.forEach((header, index) => {
                if (header) rowObject[header.trim()] = row[index] || '';
            });
            return rowObject;
        });
    }

    parseRow(row: any): { student: ParsedStudent; enrollment: ParsedEnrollment } {
        const keys = Object.keys(row);
        const findVal = (terms: string[]) => {
            const key = keys.find(k => terms.some(t => k.includes(t)));
            return key ? (row[key] as string)?.trim() : '';
        };

        const student: ParsedStudent = {
            name: findVal(['수강생 이름', '학생 이름', '성명']),
            gender: findVal(['수강생 성별', '성별']),
            grade: findVal(['학년']),
            birthDate: findVal(['생년월일']),
            school: findVal(['학교']),
            parentName: findVal(['학부모 이름', '학부모 성함', '학부모']),
            studentPhone: findVal(['수강생 전화번호', '학생 연락처']).replace(/[^0-9]/g, ''),
            parentPhone: findVal(['학부모 전화번호', '학부모 연락처']).replace(/[^0-9]/g, ''),
            address: findVal(['주소']),
            note: findVal(['비고', '요청사항', '바라는 점']),
        };

        const desiredClasses: { day: string, time: string, cellText: string }[] = [];
        const days = ['월', '화', '수', '목', '금', '토', '일'];

        days.forEach(day => {
            const dayKeys = keys.filter(k => k.trim() === day || k.trim() === day + '요일');

            dayKeys.forEach(dayKey => {
                const timeVal = row[dayKey] as string;
                if (!timeVal) return;

                const timeMatch = timeVal.match(/(\d{1,2}:\d{2})/);
                if (timeMatch) {
                    desiredClasses.push({
                        day: day + '요일',
                        time: timeMatch[1].padStart(5, '0'),
                        cellText: timeVal
                    });
                }
            });
        });

        let branch = findVal(['지점을 선택해주세요', '지점']) || '1호점';
        if (branch.includes('1호점')) branch = '1호점';
        else if (branch.includes('2호점')) branch = '2호점';
        else branch = '1호점';

        const enrollment: ParsedEnrollment = {
            session: '2차',
            branch: branch,
            desiredClasses,
            shuttleRaw: findVal(['셔틀탑승 여부', '셔틀탑승', '차량운행']) || ''
        };

        return { student, enrollment };
    }
}

async function sync2ndEnrollmentsV2() {
    console.log('--- Syncing Enrollments V2 (Strict Link Only) ---');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const sheetService = new StandaloneSheetService();
    const sheetName = '26겨울방학특강2차';

    // 0. FORCE RESTORE to ensure they are active
    console.log('Force restoring 2nd session classes before sync...');
    const { error: restoreError } = await supabase
        .from('classes')
        .update({ deleted_at: null })
        .eq('session', '2차');

    if (restoreError) console.error('Restore failed:', restoreError.message);
    else console.log('Classes restored.');

    // 1. Fetch DB Classes (Fetch FIRST to ensure we have them)
    const { data: allClasses } = await supabase
        .from('classes')
        .select('id, branch, start_time, day_of_week')
        .eq('session', '2차'); // Strict session check
    // .is('deleted_at', null); // Don't even filter by null, we just restored them.

    if (!allClasses || allClasses.length === 0) {
        console.error('No classes found in DB even after restore!');
        return;
    }
    console.log(`Loaded ${allClasses.length} classes for linking.`);

    let rawRows;
    try {
        rawRows = await sheetService.fetchRawData(sheetName);
        console.log(`Fetched ${rawRows.length} rows.`);
    } catch (e: any) {
        console.error('Error fetching sheet:', e.message);
        return;
    }

    if (rawRows.length === 0) return;

    // (Moved DB fetch to top)

    let processedCount = 0;
    let failCount = 0;
    let createdStudents = 0;

    let debugLogCount = 0;

    for (const row of rawRows) {
        const { student, enrollment } = sheetService.parseRow(row);
        if (!student.name) continue;

        if (debugLogCount < 1) {
            // Just log to console lightly
            console.log('Sample Sheet Target:', JSON.stringify(enrollment.desiredClasses[0]), 'Branch:', enrollment.branch);
            debugLogCount++;
        }

        // 1. Upsert Student
        const { data: sData, error: sError } = await supabase
            .from('students')
            .upsert({
                name: student.name,
                gender: student.gender || null,
                grade: student.grade || null,
                student_phone: student.studentPhone || null,
                parent_phone: student.parentPhone || null,
                school: student.school || null,
                address: student.address || null,
                note: student.note || null,
                deleted_at: null
            }, { onConflict: 'name, parent_phone' })
            .select('id')
            .single();

        if (sError) {
            console.error(`Student Error (${student.name}):`, sError.message);
            continue;
        }
        createdStudents++;
        const studentId = sData.id;

        // 2. Link to Classes
        for (const cls of enrollment.desiredClasses) {
            let targetBranch = enrollment.branch;
            if (cls.cellText.includes('1호점')) targetBranch = '1호점';
            else if (cls.cellText.includes('2호점')) targetBranch = '2호점';

            // Find matching class in memory
            // Match criteria: Day, Branch, StartTime (prefix match to handle :00)
            const matchedClass = allClasses.find(c =>
                c.day_of_week === cls.day &&
                c.branch === targetBranch &&
                c.start_time.startsWith(cls.time)
            );

            if (matchedClass) {
                const shuttleVal = enrollment.shuttleRaw;
                const isShuttle = shuttleVal === '탑승' || shuttleVal === 'O' || (shuttleVal?.includes('이용') && !shuttleVal?.includes('미') && !shuttleVal?.includes('X'));

                await supabase.from('enrollments').upsert({
                    student_id: studentId,
                    class_id: matchedClass.id,
                    status: 'active',
                    shuttle_use: isShuttle
                }, { onConflict: 'student_id, class_id' });
                processedCount++;
            } else {
                console.warn(`[MISSING CLASS] Student: ${student.name}, Day: ${cls.day}, Time: ${cls.time}, Branch: ${targetBranch}`);
                failCount++;
            }
        }
    }

    console.log(`\n--- Summary ---`);
    console.log(`Students Processed/Upserted: ${createdStudents}`);
    console.log(`Enrollments Linked: ${processedCount}`);
    console.log(`Missing Class Links: ${failCount}`);
}

sync2ndEnrollmentsV2();

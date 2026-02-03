
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
        console.log(`[SheetService] Headers found at row ${headerRowIdx + 1}. First 3: ${headers.slice(0, 3).join(', ')}`);

        return data.map((row) => {
            const rowObject: any = {};
            headers.forEach((header, index) => {
                rowObject[header] = row[index] || '';
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
        // Headers are exactly "월", "화" etc based on debugging
        const days = ['월', '화', '수', '목', '금', '토', '일'];

        days.forEach(day => {
            // Search for Exact Match OR "Key that equals Day + 요일"
            const dayKey = keys.find(k => k.trim() === day || k.trim() === day + '요일');

            if (dayKey) {
                const timeVal = row[dayKey] as string;
                if (!timeVal) return;

                // Parse Time (HH:MM)
                const timeMatch = timeVal.match(/(\d{1,2}:\d{2})/);
                if (timeMatch) {
                    desiredClasses.push({
                        day: day + '요일', // Normalize to DB standard
                        time: timeMatch[1].padStart(5, '0'),
                        cellText: timeVal
                    });
                }
            }
        });

        let branch = findVal(['지점을 선택해주세요', '지점']) || '1호점';
        // Clean branch string "1호점 : 새봄중학교 앞" -> "1호점"
        if (branch.includes('1호점')) branch = '1호점';
        else if (branch.includes('2호점')) branch = '2호점';
        else branch = '1호점'; // Default

        const enrollment: ParsedEnrollment = {
            session: '2차',
            branch: branch,
            desiredClasses,
            shuttleRaw: findVal(['셔틀탑승 여부', '셔틀탑승', '차량운행']) || ''
        };

        return { student, enrollment };
    }
}

async function sync2ndEnrollments() {
    console.log('--- Syncing Enrollments with Class Auto-Creation (Robust) ---');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const sheetService = new StandaloneSheetService();
    const sheetName = '26겨울방학특강2차';

    let rawRows;
    try {
        rawRows = await sheetService.fetchRawData(sheetName);
        console.log(`Fetched ${rawRows.length} rows.`);
    } catch (e: any) {
        console.error('Error fetching sheet:', e.message);
        return;
    }

    if (rawRows.length === 0) return;

    // --- PHASE 1: Sync Classes ---
    // Extract unique classes from Sheet and ensure they exist in DB
    const uniqueClasses = new Map<string, { day: string, time: string, branch: string, session: string, name: string }>();

    for (const row of rawRows) {
        const { enrollment } = sheetService.parseRow(row);
        for (const cls of enrollment.desiredClasses) {
            // Determine Branch from Cell Text if possible
            let branch = enrollment.branch;
            if (cls.cellText.includes('1호점')) branch = '1호점';
            else if (cls.cellText.includes('2호점')) branch = '2호점';

            // Key: Day-Time-Branch
            const key = `${cls.day}-${cls.time}-${branch}`;
            if (!uniqueClasses.has(key)) {
                // Construct logic Name: [2차/1호점] 겨울방학특강 월요일 10:30
                const name = `[2차/${branch}] 겨울방학특강 ${cls.day} ${cls.time}`;
                uniqueClasses.set(key, {
                    day: cls.day,
                    time: cls.time, // HH:MM
                    branch: branch,
                    session: '2차',
                    name: name
                });
            }
        }
    }

    console.log(`Found ${uniqueClasses.size} unique classes in Sheet. Ensuring they exist in DB...`);

    for (const [key, val] of uniqueClasses) {
        // Check existence
        // We use loose time matching + strict others
        // We assume DB time is HH:MM:00 or HH:MM
        // We match `start_time` startsWith(val.time)
        const { data: existing, error } = await supabase
            .from('classes')
            .select('id')
            .eq('day_of_week', val.day)
            .eq('branch', val.branch)
            .eq('session', val.session)
            .eq('start_time', val.time + ':00') // Partial match for time
            .is('deleted_at', null)
            .maybeSingle();

        if (!existing) {
            console.log(`Creating missing class: ${val.name}`);
            const { error: insertError } = await supabase.from('classes').insert({
                name: val.name,
                day_of_week: val.day,
                start_time: val.time + ':00', // Ensure DB format
                end_time: addMinutes(val.time, 80), // Approx duration 80m? Or 1hr 20m. 10:30~11:50 is 80m.
                session: val.session,
                branch: val.branch,
                capacity: 10 // Default
            });
            if (insertError) console.error(`Failed to create class ${val.name}:`, insertError.message);
        }
    }

    // --- PHASE 2: Enrollments ---
    let processedCount = 0;
    fs.writeFileSync('debug_sync_output.txt', '--- Debug Log ---\n');

    for (const row of rawRows) {
        const { student, enrollment } = sheetService.parseRow(row);
        if (!student.name) continue;

        // Upsert Student
        const { data: sData, error: sError } = await supabase
            .from('students')
            .upsert({
                name: student.name,
                gender: student.gender || null, // Handle empty string
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
            // console.error(`Student Error (${student.name}):`, sError.message);
            // If parent_phone is missing/duplicate, standard error.
            continue;
        }
        const studentId = sData.id;

        for (const cls of enrollment.desiredClasses) {
            let branch = enrollment.branch;
            if (cls.cellText.includes('1호점')) branch = '1호점';
            else if (cls.cellText.includes('2호점')) branch = '2호점';

            // Find Class
            const { data: classData, error: classError } = await supabase
                .from('classes')
                .select('id, branch, start_time')
                .eq('day_of_week', cls.day)
                .eq('branch', branch)
                .eq('session', '2차')
                .eq('start_time', `${cls.time}:00`)
                .is('deleted_at', null)
                .maybeSingle();

            if (classData) {
                const shuttleVal = enrollment.shuttleRaw;
                // Strict check for '탑승'
                const isShuttle = shuttleVal === '탑승' || shuttleVal === 'O' || (shuttleVal?.includes('이용') && !shuttleVal?.includes('미'));

                // Debug log for first few
                if (processedCount < 5) console.log(`[Shuttle Check] Name: ${student.name}, Raw: "${shuttleVal}", Result: ${isShuttle}`);

                await supabase.from('enrollments').upsert({
                    student_id: studentId,
                    class_id: classData.id,
                    status: 'active',
                    shuttle_use: isShuttle
                }, { onConflict: 'student_id, class_id' });
                processedCount++;
            } else {
                const msg = `FAIL: ${student.name} [${cls.day}] [${cls.time}] [${branch}]`;
                console.warn(msg);
                fs.appendFileSync('debug_sync_output.txt', msg + '\n');

                // Diagnosis: List ALL classes for this day/session to see what matches
                const { data: allDayClasses } = await supabase
                    .from('classes')
                    .select('id, branch, start_time, day_of_week')
                    .eq('day_of_week', cls.day)
                    .eq('session', '2차')
                    .is('deleted_at', null);

                if (allDayClasses && allDayClasses.length > 0) {
                    const list = allDayClasses.map(c => `(Branch: "${c.branch}", Time: "${c.start_time}")`).join(', ');
                    fs.appendFileSync('debug_sync_output.txt', `  -> Available classes on ${cls.day}: ${list}\n`);
                } else {
                    fs.appendFileSync('debug_sync_output.txt', `  -> ZERO classes found for ${cls.day} in 2nd session.\n`);
                }
            }
        }
    }

    console.log(`Sync Finished. Enrollments processed: ${processedCount}`);
}

function addMinutes(timeStr: string, mins: number): string {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m + mins, 0);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:00`;
}

sync2ndEnrollments();

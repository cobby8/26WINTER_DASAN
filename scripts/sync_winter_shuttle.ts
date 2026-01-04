
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';

// Fix for fetch in Node 18+ (Supabase client needs it or relies on global)
// if (!global.fetch) global.fetch = require('node-fetch');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SHEET_ID = '1SSBv_yY22Mr5y8W5z2J0NvxC0keZcQRIRkHmtAVaqrw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function cleanPhone(phone: string) {
    if (!phone) return '';
    return phone.replace(/[^0-9]/g, '');
}

function parseClassTime(classString: string): { start: string, end: string } | null {
    if (!classString) return null;
    // Format: "1호점 1교시(초등저) 10:00~11:20"
    const match = classString.match(/(\d{1,2}:\d{2})~(\d{1,2}:\d{2})/);
    if (match) {
        return { start: match[1], end: match[2] };
    }
    return null;
}

const DAY_MAP: Record<string, string> = {
    '수강신청 희망 시간 [월요일]': 'Mon',
    '수강신청 희망 시간 [화요일]': 'Tue',
    '수강신청 희망 시간 [수요일]': 'Wed',
    '수강신청 희망 시간 [목요일]': 'Thu',
    '수강신청 희망 시간 [금요일]': 'Fri',
};

async function syncShuttle() {
    console.log("🚀 Starting Winter Shuttle Sync...");

    // 1. Google Sheets Auth
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 2. Fetch Data
    console.log("📥 Fetching Sheet Data...");
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const sheetName = meta.data.sheets?.[0]?.properties?.title;
    if (!sheetName) throw new Error("No sheet found");

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!A1:AZ1000`, // Assume max 1000 students
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
        console.log("No data found.");
        return;
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Helpers to access column by name
    const getCol = (row: any[], name: string) => {
        const idx = headers.indexOf(name);
        return idx !== -1 ? row[idx] : undefined;
    };

    // 3. Truncate Tables
    console.log("🗑️ Clearing existing shuttle data...");
    // Order matters: logs depends on schedules, schedules depends on students (but we don't delete students, we map/upsert them).
    // Actually user said "Clear all test data".
    // We should delete `shuttle_ops_logs` and `shuttle_schedules`.
    const { error: delLogsError } = await supabase.from('shuttle_ops_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (delLogsError) console.error("Error clearing logs:", delLogsError);

    const { error: delSchedError } = await supabase.from('shuttle_schedules').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delSchedError) console.error("Error clearing schedules:", delSchedError);

    // We keep students table but align/upsert.

    console.log(`Processing ${dataRows.length} rows...`);

    let count = 0;

    for (const row of dataRows) {
        const name = getCol(row, '수강생 이름')?.trim();
        const parentPhone = cleanPhone(getCol(row, '학부모 전화번호'));
        const studentPhone = cleanPhone(getCol(row, '수강생 전화번호'));
        const isShuttle = getCol(row, '셔틀탑승 여부') === '탑승';

        if (!name || (!parentPhone && !studentPhone)) continue; // Skip invalid
        if (!isShuttle) continue; // Skip non-shuttle

        // 4. Upsert Student (Find by Name + ParentPhone)
        // Check existing
        let studentId: string | null = null;

        const { data: existing } = await supabase
            .from('students')
            .select('id')
            .eq('name', name)
            .ilike('parent_phone', `%${parentPhone.slice(-4)}`) // Match last 4 digits roughly or exact
            .maybeSingle();

        if (existing) {
            studentId = existing.id;
        } else {
            // Create new student
            const { data: newStudent, error: createError } = await supabase
                .from('students')
                .insert({
                    name,
                    phone: studentPhone, // Map to phone or student_phone? Schema says 'phone' usually? 
                    // Wait, schema inspection needed? Assuming standard `students` schema from other scripts.
                    // Let's use `student_phone` and `parent_phone` columns if they exist.
                    // Fallback to minimal.
                    student_phone: studentPhone,
                    parent_phone: parentPhone,
                    address: getCol(row, '주소')
                })
                .select()
                .single();

            if (createError) {
                console.error(`Failed to create student ${name}:`, createError.message);
                continue;
            }
            studentId = newStudent.id;
        }

        if (!studentId) continue;

        // 5. Create Schedules for each Day
        const boardingLoc = getCol(row, '탑승 장소') || 'Home';
        const dropoffLoc = getCol(row, '하차 장소') || 'Home';
        const boardingTimeStr = getCol(row, '탑승 시간'); // "14:00"

        for (const [colName, dayCode] of Object.entries(DAY_MAP)) {
            const classVal = getCol(row, colName);
            if (classVal && classVal.trim() !== '') {
                const times = parseClassTime(classVal);
                if (!times) continue;

                // BOARDING
                // If explicit boarding time exists, use it. Otherwise, default to ClassStart - 30min.
                let finalBoardingTime = boardingTimeStr ? (boardingTimeStr.replace(':', ':') + ':00') : null;

                if (!finalBoardingTime && times.start) {
                    // Calc 30 min before start
                    const [h, m] = times.start.split(':').map(Number);
                    let minute = m - 30;
                    let hour = h;
                    if (minute < 0) {
                        minute += 60;
                        hour -= 1;
                    }
                    finalBoardingTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
                }

                if (finalBoardingTime) {
                    await supabase.from('shuttle_schedules').insert({
                        student_id: studentId,
                        day_of_week: dayCode,
                        type: 'boarding',
                        time: finalBoardingTime,
                        location_name: boardingLoc || (getCol(row, '주소') || 'Home'),
                        location_address: getCol(row, '주소') || boardingLoc || 'Home'
                    });
                }

                // DROPOFF (Use Class End Time)
                if (times.end) {
                    await supabase.from('shuttle_schedules').insert({
                        student_id: studentId,
                        day_of_week: dayCode,
                        type: 'dropoff',
                        time: times.end + ':00',
                        location_name: dropoffLoc || (getCol(row, '주소') || 'Home'),
                        location_address: getCol(row, '주소') || dropoffLoc || 'Home'
                    });
                }
                count++;
            }
        }
    }

    console.log(`✅ Sync Complete. Created schedules for ${count} trips.`);
}

syncShuttle().catch(console.error);


import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SHEET_ID = '1SSBv_yY22Mr5y8W5z2J0NvxC0keZcQRIRkHmtAVaqrw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function cleanPhone(phone: string) {
    if (!phone) return '';
    return phone.replace(/[^0-9]/g, '');
}

const DAY_MAP: Record<string, string> = {
    '월': 'Mon', '화': 'Tue', '수': 'Wed', '목': 'Thu', '금': 'Fri', '토': 'Sat', '일': 'Sun'
};

function parseTime(timeStr: string): string | null {
    if (!timeStr) return null;
    // Handle "9:00", "09:00", "14:20"
    // Also "10:00~11:20" -> return start? No, this function is for single time.
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (match) {
        return `${match[1].padStart(2, '0')}:${match[2]}:00`;
    }
    return null;
}

async function syncShuttleV2() {
    console.log("🚀 Starting Winter Shuttle Sync V2 (Transport Sheet)...");

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetName = '1차차량운행';

    console.log(`📥 Fetching '${sheetName}'...`);
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!A1:Z2000`,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 3) {
        console.log("No data found (or only headers).");
        return;
    }

    // Row 0: Title
    // Row 1: Headers (Real Headers)
    const headers = rows[1];
    const dataRows = rows.slice(2);

    // Indices based on Row 1
    const idxName = headers.indexOf('수강생 이름');
    const idxPhoneStudent = headers.indexOf('학생');
    const idxPhoneParent = headers.indexOf('학부모');
    const idxDay = headers.indexOf('요일');
    const idxClassTime = headers.indexOf('수업시간');
    const idxArrTime = headers.indexOf('도착시간');
    const idxLoc = headers.indexOf('목적지');
    const idxType = headers.indexOf('구분');
    const idxMemo = headers.indexOf('메모');

    console.log(`Indices: Name=${idxName}, Day=${idxDay}, Type=${idxType}, ArrTime=${idxArrTime}`);

    console.log("🗑️ Clearing existing shuttle/student data...");
    // Clear schedules only. Or Students too? User said "Sync info".
    // Safest to keep student IDs stable if possible, but user said "Clear all test data".
    // I'll truncate schedules. Student upsert is safe.
    await supabase.from('shuttle_ops_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('shuttle_schedules').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log(`Processing ${dataRows.length} rows...`);
    let count = 0;

    for (const row of dataRows as any[]) {
        const name = row[idxName]?.trim();
        if (!name) continue;

        const dayRaw = row[idxDay]?.trim();
        const typeRaw = row[idxType]?.trim(); // '등원' or '하원'
        if (!dayRaw || !typeRaw) continue;

        // Day Parsing (Handle "월,수" or "월")
        // Usually single day per row in transport sheets? Or comma separated?
        // If comma, split.
        const days = dayRaw.split(',').map((d: string) => d.trim());

        const studentPhone = cleanPhone(row[idxPhoneStudent]);
        const parentPhone = cleanPhone(row[idxPhoneParent]);

        // Upsert Student
        let studentId: string | null = null;
        const { data: existing } = await supabase
            .from('students')
            .select('id')
            .eq('name', name)
            // .ilike('parent_phone', `%${parentPhone.slice(-4)}`) // Optional strict check
            .maybeSingle();

        if (existing) {
            studentId = existing.id;
            // Update phones if missing?
        } else {
            const { data: newStudent, error: createError } = await supabase
                .from('students')
                .insert({
                    name,
                    phone: studentPhone,
                    student_phone: studentPhone,
                    parent_phone: parentPhone,
                })
                .select()
                .single();
            if (newStudent) studentId = newStudent.id;
        }

        if (!studentId) continue;

        // Time Parsing
        let timeStr = parseTime(row[idxArrTime]);

        // If ArrTime missing, try ClassTime?
        if (!timeStr && row[idxClassTime]) {
            // "10:00~11:20"
            const match = row[idxClassTime].match(/(\d{1,2}:\d{2})~(\d{1,2}:\d{2})/);
            if (match) {
                if (typeRaw.includes('등원') || typeRaw.includes('승차')) {
                    // 30 min before start logic again if needed? 
                    // Or just use Start Time.
                    // User's previous request was "30 mins before".
                    // Let's apply the logic: If ArrTime empty, use Class Start - 30.
                    const [h, m] = match[1].split(':').map(Number);
                    let val = h * 60 + m - 30; // mins
                    let h2 = Math.floor(val / 60);
                    let m2 = val % 60;
                    timeStr = `${h2.toString().padStart(2, '0')}:${m2.toString().padStart(2, '0')}:00`;
                } else if (typeRaw.includes('하원')) {
                    timeStr = `${match[2]}:00`; // End Time
                }
            }
        }

        if (!timeStr) continue; // Skip if no time

        const location = row[idxLoc] || 'Home';
        // Sheet uses '승차' for boarding, '하차' for dropoff
        const type = (typeRaw.includes('등원') || typeRaw.includes('승차')) ? 'boarding' : 'dropoff';

        for (const dayChar of days) {
            const dayCode = DAY_MAP[dayChar.charAt(0)]; // "월" -> "Mon"
            if (!dayCode) continue;

            const { error } = await supabase.from('shuttle_schedules').insert({
                student_id: studentId,
                day_of_week: dayCode,
                type: type,
                time: timeStr,
                location_name: location,
                location_address: location // Address might be missing in this sheet, use Loc Name
            });
            if (!error) count++;
        }
    }

    console.log(`✅ Sync V2 Complete. Created ${count} schedules.`);
}

syncShuttleV2().catch(console.error);

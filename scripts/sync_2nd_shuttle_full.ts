
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Day Map
const DAY_MAP: Record<string, string> = {
    '월': 'Mon',
    '화': 'Tue',
    '수': 'Wed',
    '목': 'Thu',
    '금': 'Fri',
    '토': 'Sat',
    '일': 'Sun',
    '월요일': 'Mon',
    '화요일': 'Tue',
    '수요일': 'Wed',
    '목요일': 'Thu',
    '금요일': 'Fri'
};

function normalizeTime(t: string): string | null {
    if (!t) return null;
    const match = t.match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;
    return `${match[1].padStart(2, '0')}:${match[2]}:00`;
}

async function syncShuttleFull() {
    console.log('--- Syncing 2nd Session Shuttle Full ---');

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = '2차차량운행';

    // Fetch All Data
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetName}!A2:M1000`, // Row 2 is Header
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
        console.log('No data found');
        return;
    }

    const headers = rows[0]; // Row 2 in Sheet is Index 0 here
    const dataRows = rows.slice(1);

    // Identify Columns Dynamically
    const findCol = (terms: string[]) => headers.findIndex((h: string) => terms.some(t => h.includes(t)));

    const COL_NAME = findCol(['학생', '이름', '성명']);
    const COL_DAY = findCol(['요일']);
    const COL_TIME = findCol(['도착시간', '시간']); // Prefer Arrival Time
    const COL_LOC = findCol(['목적지', '장소']);
    const COL_TYPE = findCol(['구분', '승하차']);

    console.log(`Dynamic Columns: Name=${COL_NAME}, Day=${COL_DAY}, Time=${COL_TIME}, Loc=${COL_LOC}, Type=${COL_TYPE}`);

    if (COL_NAME === -1 || COL_DAY === -1 || COL_TIME === -1 || COL_TYPE === -1) {
        console.error('Critical columns missing!');
        return;
    }

    console.log(`Processing ${dataRows.length} rows...`);

    // 1. Clear Existing Schedules?
    // User wants to sync THIS tab. Assuming replacement.
    console.log('Clearing existing shuttle schedules...');
    await supabase.from('shuttle_schedules').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    let count = 0;
    for (const row of dataRows) {
        const name = row[COL_NAME]?.trim();
        const dayRaw = row[COL_DAY]?.trim();
        const timeRaw = row[COL_TIME]?.trim();
        const loc = row[COL_LOC]?.trim();
        const typeRaw = row[COL_TYPE]?.trim(); // 승차 / 하차

        if (!name || !dayRaw || !timeRaw || !typeRaw) continue;

        // Map Day
        const dayCode = DAY_MAP[dayRaw] || DAY_MAP[dayRaw.replace('요일', '')];
        if (!dayCode) {
            console.warn(`Unknown day: ${dayRaw} for ${name}`);
            continue;
        }

        // Normalize Time
        const finalTime = normalizeTime(timeRaw);
        if (!finalTime) {
            console.warn(`Invalid time: ${timeRaw} for ${name}`);
            continue;
        }

        // Map Type
        let type = 'boarding';
        if (typeRaw.includes('하차')) type = 'dropoff';
        else if (typeRaw.includes('승차')) type = 'boarding';
        else {
            console.warn(`Unknown type: ${typeRaw} for ${name}`);
            continue;
        }

        // Find Student
        const { data: student } = await supabase
            .from('students')
            .select('id')
            .eq('name', name)
            .is('deleted_at', null)
            .maybeSingle();

        if (!student) {
            console.warn(`Student not found: ${name}`);
            continue;
        }

        // Insert Schedule
        const { error } = await supabase.from('shuttle_schedules').insert({
            student_id: student.id,
            day_of_week: dayCode,
            time: finalTime,
            type: type,
            location_name: loc || 'Unknown',
            location_address: loc
        });

        if (error) {
            console.error(`Failed to insert schedule for ${name}:`, error.message);
        } else {
            count++;
        }
    }

    console.log(`Synced ${count} shuttle schedule items.`);
}

syncShuttleFull();

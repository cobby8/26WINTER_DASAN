
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const TAB_NAME = '2차차량운행';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function cleanPhone(phone: string | undefined) {
    if (!phone) return '';
    return phone.replace(/[^0-9]/g, '');
}

const DAY_MAP: Record<string, string> = {
    '월': 'Mon', '화': 'Tue', '수': 'Wed', '목': 'Thu', '금': 'Fri', '토': 'Sat', '일': 'Sun'
};

function parseTime(timeStr: string): string | null {
    if (!timeStr) return null;
    // Format: HH:MM
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (match) {
        return `${match[1].padStart(2, '0')}:${match[2]}:00`;
    }
    return null;
}

async function importShuttle() {
    console.log(`🚀 Starting Shuttle Import from '${TAB_NAME}'...`);

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    let rows: any[] = [];
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${TAB_NAME}!A1:Z1000`,
        });
        rows = response.data.values || [];
    } catch (e: any) {
        console.error('❌ Failed to fetch sheet:', e.message);
        return;
    }

    if (rows.length < 2) {
        console.log('No data found.');
        return;
    }

    // Headers: 순번, 요일, 시간, 이름, 연락처, 장소, 목적지, 구분, 메모
    console.log('Row 0:', JSON.stringify(rows[0]));

    let headerRow = rows.find(r => r.some((c: string) => c.includes('이름')) && r.some((c: string) => c.includes('시간')));
    if (!headerRow) {
        console.log('Fuzzy match failed. Trying Row 0 hardcoded.');
        if (rows[0] && rows[0].includes('이름')) headerRow = rows[0];
    }

    if (!headerRow) {
        console.error('❌ Cannot find valid header row (must contain Name and Time). Dump:', JSON.stringify(rows.slice(0, 3)));
        return;
    }

    const headers = headerRow.map((h: string) => h.trim());
    const idxName = headers.indexOf('이름');
    const idxPhone = headers.indexOf('연락처'); // Check exact name? "연락처"
    const idxDay = headers.indexOf('요일');
    const idxTime = headers.indexOf('시간');
    const idxType = headers.indexOf('구분');
    const idxPlace = headers.indexOf('장소'); // or 목적지
    const idxDest = headers.indexOf('목적지');

    console.log(`Headers found: Name=${idxName}, Time=${idxTime}, Type=${idxType}, Place=${idxPlace}/${idxDest}`);

    const dataRows = rows.slice(rows.indexOf(headerRow) + 1);
    let successCount = 0;
    let skipCount = 0;

    for (const row of dataRows) {
        const name = row[idxName]?.trim();
        if (!name) continue;

        const timeRaw = row[idxTime]?.trim();
        const timeStr = parseTime(timeRaw);
        if (!timeStr) {
            console.log(`Skipping ${name}: Invalid time '${timeRaw}'`);
            continue;
        }

        const typeRaw = row[idxType]?.trim() || '';
        let type: 'boarding' | 'dropoff';
        if (typeRaw.includes('등원') || typeRaw.includes('승차')) type = 'boarding';
        else if (typeRaw.includes('하원') || typeRaw.includes('하차')) type = 'dropoff';
        else {
            console.log(`Skipping ${name}: Unknown type '${typeRaw}'`);
            continue;
        }

        // Location: Use Place first, then Dest
        // Usually Boarding -> Place is pickup point. Dropoff -> Dest is drop point?
        // Let's just use whichever is not empty or specifically designated.
        // Plan said: "장소 또는 목적지"
        let location = row[idxPlace]?.trim() || row[idxDest]?.trim() || 'Address Missing';

        // Day Parsing
        const dayRaw = row[idxDay]?.trim() || '';
        const dayChars = dayRaw.split(',').map((d: string) => d.trim().charAt(0)); // Take first char '월'

        // Find Student
        const phoneRaw = cleanPhone(row[idxPhone]);

        // Try precise match first
        let studentId = null;
        if (phoneRaw.length >= 4) {
            const { data: students } = await supabase
                .from('students')
                .select('id, name, parent_phone, student_phone')
                .eq('name', name);

            if (students && students.length > 0) {
                const match = students.find(s =>
                    (s.parent_phone && cleanPhone(s.parent_phone).endsWith(phoneRaw)) ||
                    (s.student_phone && cleanPhone(s.student_phone).endsWith(phoneRaw))
                );
                if (match) studentId = match.id;
                else {
                    // Fallback: if only 1 student with that name, assume it's them?
                    // No, "Safe Match" demanded.
                    if (students.length === 1 && phoneRaw.length < 9) {
                        // If searched by last 4 digits and only 1 candidate, maybe okay?
                        // Let's be strict.
                        console.warn(`[Ambiguous] ${name} found but phone ${phoneRaw} mismatch.`);
                    }
                }
            }
        } else {
            // No phone provided, try name only
            const { data: students } = await supabase
                .from('students')
                .select('id')
                .eq('name', name);
            if (students && students.length === 1) studentId = students[0].id;
        }

        if (!studentId) {
            console.warn(`[No Match] Student ${name} (${phoneRaw}) not found in DB.`);
            // Continue? Plan says "Record name only and student_id null"?
            // Schema might allow null student_id (for virtual stops), but usually we want link.
            // Let's insert with null student_id but put name in Note or Location? 
            // Actually 'shuttle_schedules' has no 'student_name' column, it relies on join.
            // If we insert null, it won't show up for ANY student.
            // It effectively becomes a 'system stop'.
            // Skip for now if we can't link, or just log.
            skipCount++;
            continue;
        }

        // Insert for each day
        for (const ch of dayChars) {
            const dayCode = DAY_MAP[ch];
            if (!dayCode) continue;

            // Check Duplicate
            const { data: existing } = await supabase
                .from('shuttle_schedules')
                .select('id')
                .eq('student_id', studentId)
                .eq('day_of_week', dayCode)
                .eq('time', timeStr)
                .eq('type', type)
                .maybeSingle();

            if (existing) {
                // Update?
                await supabase.from('shuttle_schedules').update({
                    location_name: location,
                    // valid_from? updated_at?
                }).eq('id', existing.id);
            } else {
                // Insert
                await supabase.from('shuttle_schedules').insert({
                    student_id: studentId,
                    day_of_week: dayCode,
                    time: timeStr,
                    type: type,
                    location_name: location,
                    location_address: location,
                    section_id: 1 // Default
                });
                successCount++;
            }
        }
    }

    console.log(`\n--- Import Summary ---`);
    console.log(`✅ Created/Updated: ${successCount}`);
    console.log(`⚠️ Skipped/Not Found: ${skipCount}`);
}

importShuttle();


import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

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
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (match) {
        return `${match[1].padStart(2, '0')}:${match[2]}:00`;
    }
    return null;
}

async function importShuttleFixed() {
    console.log(`🚀 Starting Strict Shuttle Import from '${TAB_NAME}'...`);

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
            range: `${TAB_NAME}!A1:OZ2000`, // Wide range to ensure we get Col J/K
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

    // Identify Headers for Name/Phone/Type/Day only.
    // Time and Dest are FIXED (J=9, K=10).
    const headerRow = rows.find(r => r.some((c: string) => c.includes('이름')));
    if (!headerRow) {
        console.error('❌ Cannot find header row with "이름".');
        return;
    }

    const headers = headerRow.map((h: string) => h.trim());
    const idxName = headers.indexOf('이름');
    const idxPhone = headers.indexOf('연락처'); // Check for "연락처" or "학부모 연락처"?
    // Original plan says "연락처" is in the sheet.
    const idxDay = headers.indexOf('요일');
    const idxType = headers.indexOf('구분'); // '구분'

    // Strict Columns
    const IDX_TIME = 9; // J
    const IDX_DEST = 10; // K

    console.log(`Headers found: Name=${idxName}, Phone=${idxPhone}, Day=${idxDay}, Type=${idxType}`);
    console.log(`Strict Columns: Time=J(${IDX_TIME}), Dest=K(${IDX_DEST})`);

    const dataRows = rows.slice(rows.indexOf(headerRow) + 1);

    let reportMd = `# 셔틀 매칭 실패 보고서 (Shuttle Matching Failure Report)\n`;
    reportMd += `Generated at: ${new Date().toLocaleString()}\n\n`;
    reportMd += `| Row | Name | Phone | Issue | Raw Data |\n`;
    reportMd += `|---|---|---|---|---|\n`;

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = i + 2; // Approx

        const name = row[idxName]?.trim();
        if (!name) continue;

        // 1. Validations
        const timeRaw = row[IDX_TIME]?.trim();
        const timeStr = parseTime(timeRaw);
        if (!timeStr) {
            reportMd += `| ${rowNum} | ${name} | - | 시간 형식 오류 (Time Invalid) | Time: ${timeRaw} |\n`;
            failCount++;
            continue;
        }

        const typeRaw = row[idxType]?.trim() || '';
        let type: 'boarding' | 'dropoff' | null = null;
        if (typeRaw.includes('등원') || typeRaw.includes('승차')) type = 'boarding';
        else if (typeRaw.includes('하원') || typeRaw.includes('하차')) type = 'dropoff';

        if (!type) {
            // Check if user meant empty is fine? usually not.
            reportMd += `| ${rowNum} | ${name} | - | 구분(Type) 오류 | Type: ${typeRaw} |\n`;
            failCount++;
            continue;
        }

        const locationName = row[IDX_DEST]?.trim() || '목적지 미상';

        // 2. Student Matching
        let phoneRaw = '';
        if (idxPhone !== -1) phoneRaw = cleanPhone(row[idxPhone]);

        let studentId = null;

        // Strategy: 
        // A. Name + Phone (if phone exists)
        // B. Name only (if phone empty or match fail, but let's be strict if phone provided)

        let query = supabase.from('students').select('id, name, parent_phone, student_phone').eq('name', name);
        const { data: students } = await query;

        if (students && students.length > 0) {
            if (phoneRaw.length >= 4) {
                // Match last 4 digits
                const match = students.find(s =>
                    (s.parent_phone && cleanPhone(s.parent_phone).endsWith(phoneRaw)) ||
                    (s.student_phone && cleanPhone(s.student_phone).endsWith(phoneRaw))
                );
                if (match) studentId = match.id;
            } else {
                // No phone in sheet?
                if (students.length === 1) studentId = students[0].id;
            }
        }

        if (!studentId) {
            reportMd += `| ${rowNum} | ${name} | ${phoneRaw} | 학생 DB 미발견 (Not Found) | - |\n`;
            failCount++;
            continue;
        }

        // 3. Upsert Schedule
        const dayRaw = row[idxDay]?.trim() || '';
        // Handle "월,수"
        const days = dayRaw.split(',').map((d: string) => d.trim().charAt(0));

        for (const dChar of days) {
            const dayCode = DAY_MAP[dChar];
            if (!dayCode) {
                // Warning but maybe not fail whole row?
                continue;
            }

            // Upsert based on Student + Day + Type + Time?
            // Actually, if we re-run, we should probably update if exists.
            const { error } = await supabase.from('shuttle_schedules').upsert({
                student_id: studentId,
                day_of_week: dayCode,
                time: timeStr,
                type: type,
                location_name: locationName,
                section_id: 1 // Default
            }, { onConflict: 'student_id, day_of_week, type' }); // Unique constraint we added?
            // Note: If multiple times per day/type allowed, upsert might be wrong.
            // But usually 1 boarding/1 dropoff per day.

            if (error) {
                reportMd += `| ${rowNum} | ${name} | - | DB Insert Error | ${error.message} |\n`;
                failCount++;
            } else {
                successCount++;
            }
        }
    }

    // Write Report
    fs.writeFileSync('shuttle_matching_report.md', reportMd);
    console.log(`\n--- Result ---`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📄 Report generated: shuttle_matching_report.md`);
}

importShuttleFixed();

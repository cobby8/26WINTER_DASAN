
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

// Column Indices (0-based)
// A: Name (0), B: StudentPhone(1), C: ParentPhone(2), D: Day(3)
// E: ClassTime(4), F: ArrTime(5) [Use for Shuttle Time], G: Dest(6) [Use for Loc], H: Type(7)
const COL = {
    NAME: 0,
    PHONE_STUDENT: 1,
    PHONE_PARENT: 2,
    DAY: 3,
    TIME: 5, // F column
    DEST: 6, // G column
    TYPE: 7  // H column
};

async function importShuttleRebuild() {
    console.log(`🚀 Starting Rebuild Shuttle Import from '${TAB_NAME}'...`);

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
            range: `${TAB_NAME}!A2:Z2000`, // Skip header row A1
        });
        rows = response.data.values || [];
    } catch (e: any) {
        console.error('❌ Failed to fetch sheet:', e.message);
        return;
    }

    if (rows.length === 0) {
        console.log('No data found.');
        return;
    }

    let reportMd = `# 셔틀 매칭 실패 보고서 (Shuttle Matching Failure Report)\n`;
    reportMd += `Generated at: ${new Date().toLocaleString()}\n\n`;
    reportMd += `Target Sheet: ${TAB_NAME}\n`;
    reportMd += `Mapping: Time=Col F, Dest=Col G, Type=Col H\n\n`;
    reportMd += `| Row | Name | Phone | Issue | Raw Data |\n`;
    reportMd += `|---|---|---|---|---|\n`;

    let successCount = 0;
    let failCount = 0;

    // Prefetch all students to minimize DB calls
    const { data: allStudents } = await supabase
        .from('students')
        .select('id, name, parent_phone, student_phone');

    if (!allStudents) {
        console.error('Failed to load students.');
        return;
    }

    console.log(`Loaded ${allStudents.length} students from DB.`);

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // Because we started at A2

        const name = row[COL.NAME]?.trim();
        if (!name) continue;

        // 1. Data Parsing & Validation
        const timeRaw = row[COL.TIME]?.trim();
        const timeStr = parseTime(timeRaw);

        const destRaw = row[COL.DEST]?.trim() || '';
        const locationName = destRaw || '목적지 미상';

        const typeRaw = row[COL.TYPE]?.trim() || '';
        let type: 'boarding' | 'dropoff' | null = null;
        if (typeRaw.includes('등원') || typeRaw.includes('승차')) type = 'boarding';
        else if (typeRaw.includes('하원') || typeRaw.includes('하차')) type = 'dropoff';

        // Critical Checks
        if (!timeStr) {
            reportMd += `| ${rowNum} | ${name} | - | 시간(Col F) 오류 | ${timeRaw} |\n`;
            failCount++;
            continue;
        }
        if (!type) {
            reportMd += `| ${rowNum} | ${name} | - | 구분(Col H) 오류 | ${typeRaw} |\n`;
            failCount++;
            continue;
        }

        // 2. Student Matching
        const sPhoneRaw = cleanPhone(row[COL.PHONE_STUDENT]);
        const pPhoneRaw = cleanPhone(row[COL.PHONE_PARENT]);

        let studentId = null;

        // Filter by Name first
        const candidates = allStudents.filter(s => s.name === name);

        if (candidates.length === 0) {
            reportMd += `| ${rowNum} | ${name} | ${sPhoneRaw}/${pPhoneRaw} | 학생 이름 미발견 | - |\n`;
            failCount++;
            continue;
        } else if (candidates.length === 1) {
            // Exact name match
            // Optional: strict check phone? User asked to "match", usually implies checking phone.
            // But if only one student exists, maybe accept? 
            // Let's check phone if provided in sheet.
            const s = candidates[0];
            const dbSPhone = cleanPhone(s.student_phone);
            const dbPPhone = cleanPhone(s.parent_phone);

            // If sheet has phone, compare last 4 digits
            let match = true;
            if (sPhoneRaw.length >= 4 && !dbSPhone.endsWith(sPhoneRaw) && !dbPPhone.endsWith(sPhoneRaw)) match = false;
            // Also check parent phone col
            // Actually, logical OR is better.
            const phoneInSheet = sPhoneRaw || pPhoneRaw;

            if (!phoneInSheet) {
                // No phone in sheet -> Trust Name
                studentId = s.id;
            } else {
                // Phone in sheet -> Verify
                if (
                    (sPhoneRaw && (dbSPhone.endsWith(sPhoneRaw) || dbPPhone.endsWith(sPhoneRaw))) ||
                    (pPhoneRaw && (dbSPhone.endsWith(pPhoneRaw) || dbPPhone.endsWith(pPhoneRaw)))
                ) {
                    studentId = s.id;
                } else {
                    // Phone mismatch
                    reportMd += `| ${rowNum} | ${name} | ${sPhoneRaw}/${pPhoneRaw} | 전화번호 불일치 | DB: ${s.student_phone}/${s.parent_phone} |\n`;
                    failCount++;
                    continue;
                }
            }
        } else {
            // Multiple candidates
            const phoneInSheet = sPhoneRaw || pPhoneRaw;
            if (!phoneInSheet) {
                reportMd += `| ${rowNum} | ${name} | - | 동명이인 & 전화번호 없음 | Found ${candidates.length} candidate(s) |\n`;
                failCount++;
                continue;
            }

            const match = candidates.find(s => {
                const dbS = cleanPhone(s.student_phone);
                const dbP = cleanPhone(s.parent_phone);
                return (sPhoneRaw && (dbS.endsWith(sPhoneRaw) || dbP.endsWith(sPhoneRaw))) ||
                    (pPhoneRaw && (dbS.endsWith(pPhoneRaw) || dbP.endsWith(pPhoneRaw)));
            });

            if (match) studentId = match.id;
            else {
                reportMd += `| ${rowNum} | ${name} | ${sPhoneRaw}/${pPhoneRaw} | 동명이인 & 매칭 실패 | Found ${candidates.length} candidate(s) |\n`;
                failCount++;
                continue;
            }
        }

        // 3. Upsert Schedule
        const dayRaw = row[COL.DAY]?.trim() || '';
        // Handle "월,화" etc
        const dayChars = dayRaw.split(',').map((d: string) => d.trim().replace(/요일/g, '').charAt(0));

        for (const ch of dayChars) {
            const dayCode = DAY_MAP[ch];
            if (!dayCode) continue;

            // Check if exists
            const { data: existing } = await supabase
                .from('shuttle_schedules')
                .select('id')
                .eq('student_id', studentId)
                .eq('day_of_week', dayCode)
                .eq('type', type)
                .maybeSingle();

            if (existing) {
                // Update
                const { error } = await supabase
                    .from('shuttle_schedules')
                    .update({
                        time: timeStr,
                        location_name: locationName,
                        updated_at: new Date().toISOString() // Assuming there's an updated_at col, otherwise ignore
                    })
                    .eq('id', existing.id);

                if (error) {
                    console.error(`DB Update Error (${name}):`, error.message);
                    reportMd += `| ${rowNum} | ${name} | - | DB Update Error | ${error.message} |\n`;
                    failCount++;
                } else {
                    successCount++;
                }
            } else {
                // Insert
                const { error } = await supabase
                    .from('shuttle_schedules')
                    .insert({
                        student_id: studentId,
                        day_of_week: dayCode,
                        time: timeStr,
                        type: type,
                        location_name: locationName,
                        section_id: 1
                    });

                if (error) {
                    console.error(`DB Insert Error (${name}):`, error.message);
                    reportMd += `| ${rowNum} | ${name} | - | DB Insert Error | ${error.message} |\n`;
                    failCount++;
                } else {
                    successCount++;
                }
            }
        }
    }

    fs.writeFileSync('shuttle_matching_report.md', reportMd);
    console.log(`\n--- Rebuild Complete ---`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
}

importShuttleRebuild();

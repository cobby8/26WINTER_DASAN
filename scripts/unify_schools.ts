import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const sheetId = process.env.GOOGLE_SHEET_ID;

const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

function normalizeSchoolName(name: string): string {
    if (!name) return '';
    let s = name.trim().replace(/\s+/g, '');

    // User specified examples:
    // "새봄초등학교", "하늘초등학교", "새봄중학교"

    // 1. Handle "다산" prefix removal for specific schools mentioned by user
    if (s.startsWith('다산새봄')) s = s.replace('다산새봄', '새봄');
    if (s.startsWith('다산하늘')) s = s.replace('다산하늘', '하늘');
    if (s.startsWith('다산가람')) s = s.replace('다산가람', '가람');
    if (s.startsWith('다산한강')) s = s.replace('다산한강', '한강');

    // 2. Standardize Suffixes
    if (s.endsWith('초') && !s.endsWith('기초')) {
        s = s.substring(0, s.length - 1) + '초등학교';
    } else if (s.endsWith('중')) {
        s = s.substring(0, s.length - 1) + '중학교';
    } else if (s.endsWith('고')) {
        s = s.substring(0, s.length - 1) + '고등학교';
    }

    // Special case for "다산초" -> "다산초등학교"
    if (s === '다산초') return '다산초등학교';

    return s;
}

async function unifySupabase() {
    console.log('--- Unifying Supabase Students ---');
    const { data: students, error } = await supabase.from('students').select('id, name, school');
    if (error) throw error;

    let updateCount = 0;
    for (const student of students) {
        if (!student.school) continue;
        const normalized = normalizeSchoolName(student.school);
        if (normalized !== student.school) {
            console.log(`[DB] Updating ${student.name}: ${student.school} -> ${normalized}`);
            if (process.env.DRY_RUN !== 'false') {
                updateCount++;
                continue;
            }
            const { error: updateError } = await supabase
                .from('students')
                .update({ school: normalized })
                .eq('id', student.id);
            if (updateError) console.error(`Failed to update ${student.name}:`, updateError.message);
            else updateCount++;
        }
    }
    console.log(`[DB] ${process.env.DRY_RUN !== 'false' ? '(DRY RUN) ' : ''}Processed ${updateCount} changes.`);
}

async function unifyGoogleSheet(sheetName: string) {
    console.log(`--- Unifying Google Sheet: ${sheetName} ---`);
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId!,
        range: `${sheetName}!A1:AZ1000`,
    });

    const rows = res.data.values;
    if (!rows || rows.length === 0) return;

    // Detect header row and school column
    let headerRowIdx = -1;
    let schoolColIdx = -1;

    for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const row = rows[i];
        const idx = row.findIndex(c => c && (c.includes('학교명') || c.includes('학교')));
        if (idx !== -1) {
            headerRowIdx = i;
            schoolColIdx = idx;
            break;
        }
    }

    if (schoolColIdx === -1) {
        console.warn(`Could not find school column in sheet ${sheetName}`);
        return;
    }

    let updateCount = 0;
    for (let i = headerRowIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        const currentName = row[schoolColIdx];
        if (!currentName) continue;

        const normalized = normalizeSchoolName(currentName);
        if (normalized !== currentName) {
            console.log(`[Sheet ${sheetName}] Row ${i + 1}: ${currentName} -> ${normalized}`);
            if (process.env.DRY_RUN !== 'false') {
                updateCount++;
                continue;
            }

            const cellAddress = `${sheetName}!${String.fromCharCode(65 + schoolColIdx)}${i + 1}`;
            await sheets.spreadsheets.values.update({
                spreadsheetId: sheetId!,
                range: cellAddress,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [[normalized]]
                }
            });
            updateCount++;
        }
    }
    console.log(`[Sheet ${sheetName}] ${process.env.DRY_RUN !== 'false' ? '(DRY RUN) ' : ''}Processed ${updateCount} changes.`);
}

async function run() {
    try {
        await unifySupabase();
        const sheetNames = ['26겨울방학특강1차', '26겨울방학특강2차'];
        for (const name of sheetNames) {
            await unifyGoogleSheet(name);
        }
    } catch (err) {
        console.error('Fatal error:', err);
    }
}

run();

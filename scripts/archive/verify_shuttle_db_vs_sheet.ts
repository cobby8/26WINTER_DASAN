
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verifyDbVsSheet() {
    console.log('--- Verifying DB vs Sheet (Rows 2-6) ---');
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const range = '2차차량운행!A3:M8'; // Data rows (Row 3 is index 2 in 0-based? No, A1:A2 is header. So A3 is 1st data row?)
    // Wait. Previous analysis: Row 0=Title, Row 1=Header, Row 2=Data.
    // So A3 is Data Row 1 (Index 2). 
    // Let's get A3:M8 (5 rows)

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
    });

    const rows = response.data.values;
    if (!rows) return;

    // Col Indices from previous confirm:
    // Name=0, Phone=1, Day=3, Time=5, Dest=6, Type=7

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = row[0];
        const day = row[3];
        const time = row[5]; // HH:MM
        const dest = row[6];
        const typeRaw = row[7];

        console.log(`\n[Sheet Row ${i + 3}] ${name} / ${day} / ${time} / ${dest} / ${typeRaw}`);

        // Fetch DB
        const { data: students } = await supabase.from('students').select('id').eq('name', name);
        if (!students || students.length === 0) {
            console.log(` -> DB: Student NOT FOUND`);
            continue;
        }

        // Check schedules for ANY of these students
        for (const s of students) {
            const { data: scheds } = await supabase
                .from('shuttle_schedules')
                .select('*')
                .eq('student_id', s.id);

            if (!scheds || scheds.length === 0) {
                console.log(` -> DB (Student ${s.id.slice(0, 4)}): No Schedules`);
            } else {
                scheds.forEach(sch => {
                    console.log(` -> DB: Day=${sch.day_of_week}, Time=${sch.time}, Loc=${sch.location_name}, Type=${sch.type}`);
                });
            }
        }
    }
}

verifyDbVsSheet();

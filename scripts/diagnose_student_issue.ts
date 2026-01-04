
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const SHEET_ID = '1SSBv_yY22Mr5y8W5z2J0NvxC0keZcQRIRkHmtAVaqrw';

async function diagnoseStudent(studentName: string) {
    console.log(`--- Diagnosing Student: ${studentName} ---`);

    // 1. Check DB
    console.log('\n[Database Check]');
    const { data: dbStudents } = await supabase
        .from('students')
        .select('id, name')
        .ilike('name', `%${studentName}%`);

    console.log('Students in DB:', dbStudents);

    if (dbStudents && dbStudents.length > 0) {
        const studentIds = dbStudents.map(s => s.id);
        const { data: schedules } = await supabase
            .from('shuttle_schedules')
            .select('*')
            .in('student_id', studentIds);
        console.log('Schedules in DB:', schedules);
    }

    // 2. Check Google Sheet
    console.log('\n[Google Sheet Check]');
    const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY!),
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: '1차차량운행!A1:Z100', // Adjust range as needed
    });

    const rows = response.data.values;
    if (rows) {
        console.log('Rows containing student name:');
        rows.forEach((row, index) => {
            if (row.some(cell => cell && typeof cell === 'string' && cell.includes(studentName))) {
                console.log(`Line ${index + 1}:`, row);
            }
        });
    }
}

diagnoseStudent('이도경');

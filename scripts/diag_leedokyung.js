
const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const SHEET_ID = '1SSBv_yY22Mr5y8W5z2J0NvxC0keZcQRIRkHmtAVaqrw';

async function diagnose() {
    try {
        const studentName = '이도경';
        console.log(`--- Diagnosing Student: ${studentName} ---`);

        // 1. DB Check
        const { data: dbStudents } = await supabase
            .from('students')
            .select('id, name')
            .ilike('name', `%${studentName}%`);
        console.log('DB Students:', dbStudents);

        if (dbStudents && dbStudents.length > 0) {
            const ids = dbStudents.map(s => s.id);
            const { data: schedules } = await supabase
                .from('shuttle_schedules')
                .select('*')
                .in('student_id', ids);
            console.log('DB Schedules:', schedules);
        }

        // 2. Sheet Check
        const auth = new google.auth.GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY),
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        const sheets = google.sheets({ version: 'v4', auth });
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: '1차차량운행!A1:Z150',
        });
        const rows = res.data.values;
        if (rows) {
            rows.forEach((row, idx) => {
                if (row.some(c => c && String(c).includes(studentName))) {
                    console.log(`Sheet Row ${idx + 1}:`, row);
                }
            });
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

diagnose();

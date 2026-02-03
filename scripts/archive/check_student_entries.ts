
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function checkStudentEntries() {
    console.log('--- Checking Sheet for Specific Students ---');
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const range = '2차차량운행!A:H';
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
    });

    const rows = response.data.values;
    if (!rows) return;

    const targets = ['권오현', '조해원', '신민주'];

    targets.forEach(target => {
        console.log(`\nSearching for: ${target}`);
        rows.forEach((row, i) => {
            if (row[0] && row[0].includes(target)) {
                console.log(`  [Row ${i + 1}] Day: ${row[3]} | Time: ${row[5]} | Type: ${row[7]}`);
            }
        });
    });
}

checkStudentEntries();

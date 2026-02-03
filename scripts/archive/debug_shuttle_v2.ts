
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function debugShuttleV2() {
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

    const rows = response.data.values || [];
    const targets = ['권오현', '조해원', '신민주'];
    const results: any[] = [];

    rows.forEach((row, i) => {
        const name = row[0] || '';
        if (targets.some(t => name.includes(t))) {
            results.push({
                row: i + 1,
                name: name,
                day: row[3],
                time: row[5],
                dest: row[6],
                type: row[7]
            });
        }
    });

    fs.writeFileSync('debug_shuttle_output.json', JSON.stringify(results, null, 2), 'utf-8');
    console.log('Wrote debug_shuttle_output.json');
}

debugShuttleV2();

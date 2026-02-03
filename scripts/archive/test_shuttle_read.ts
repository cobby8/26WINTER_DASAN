
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function testShuttleRead() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = '26겨울방학특강2차';

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetName}!A1:AZ20`,
    });

    const rows = response.data.values;
    if (!rows) return;

    let headerRowIdx = 0;
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].some(c => c && c.includes('이름'))) {
            headerRowIdx = i;
            break;
        }
    }

    const headers = rows[headerRowIdx];
    console.log('Headers:', headers);

    const firstDataRow = rows[headerRowIdx + 1];
    const rowObj: any = {};
    headers.forEach((h, i) => {
        rowObj[h] = firstDataRow[i] || '';
    });

    console.log('Row Object Keys:', Object.keys(rowObj));

    // Simulation of findsVal
    const keys = Object.keys(rowObj);
    const findVal = (terms: string[]) => {
        const key = keys.find(k => terms.some(t => k.includes(t)));
        console.log(`Searching for [${terms.join(', ')}] -> Found Key: "${key}"`);
        return key ? rowObj[key] : 'Not Found';
    };

    const val = findVal(['셔틀탑승 여부', '셔틀', '등하원', '차량']);
    console.log('Value:', val);
}

testShuttleRead();

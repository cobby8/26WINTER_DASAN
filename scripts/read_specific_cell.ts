
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function readCell() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = '1SSBv_yY22Mr5y8W5z2J0NvxC0keZcQRIRkHmtAVaqrw';

    // Target: Jan 5 (Mon), Week 1. 
    // "권회윤" (Row ?). 
    // I need to implement similar finding logic or just dump the row.
    // Let's dump the row for "권회윤" + "월" + "등원".

    const sheetName = '1차차량운행';
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetName}!A1:Z1000`,
    });

    const rows = response.data.values;
    if (!rows) return;

    // Headers (Row 2, idx 1)
    const headers = rows[1];
    const nameIdx = headers.indexOf('수강생 이름');
    const w1Idx = headers.indexOf('1주차\n') !== -1 ? headers.indexOf('1주차\n') : headers.findIndex(h => h.includes('1주차'));

    console.log(`Indices: Name=${nameIdx}, W1=${w1Idx}`);

    // Find Row
    const targetName = '권회윤';
    const targetRow = rows.find(r => r[nameIdx] === targetName && r[headers.indexOf('구분')].includes('승차'));

    if (targetRow) {
        console.log(`Current Value for ${targetName} (Week 1): [${targetRow[w1Idx]}]`);
    } else {
        console.log("Target row not found");
    }
}

readCell();

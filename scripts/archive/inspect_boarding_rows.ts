
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function inspectBoarding() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = '1SSBv_yY22Mr5y8W5z2J0NvxC0keZcQRIRkHmtAVaqrw';

    try {
        const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
        const sheetName = meta.data.sheets?.[0]?.properties?.title;

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${sheetName}!A1:Z100`,
        });

        const rows = response.data.values || [];
        const headers = rows[0];

        const shuttleIdx = headers.indexOf('셔틀탑승 여부');
        const nameIdx = headers.indexOf('수강생 이름');
        const boardingTimeIdx = headers.indexOf('탑승 시간');
        const monIdx = headers.indexOf('수강신청 희망 시간 [월요일]');

        console.log(`Indexes: Shuttle=${shuttleIdx}, Name=${nameIdx}, BoardingTime=${boardingTimeIdx}`);

        const boardingRows = rows.slice(1).filter(r => r[shuttleIdx] === '탑승');

        console.log(`Found ${boardingRows.length} boarding rows in first 100.`);

        boardingRows.slice(0, 5).forEach(r => {
            console.log(`\nName: ${r[nameIdx]}`);
            console.log(`Shuttle: ${r[shuttleIdx]}`);
            console.log(`Boarding Time (Col ${boardingTimeIdx}): '${r[boardingTimeIdx]}'`);
            console.log(`Mon Class: ${r[monIdx]}`);
        });

    } catch (error) {
        console.error("Error:", error);
    }
}

inspectBoarding();

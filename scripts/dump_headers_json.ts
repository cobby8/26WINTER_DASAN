
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function dumpHeaders() {
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
        const firstSheetName = meta.data.sheets?.[0]?.properties?.title;

        if (!firstSheetName) {
            console.error("No sheets found");
            return;
        }

        const rows = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${firstSheetName}!A1:Z2`,
        });

        const data = {
            sheetName: firstSheetName,
            headers: rows.data.values?.[0] || [],
            sample: rows.data.values?.[1] || []
        };

        fs.writeFileSync('headers.json', JSON.stringify(data, null, 2));
        console.log("Headers dumped to headers.json");

    } catch (error: any) {
        console.error("Error:", error.message);
    }
}

dumpHeaders();

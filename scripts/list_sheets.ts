
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function listSheets() {
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
        console.log("📑 Sheets Found:");
        meta.data.sheets?.forEach(s => {
            console.log(` - Title: [${s.properties?.title}], ID: ${s.properties?.sheetId}`);
        });

    } catch (error) {
        console.error("Error:", error);
    }
}

listSheets();

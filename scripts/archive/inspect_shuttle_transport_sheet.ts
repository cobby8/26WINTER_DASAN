
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function inspectTransport() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = '1SSBv_yY22Mr5y8W5z2J0NvxC0keZcQRIRkHmtAVaqrw';

    // Name provided by user: '1차차량운행'
    const sheetName = '1차차량운행';

    try {
        console.log(`Getting headers for '${sheetName}'...`);
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${sheetName}!A1:Z5`,
        });

        const rows = response.data.values || [];
        console.log("Headers:", JSON.stringify(rows[0], null, 2));
        console.log("Sample 1:", JSON.stringify(rows[1], null, 2));
        console.log("Sample 2:", JSON.stringify(rows[2], null, 2));

    } catch (error) {
        console.error("Error:", error);
    }
}

inspectTransport();


import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function dumpTransport() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = '1SSBv_yY22Mr5y8W5z2J0NvxC0keZcQRIRkHmtAVaqrw';

    // Explicitly target Transport sheet
    const sheetName = '1차차량운행';
    console.log(`Getting headers for '${sheetName}'...`);

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${sheetName}!A1:Z5`,
        });

        const data = {
            sheetName: sheetName,
            headers: response.data.values?.[0] || [],
            sample: response.data.values?.[1] || []
        };

        fs.writeFileSync('transport_headers.json', JSON.stringify(data, null, 2));
        console.log("Headers dumped to transport_headers.json");

    } catch (error: any) {
        console.error("Error:", error.message);
    }
}

dumpTransport();

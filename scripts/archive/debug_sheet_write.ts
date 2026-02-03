
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

class GoogleSheetService {
    private auth;
    private sheetId: string;

    constructor() {
        this.auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly', 'https://www.googleapis.com/auth/spreadsheets'], // Added write scope
        });
        this.sheetId = '1SSBv_yY22Mr5y8W5z2J0NvxC0keZcQRIRkHmtAVaqrw';
    }

    async updateShuttleStatusInSheet(
        studentName: string,
        dayOfWeek: string,
        type: 'boarding' | 'dropoff',
        date: string,
        status: string
    ) {
        try {
            const sheetName = '1차차량운행';
            const client = google.sheets({ version: 'v4', auth: this.auth });

            console.log(`[Debug] Fetching Sheet Matrix...`);
            const rangeRes = await client.spreadsheets.values.get({
                spreadsheetId: this.sheetId,
                range: `${sheetName}!A1:Z2000`,
            });
            const matrix = rangeRes.data.values;
            if (!matrix) return false;

            const headerRow = matrix[1];
            const nameIdx = headerRow.indexOf('수강생 이름');
            const dayIdx = headerRow.indexOf('요일');
            const typeIdx = headerRow.indexOf('구분');

            console.log(`[Debug] Headers Found: Name=${nameIdx}, Day=${dayIdx}, Type=${typeIdx}`);

            const targetDate = new Date(date);
            const startOfProgram = new Date('2026-01-05');
            const diffTime = targetDate.getTime() - startOfProgram.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const weekNum = Math.floor(diffDays / 7) + 1;

            const weekHeader = `${weekNum}주차`;
            const weekColIdx = headerRow.findIndex(h => h.includes(weekHeader));

            console.log(`[Debug] Week Header Idea: '${weekHeader}', Found Index: ${weekColIdx}, Actual Header: '${headerRow[weekColIdx]}'`);

            if (weekColIdx === -1) {
                console.warn(`[Debug] Could not find column for Week ${weekNum}`);
                return false;
            }

            const reverseDayMap: Record<string, string> = { 'Mon': '월', 'Tue': '화', 'Wed': '수', 'Thu': '목', 'Fri': '금', 'Sat': '토', 'Sun': '일' };
            const korDay = reverseDayMap[dayOfWeek];

            console.log(`[Debug] Searching for Name='${studentName}', Day includes '${korDay}', Type=${type}`);

            let targetRowIdx = -1;

            for (let i = 2; i < matrix.length; i++) {
                const row = matrix[i];
                const rowName = row[nameIdx]?.trim();
                const rowDay = row[dayIdx]?.trim();
                const rowType = row[typeIdx]?.trim();

                if (rowName === studentName) {
                    // console.log(`[Debug] Found Name Match at Row ${i}. Day='${rowDay}', Type='${rowType}'`);
                }

                if (rowName !== studentName) continue;
                if (!rowDay || !rowDay.includes(korDay)) continue;

                const isBoarding = type === 'boarding';
                const rowIsBoarding = rowType.includes('승차') || rowType.includes('등원');
                const rowIsDropoff = rowType.includes('하차') || rowType.includes('하원');

                if (isBoarding && !rowIsBoarding) continue;
                if (!isBoarding && !rowIsDropoff) continue;

                targetRowIdx = i;
                console.log(`[Debug] MATCH Found at Row ${i}!`);
                break;
            }

            if (targetRowIdx === -1) {
                console.warn(`[Debug] Row search failed.`);
                return false;
            }

            const sheetRowNumber = targetRowIdx + 1;
            const colLetter = String.fromCharCode(65 + weekColIdx);
            const cellAddress = `${sheetName}!${colLetter}${sheetRowNumber}`;

            const statusMap: Record<string, string> = {
                'boarded': '탑승',
                'missed': '결석',
                'self_commute': '자차',
                'pending': ''
            };
            const sheetValue = statusMap[status] || status;

            console.log(`[Debug] Attempting Update: ${cellAddress} -> ${sheetValue}`);

            await client.spreadsheets.values.update({
                spreadsheetId: this.sheetId,
                range: cellAddress,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [[sheetValue]]
                }
            });

            console.log(`[Debug] Success!`);
            return true;
        } catch (error) {
            console.error('[Debug] Error:', error);
            return false;
        }
    }
}

new GoogleSheetService().updateShuttleStatusInSheet('권회윤', 'Mon', 'boarding', '2026-01-05', 'boarded');

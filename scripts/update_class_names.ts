
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

class StandaloneSheetService {
    private auth;
    private sheetId: string;

    constructor() {
        this.auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        this.sheetId = process.env.GOOGLE_SHEET_ID || '';
    }

    async fetchRawData(sheetName: string): Promise<any[]> {
        const sheets = google.sheets({ version: 'v4', auth: this.auth });
        const range = `${sheetName}!A1:AZ2000`;

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: this.sheetId,
            range: range,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) return [];

        let headerRowIdx = 0;
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
            const row = rows[i];
            if (row.some(c => c && (c.includes('이름') || c.includes('성명') || c.includes('수강생')))) {
                headerRowIdx = i;
                break;
            }
        }

        const headers = rows[headerRowIdx];
        const data = rows.slice(headerRowIdx + 1);
        return data.map((row) => {
            const rowObject: any = {};
            headers.forEach((header, index) => {
                rowObject[header] = row[index] || '';
            });
            return rowObject;
        });
    }

    parseClassInfo(row: any): { day: string, time: string, cellText: string }[] {
        const keys = Object.keys(row);
        const result: { day: string, time: string, cellText: string }[] = [];
        const days = ['월', '화', '수', '목', '금'];

        days.forEach(day => {
            const dayKey = keys.find(k => k.trim() === day);
            if (dayKey) {
                const timeVal = row[dayKey] as string;
                if (!timeVal) return;
                const timeMatch = timeVal.match(/(\d{1,2}:\d{2})/);
                if (timeMatch) {
                    result.push({
                        day: day + '요일',
                        time: timeMatch[1].padStart(5, '0'),
                        cellText: timeVal // "1호점 1교시(초등저) 10:30~11:50"
                    });
                }
            }
        });
        return result;
    }
}

async function updateClassNames() {
    console.log('--- Updating Class Names (Simple Format) ---');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const sheetService = new StandaloneSheetService();
    const sheetName = '26겨울방학특강2차';

    let rawRows;
    try {
        rawRows = await sheetService.fetchRawData(sheetName);
    } catch (e: any) {
        console.error('Error fetching sheet:', e.message);
        return;
    }

    const classDetailMap = new Map<string, string>();

    for (const row of rawRows) {
        const classes = sheetService.parseClassInfo(row);
        for (const cls of classes) {
            let branch = '1호점';
            if (cls.cellText.includes('2호점')) branch = '2호점';

            const key = `${cls.day}|${cls.time}|${branch}`;
            if (!classDetailMap.has(key)) {
                classDetailMap.set(key, cls.cellText);
            }
        }
    }

    console.log(`Found ${classDetailMap.size} unique class descriptors in Sheet.`);

    const { data: dbClasses } = await supabase
        .from('classes')
        .select('*')
        .eq('session', '2차')
        .is('deleted_at', null);

    if (!dbClasses) return;

    let updateCount = 0;

    for (const dbCls of dbClasses) {
        const timePrefix = dbCls.start_time.substring(0, 5); // HH:MM
        const key = `${dbCls.day_of_week}|${timePrefix}|${dbCls.branch}`;

        const cellText = classDetailMap.get(key);
        if (cellText) {
            // New Logic: Use cellText directly as the name
            const newName = cellText;

            if (dbCls.name !== newName) {
                console.log(`Updating: ${dbCls.name} -> ${newName}`);
                const { error } = await supabase
                    .from('classes')
                    .update({ name: newName })
                    .eq('id', dbCls.id);

                if (error) console.error(`Failed to update ${dbCls.id}:`, error.message);
                else updateCount++;
            }
        } else {
            // Warn but don't delete?
            console.warn(`No sheet data found for: ${dbCls.name} (Key: ${key})`);
        }
    }

    console.log(`Finished. Updated ${updateCount} classes.`);
}

updateClassNames();

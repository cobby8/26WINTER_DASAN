
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

interface ParsedEnrollment {
    session: string;
    branch: string;
    desiredClasses: { day: string, time: string, cellText: string }[];
}

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

    parseRow(row: any): { enrollment: ParsedEnrollment } {
        const keys = Object.keys(row);

        const desiredClasses: { day: string, time: string, cellText: string }[] = [];
        const days = ['월', '화', '수', '목', '금'];

        days.forEach(day => {
            const dayKey = keys.find(k => k.trim() === day);
            if (dayKey) {
                const timeVal = row[dayKey] as string;
                if (!timeVal) return;
                const timeMatch = timeVal.match(/(\d{1,2}:\d{2})/);
                if (timeMatch) {
                    desiredClasses.push({
                        day: day + '요일',
                        time: timeMatch[1].padStart(5, '0'),
                        cellText: timeVal
                    });
                }
            }
        });

        const findVal = (terms: string[]) => {
            const key = keys.find(k => terms.some(t => k.includes(t)));
            return key ? (row[key] as string)?.trim() : '';
        };

        let branch = findVal(['지점을 선택해주세요', '지점']) || '1호점';
        if (branch.includes('1호점')) branch = '1호점';
        else if (branch.includes('2호점')) branch = '2호점';
        else branch = '1호점';

        return {
            enrollment: {
                session: '2차',
                branch: branch,
                desiredClasses
            }
        };
    }
}

async function createClassesOnly() {
    console.log('--- Syncing Classes Only (No Enrollments) [Full Format] ---');

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

    const uniqueClasses = new Map<string, { day: string, time: string, branch: string, session: string, cellText: string }>();

    for (const row of rawRows) {
        const { enrollment } = sheetService.parseRow(row);
        for (const cls of enrollment.desiredClasses) {
            let branch = enrollment.branch;
            if (cls.cellText.includes('1호점')) branch = '1호점';
            else if (cls.cellText.includes('2호점')) branch = '2호점';

            const key = `${cls.day}-${cls.time}-${branch}`;
            if (!uniqueClasses.has(key)) {
                uniqueClasses.set(key, {
                    day: cls.day,
                    time: cls.time,
                    branch: branch,
                    session: '2차',
                    cellText: cls.cellText
                });
            }
        }
    }

    console.log(`Found ${uniqueClasses.size} unique classes in Sheet.`);

    for (const [key, val] of uniqueClasses) {
        const { data: existing } = await supabase
            .from('classes')
            .select('id, name')
            .eq('day_of_week', val.day)
            .eq('branch', val.branch)
            .eq('session', val.session)
            .ilike('start_time', `${val.time}%`)
            .is('deleted_at', null)
            .maybeSingle();

        if (!existing) {
            console.log(`Creating missing class: ${val.cellText} (${val.day} ${val.time} ${val.branch})`);

            // Revert to Complex Name Format: [2차/1호점] 겨울방학특강 월요일 10:30 (Original Text)
            const complexName = `[2차/${val.branch}] 겨울방학특강 ${val.day} ${val.time} (${val.cellText})`;

            await supabase.from('classes').insert({
                name: complexName,
                day_of_week: val.day,
                start_time: val.time + ':00',
                end_time: addMinutes(val.time, 80),
                session: val.session,
                branch: val.branch,
                capacity: 10
            });
        }
    }
    console.log('Class Sync Finished.');
}

function addMinutes(timeStr: string, mins: number): string {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m + mins, 0);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:00`;
}

createClassesOnly();

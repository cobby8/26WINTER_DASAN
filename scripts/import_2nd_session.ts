
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

interface ParsedClass {
    day: string;
    time: string;
    branch: string;
    cellText: string;
}

class SheetService {
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

        console.log(`Fetching ${range}...`);
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: this.sheetId,
            range: range,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) return [];

        // Find Header Row (Look for '이름' or '성명')
        let headerRowIdx = 0;
        for (let i = 0; i < Math.min(rows.length, 20); i++) {
            const row = rows[i];
            if (row.some(c => c && (c.includes('이름') || c.includes('성명') || c.includes('수강생')))) {
                headerRowIdx = i;
                break;
            }
        }
        console.log(`Header found at row ${headerRowIdx + 1}`);

        const headers = rows[headerRowIdx];
        const data = rows.slice(headerRowIdx + 1);

        return data.map((row) => {
            const rowObject: any = {};
            headers.forEach((header, index) => {
                if (header) rowObject[header.trim()] = row[index] || '';
            });
            return rowObject;
        });
    }

    extractClasses(row: any): ParsedClass[] {
        const keys = Object.keys(row);
        const classes: ParsedClass[] = [];
        const days = ['월', '화', '수', '목', '금'];

        // Determine Branch
        // Priority: Explicit Column -> Inference from Cell Text -> Default '1호점'
        // But branch can be different PER CLASS if the sheet structure is weird, 
        // usually it's per student (row). 
        // Looking at previous logic: Branch is determined per row, OR per cell if cell has explicit branch.

        // Find 'Branch' column
        const branchKey = keys.find(k => k.includes('지점'));
        let rowBranch = branchKey ? row[branchKey] : '';
        if (rowBranch.includes('1호점')) rowBranch = '1호점';
        else if (rowBranch.includes('2호점')) rowBranch = '2호점';
        else rowBranch = '1호점'; // Default

        days.forEach(day => {
            // Find column for this day (e.g. "월" or "월요일")
            const dayKey = keys.find(k => k.trim() === day || k.trim() === `${day}요일`);

            if (dayKey) {
                const cellText = row[dayKey] as string;
                if (!cellText || !cellText.trim()) return;

                // Extract Time: Look for "HH:MM" pattern
                const timeMatch = cellText.match(/(\d{1,2}:\d{2})/);
                if (timeMatch) {
                    let time = timeMatch[1].padStart(5, '0');

                    // Override branch if cell text specifies it
                    let strictBranch = rowBranch;
                    if (cellText.includes('1호점')) strictBranch = '1호점';
                    if (cellText.includes('2호점')) strictBranch = '2호점';

                    classes.push({
                        day: day + '요일',
                        time: time,
                        branch: strictBranch,
                        cellText: cellText.trim()
                    });
                }
            }
        });

        return classes;
    }
}

function addMinutes(timeStr: string, mins: number): string {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m + mins, 0);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:00`;
}

async function import2ndSession() {
    console.log('--- Importing 2nd Session Classes ---');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const sheetService = new SheetService();

    // 1. Fetch Data
    const rawRows = await sheetService.fetchRawData('26겨울방학특강2차');
    console.log(`fetched ${rawRows.length} rows.`);

    // 2. Identify Unique Classes
    const uniqueClasses = new Map<string, ParsedClass>();

    for (const row of rawRows) {
        const classes = sheetService.extractClasses(row);
        for (const cls of classes) {
            // Key: Branch + Day + Time
            // Note: If multiple cells describe the same slot with different text, we pick the first one roughly.
            const key = `${cls.branch}|${cls.day}|${cls.time}`;

            if (!uniqueClasses.has(key)) {
                uniqueClasses.set(key, cls);
            }
        }
    }

    console.log(`Identified ${uniqueClasses.size} unique class schedules.`);

    // 3. Create Classes in DB
    let createdCount = 0;
    const START_DATE = '2026-02-02';
    const END_DATE = '2026-02-28';
    const SESSION_NAME = '2차';

    for (const cls of uniqueClasses.values()) {
        const fullStartTime = cls.time.length === 5 ? `${cls.time}:00` : cls.time;
        const endTime = addMinutes(cls.time, 80); // Default 80 mins

        // Name Generation: Restore verbose format
        // "[2차/1호점] 겨울방학특강 월요일 10:30 (Original Text)"
        const name = `[${SESSION_NAME}/${cls.branch}] 겨울방학특강 ${cls.day} ${cls.time} (${cls.cellText})`;

        const { error } = await supabase.from('classes').insert({
            name: name,
            session: SESSION_NAME,
            branch: cls.branch,
            day_of_week: cls.day,
            start_time: fullStartTime,
            end_time: endTime,
            start_date: START_DATE,
            end_date: END_DATE,
            capacity: 10, // Default
            tuition: 0
        });

        if (error) {
            console.error(`Failed to insert ${name}:`, error.message);
        } else {
            createdCount++;
            // console.log(`Created: ${name}`);
        }
    }

    console.log(`Import Complete. Created ${createdCount} classes.`);
}

import2ndSession();

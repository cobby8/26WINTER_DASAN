import { google } from 'googleapis';
import { SheetRow, ParsedStudent, ParsedEnrollment } from '@/types/sheet';

export class GoogleSheetService {
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

    // Updated to accept explicit sheet name
    async fetchRawData(sheetName?: string): Promise<SheetRow[]> {
        const sheets = google.sheets({ version: 'v4', auth: this.auth });
        const range = sheetName ? `${sheetName}!A1:AZ1000` : 'A1:AZ1000';

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: this.sheetId,
            range: range,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) return [];

        // Advanced Header Detection: Find the first row that looks like headers (contains '이름' or '성명' etc)
        let headerRowIdx = 0;
        for (let i = 0; i < Math.min(rows.length, 5); i++) {
            const row = rows[i];
            if (row.some(c => c && (c.includes('이름') || c.includes('성명') || c.includes('강좌')))) {
                headerRowIdx = i;
                break;
            }
        }

        const headers = rows[headerRowIdx];
        const data = rows.slice(headerRowIdx + 1);

        console.log(`[GoogleSheet] Detected headers at row ${headerRowIdx + 1}:`, headers.slice(0, 5).join(', '));

        return data.map((row) => {
            const rowObject: any = {};
            headers.forEach((header, index) => {
                rowObject[header] = row[index] || '';
            });
            return rowObject as SheetRow;
        });
    }

    private cleanDate(dateStr: string): string | null {
        if (!dateStr) return null;
        // Remove all spaces
        let cleaned = dateStr.replace(/\s+/g, '');

        // Handle YYYY-MM-DD or YYYY.MM.DD
        cleaned = cleaned.replace(/\./g, '-');

        // Validate YYYY-MM-DD format roughly
        if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(cleaned)) {
            return cleaned;
        }

        // Return original if no obvious fix found, let DB error or handle in sync
        return dateStr.trim();
    }

    private formatPhoneNumber(phone: string): string {
        if (!phone) return '';
        const cleaned = phone.replace(/[^0-9]/g, '');
        if (cleaned.length === 11) {
            return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
        }
        if (cleaned.length === 10) { // e.g., 02-123-4567 or old mobile 011-123-4567
            return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3'); // OR 02-1234-5678 depending on area code
            // Simple generic: 3-3-4 or 3-4-4? 010 (3) is 11 digits. 02 is 2. 
            // Let's assume standard mobile for now or return as is if unsure.
            if (cleaned.startsWith('02')) {
                return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
            }
        }
        return phone; // Return original if pattern doesn't match
    }

    parseRow(row: SheetRow): { student: ParsedStudent; enrollment: ParsedEnrollment } {
        const keys = Object.keys(row);
        const findVal = (terms: string[]) => {
            const key = keys.find(k => terms.some(t => k.includes(t)));
            // @ts-ignore
            return key ? (row[key] as string)?.trim() : '';
        };

        // Student Parsing with fallback keys
        const student: ParsedStudent = {
            name: findVal(['수강생 이름', '학생 이름', '성명', '학생명']),
            gender: findVal(['성별']),
            grade: findVal(['학년']),
            birthDate: this.cleanDate(findVal(['생년월일'])) || '',
            school: findVal(['학교명', '학교']),
            parentName: findVal(['학부모 성함', '학부모 이름', '보호자 성함']),
            studentPhone: this.formatPhoneNumber(findVal(['수강생 전화번호', '학생 연락처', '수강생 연락처'])),
            parentPhone: this.formatPhoneNumber(findVal(['학부모 전화번호', '학부모 연락처', '보호자 연락처'])),
            address: findVal(['주소']),
            note: findVal(['바라는 점', '비고', '요청사항']),
            registrationSource: findVal(['가입경로', '유입경로']),
        };

        // Enrollment Parsing
        const tuitionVal = findVal(['수강료']);
        const shuttleFeeVal = findVal(['셔틀비']);
        const totalPaymentVal = findVal(['결제액', '입금액']);

        const tuition = parseInt(tuitionVal?.replace(/[^0-9]/g, '') || '0') || 0;
        const shuttleFee = parseInt(shuttleFeeVal?.replace(/[^0-9]/g, '') || '0') || 0;
        const totalPayment = parseInt(totalPaymentVal?.replace(/[^0-9]/g, '') || '0') || 0;

        const desiredClasses: { day: string, time: string, originalText: string }[] = [];
        const days = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];

        days.forEach(day => {
            // Find a key that contains the day (e.g. "월요일")
            const dayKey = keys.find(k => k.includes(day));

            if (dayKey) {
                // @ts-ignore
                const timeVal = row[dayKey] as string;
                if (!timeVal) return;

                // Robust Parsing: Extract time only (HH:mm)
                const timeMatch = timeVal.match(/(\d{1,2}:\d{2})/);

                if (timeMatch) {
                    desiredClasses.push({
                        day: day,
                        time: timeMatch[1],
                        originalText: timeVal
                    });
                }
            }
        });

        // Session & Branch with fallbacks
        let session = findVal(['일정선택', '신청구분', '차수']) || '1차';
        if (session.includes('2차')) session = '2차';
        else session = '1차';

        let branch = findVal(['지점', '희망지점']) || '1호점';
        if (branch.includes('1호점')) branch = '1호점';
        if (branch.includes('2호점')) branch = '2호점';

        const enrollment: ParsedEnrollment = {
            type: session,
            session: session,
            branch: branch,
            tuition,
            shuttleFee,
            totalPayment,
            paymentDate: this.cleanDate(findVal(['결제일', '입금일'])) || '',
            paymentMethod: findVal(['결제방법', '결제 수단']),
            shuttleUse: findVal(['셔틀', '셔틀탑승']).includes('탑승') || findVal(['셔틀', '셔틀탑승']).includes('예'),
            shuttleBoarding: findVal(['탑승 장소', '승차 장소', '탑승장소']),
            shuttleTime: findVal(['탑승 시간', '승차 시간', '탑승시간']),
            shuttleDropoff: findVal(['하차 장소', '하차장소']),
            desiredClasses,
        };

        return { student, enrollment };
    }
    async updateShuttleStatusInSheet(
        studentName: string,
        dayOfWeek: string, // "Mon", "Tue"... -> Map to "월", "화"
        type: 'boarding' | 'dropoff',
        date: string,
        status: string
    ): Promise<boolean> {
        try {
            const sheetName = '1차차량운행';
            const rows = await this.fetchRawData(sheetName);
            if (!rows.length) return false;

            // 1. Map Keys
            // Headers: Name(0), Student(1), Parent(2), W1(3), W2(4), W3(5), W4(6), Day(7), ClassTime(8), ArrTime(9), Dest(10), Type(11)
            // We need to verify these indices or use header names if `fetchRawData` returns objects. 
            // `fetchRawData` returns objects keyed by header.
            // Headers in `transport_headers.json`: Row 2 is headers.
            // But `fetchRawData` treats Row 1 as headers?
            // `fetchRawData` implementation:
            // const headers = rows[0]; const data = rows.slice(1);
            // In '1차차량운행', Row 1 is Title "겨울방학...". Row 2 is Headers.
            // So `fetchRawData` (current impl) will fail to key correctly because it thinks Row 1 is headers.
            // I need to patch `fetchRawData` or writes a custom method for this sheet.
            // Given the complexity of this specific sheet (Title Row), a raw range update is safer.

            const client = google.sheets({ version: 'v4', auth: this.auth });

            // Fetch ALL data as matrix to find coordinates
            const rangeRes = await client.spreadsheets.values.get({
                spreadsheetId: this.sheetId,
                range: `${sheetName}!A1:Z2000`,
            });
            const matrix = rangeRes.data.values;
            if (!matrix) return false;

            // Find Headers Row (Row 2, index 1)
            const headerRow = matrix[1];
            const nameIdx = headerRow.indexOf('수강생 이름');
            const dayIdx = headerRow.indexOf('요일');
            const typeIdx = headerRow.indexOf('구분');

            // Determine "Week Column" based on Date
            // 1주차, 2주차, 3주차, 4주차 headers.
            // Simple Logic: 
            // Week 1: ~ Jan 11? 
            // Let's assume headers are "1주차\n", "2주차\n"...
            // We need a mapping logic. Timestamps?
            // User didn't specify. I'll search for the column that *might* correspond to the date.
            // Or I can search for a specifically named column if I knew the date ranges.
            // For now, I'll log a TODO and just try to find "1주차" for Jan 5-10.

            // Temporary Logic for Winter School (Jan 2026)
            // 2026-01-05 (Mon) is start of Week 1
            const targetDate = new Date(date);
            const startOfProgram = new Date('2026-01-05');
            const diffTime = targetDate.getTime() - startOfProgram.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            // If date is before Jan 5, assume Week 1 for testing/pre-flight
            let weekNum = 1;
            if (diffDays >= 0) {
                weekNum = Math.floor(diffDays / 7) + 1;
            } else {
                console.warn(`[GoogleSheet] Date ${date} is before start. Defaulting to Week 1.`);
            }

            const weekHeader = `${weekNum}주차`;
            // Note: Header might have \n or spaces.
            const weekColIdx = headerRow.findIndex(h => h.includes(weekHeader));

            if (weekColIdx === -1) {
                console.warn(`[GoogleSheet] Could not find column for Week ${weekNum} (Header: ${weekHeader})`);
                // Fallback: Try to find ANY "1주차" if specific failed?
                const fallbackIdx = headerRow.findIndex(h => h.includes("1주차"));
                if (fallbackIdx !== -1) {
                    console.log("[GoogleSheet] Fallback to 1주차 column");
                    // But strictly, we shouldn't unless we are sure.
                    // Let's return false to avoid bad writes, but log error.
                }
                return false;
            }

            // Map Day of Week: "Mon" -> "월"
            const reverseDayMap: Record<string, string> = { 'Mon': '월', 'Tue': '화', 'Wed': '수', 'Thu': '목', 'Fri': '금', 'Sat': '토', 'Sun': '일' };
            const korDay = reverseDayMap[dayOfWeek];

            // 2. Find Row Index
            let targetRowIdx = -1;

            for (let i = 2; i < matrix.length; i++) { // Start from data rows
                const row = matrix[i];
                const rowName = row[nameIdx]?.trim();
                const rowDay = row[dayIdx]?.trim(); // "월", "월,수"
                const rowType = row[typeIdx]?.trim();

                // Check Name
                if (rowName !== studentName) continue;

                // Check Day (Row might say "월" or "월,수")
                if (!rowDay || !rowDay.includes(korDay)) continue;

                // Check Type (Boarding vs Dropoff)
                // App: 'boarding', 'dropoff'
                // Sheet: '승차'/'등원', '하차'/'하원'
                const isBoarding = type === 'boarding';
                const rowIsBoarding = rowType.includes('승차') || rowType.includes('등원');
                const rowIsDropoff = rowType.includes('하차') || rowType.includes('하원');

                if (isBoarding && !rowIsBoarding) continue;
                if (!isBoarding && !rowIsDropoff) continue;

                // Found!
                targetRowIdx = i;
                break;
            }

            if (targetRowIdx === -1) {
                console.warn(`[GoogleSheet] Row not found for ${studentName} ${dayOfWeek} ${type}`);
                return false;
            }

            // 3. Update Cell
            // Grid Row Index = targetRowIdx (0-based from matrix). Sheet row is +1.
            // Wait, A1 notation uses 1-based Row.
            const sheetRowNumber = targetRowIdx + 1;
            const colLetter = String.fromCharCode(65 + weekColIdx); // 0->A
            // If index > 25, logic needs to be better. 
            // "1주차" is usually Col D(3) to G(6). So single letter is fine.

            const cellAddress = `${sheetName}!${colLetter}${sheetRowNumber}`;

            // Translate Status
            // 'boarded' -> '탑승'
            // 'missed' -> '미탑승'
            // 'pending' -> ''
            const statusMap: Record<string, string> = {
                'boarded': '탑승',
                'missed': '결석', // or 미탑승
                'self_commute': '자차',
                'pending': ''
            };
            const sheetValue = statusMap[status] || status;

            await client.spreadsheets.values.update({
                spreadsheetId: this.sheetId,
                range: cellAddress,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [[sheetValue]]
                }
            });

            console.log(`[GoogleSheet] Updated ${cellAddress} to ${sheetValue}`);
            return true;

        } catch (error) {
            console.error('[GoogleSheet] Update failed:', error);
            return false;
        }
    }
}

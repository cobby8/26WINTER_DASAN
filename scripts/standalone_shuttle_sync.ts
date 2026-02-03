
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { supabaseAdmin } from '../src/lib/supabase';
import { GoogleSheetService } from '../src/lib/googleSheet';

// Helper functions from SyncService
function parseShuttleTime(timeStr: any): string | null {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (match) {
        return `${match[1].padStart(2, '0')}:${match[2]}:00`;
    }
    return null;
}

const dayMap: Record<string, string> = { '월': 'Mon', '화': 'Tue', '수': 'Wed', '목': 'Thu', '금': 'Fri', '토': 'Sat', '일': 'Sun' };

async function standaloneSync() {
    console.log('--- Standalone Shuttle Sync (Robust Matching Version) ---');
    const sheetService = new GoogleSheetService();
    const sheetName = '2차차량운행';

    try {
        console.log(`Fetching from Sheet: ${sheetName}`);
        const rawRows = await sheetService.fetchRawData(sheetName);
        console.log(`Fetched ${rawRows.length} rows.`);

        if (rawRows.length === 0) {
            console.log('No data found.');
            return;
        }

        // 1. Fetch Active Schedules
        const { data: existingSchedules, error: fetchError } = await supabaseAdmin
            .from('shuttle_schedules')
            .select('*')
            .is('deleted_at', null);

        if (fetchError) throw new Error(`Fetch Schedules Error: ${fetchError.message}`);

        const activeSchedules = existingSchedules || [];
        const dbMap = new Map<string, any[]>();
        activeSchedules.forEach(s => {
            const key = `${s.student_id}-${s.day_of_week}-${s.type}`;
            if (!dbMap.has(key)) dbMap.set(key, []);
            dbMap.get(key)!.push(s);
        });

        let count = 0;
        let errors: string[] = [];

        // 2. Process Rows
        console.log('Starting Row Processing with Match-by-Phone...');
        for (let i = 0; i < rawRows.length; i++) {
            if (i % 20 === 0) console.log(`Processing ${i}/${rawRows.length}...`);

            try {
                const row = rawRows[i] as any;
                const name = (row['이름'] || row['수강생 이름'] || '').trim();
                if (!name || name === '수강생 이름' || name === '성명') continue;

                const dayRaw = (row['요일'] || '').trim();
                const typeRaw = (row['구분'] || '').trim();
                if (!dayRaw) continue;

                const studentPhone = (row['학생연락처'] || row['학생'] || '').replace(/[^0-9]/g, '');
                const parentPhone = (row['학부모연락처'] || row['학부모'] || '').replace(/[^0-9]/g, '');

                // --- ROBUST MATCHING LOGIC ---
                let studentId = null;

                // 1. Fetch DB Candidates
                const { data: candidates } = await supabaseAdmin
                    .from('students')
                    .select('id, name, student_phone, parent_phone')
                    .eq('name', name);

                if (candidates && candidates.length > 0) {
                    // 2. Filter by Phone
                    const sheetSPhoneLast4 = studentPhone.slice(-4);
                    const sheetPPhoneLast4 = parentPhone.slice(-4);

                    const match = candidates.find(c => {
                        const dbS = (c.student_phone || '').replace(/[^0-9]/g, '');
                        const dbP = (c.parent_phone || '').replace(/[^0-9]/g, '');

                        // If DB phone is empty, we can't be sure, but if only one candidate exists, maybe take it?
                        // Strict mode: Must match phone if Sheet provides phone.

                        if (sheetSPhoneLast4 && dbS.endsWith(sheetSPhoneLast4)) return true;
                        if (sheetPPhoneLast4 && dbP.endsWith(sheetPPhoneLast4)) return true;

                        // If no phone in Sheet? (Unlikely)
                        if (!sheetSPhoneLast4 && !sheetPPhoneLast4) return true; // Name match only

                        return false;
                    });

                    if (match) studentId = match.id;
                }

                if (!studentId) {
                    // Create (with Unique Constraint Recovery)
                    try {
                        const { data: newStudent, error: createError } = await supabaseAdmin
                            .from('students')
                            .insert({ name, student_phone: studentPhone, parent_phone: parentPhone })
                            .select('id')
                            .single();

                        if (createError) {
                            if (createError.code === '23505') { // Unique Constraint Violation
                                // Recovery: Fetch by Unique Key
                                const { data: recovery } = await supabaseAdmin
                                    .from('students')
                                    .select('id')
                                    .eq('name', name)
                                    .eq('parent_phone', parentPhone)
                                    .maybeSingle();
                                if (recovery) studentId = recovery.id;
                                else throw new Error(`Create & Recovery failed for ${name}: ${createError.message}`);
                            } else {
                                throw new Error(`Create failed for ${name}: ${createError.message}`);
                            }
                        } else {
                            studentId = newStudent.id;
                        }
                    } catch (e: any) {
                        errors.push(`Row ${i + 1}: ${e.message}`);
                        continue;
                    }
                }

                if (!studentId) continue;

                // --- Schedule Sync ---
                let type = (typeRaw.includes('승차') || typeRaw.includes('등원')) ? 'boarding' : 'dropoff';

                let timeStr = parseShuttleTime(row['시간'] || row['도착시간']);
                if (!timeStr) {
                    // Logic to parse class time could go here specific to shuttle tab format if needed
                    continue;
                }

                const dayCode = dayMap[dayRaw.charAt(0)] || 'Mon';
                const location = row['목적지'] || row['장소'] || '미정';

                const key = `${studentId}-${dayCode}-${type}`;
                const candidatesDb = dbMap.get(key) || [];

                if (candidatesDb.length > 0) {
                    const match = candidatesDb[0];
                    if (match.time !== timeStr || match.location_name !== location) {
                        await supabaseAdmin.from('shuttle_schedules').update({ deleted_at: new Date().toISOString() }).eq('id', match.id);
                        await supabaseAdmin.from('shuttle_schedules').insert({
                            student_id: studentId,
                            day_of_week: dayCode,
                            type,
                            time: timeStr,
                            location_name: location
                        });
                        count++;
                    }
                } else {
                    await supabaseAdmin.from('shuttle_schedules').insert({
                        student_id: studentId,
                        day_of_week: dayCode,
                        type,
                        time: timeStr,
                        location_name: location
                    });
                    count++;
                }

            } catch (rowError: any) {
                console.error(`Row ${i + 1} Error: ${rowError.message}`);
                errors.push(`Row ${i + 1}: ${rowError.message}`);
            }
        } // End Loop

        console.log(`Processed ${count} updates/inserts.`);
        if (errors.length > 0) {
            console.log(`Errors (${errors.length}):`);
            errors.slice(0, 5).forEach(e => console.log(e));
        }

    } catch (e: any) {
        console.error('Fatal Error:', e.message);
    }
}

standaloneSync();

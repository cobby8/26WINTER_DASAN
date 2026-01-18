import { GoogleSheetService } from './googleSheet';
import { supabaseAdmin } from './supabase';
import { ParsedStudent, ParsedEnrollment } from '@/types/sheet';
import { revalidatePath } from 'next/cache';

export class SyncService {
    private sheetService: GoogleSheetService;

    constructor() {
        this.sheetService = new GoogleSheetService();
    }

    async syncData() {
        let processedCount = 0;
        let errors: string[] = [];

        console.log('--- Sync Data Process Started ---');

        let rawRows;
        try {
            // 우선 '수강신청' 탭 시도, 없으면 기본 시트
            try {
                rawRows = await this.sheetService.fetchRawData('수강신청');
                if (rawRows.length === 0) throw new Error('Empty');
            } catch (e) {
                console.log('Tab "수강신청" not found or empty, trying default sheet...');
                rawRows = await this.sheetService.fetchRawData();
            }
            console.log(`Fetched ${rawRows.length} rows.`);
        } catch (err: any) {
            console.error('Fetch Raw Data Error:', err);
            throw new Error(`Sheet Data Fetch Failed: ${err.message}`);
        }

        // --- PHASE 0: Parse ALL Rows ---
        // We need to gather all Classes first to perform "Global Sync" (and cleanup deleted ones).
        const parsedData = [];
        const uniqueClasses = new Map<string, any>(); // Key: `${day}-${time}-${session}-${branch}`

        for (let i = 0; i < rawRows.length; i++) {
            const rawRow = rawRows[i];
            try {
                const { student, enrollment } = this.sheetService.parseRow(rawRow);

                // SKIP EMPTY
                if (!student.name ||
                    student.name.trim() === '' ||
                    student.name.includes('성명') ||
                    student.name.includes('이름') ||
                    student.name === 'undefined' ||
                    enrollment.desiredClasses.length === 0) {
                    continue;
                }

                parsedData.push({ student, enrollment, rowIndex: i });

                // Collect Unique Classes
                for (const classObj of enrollment.desiredClasses) {
                    const day = classObj.day; // e.g. "월요일"
                    // Normalize Time: Ensure HH:MM format (9:30 -> 09:30)
                    let time = classObj.time;
                    if (time && time.indexOf(':') !== -1) {
                        const [h, m] = time.split(':');
                        time = `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
                    }
                    const session = enrollment.session || '1차';
                    const branch = enrollment.branch || '1호점';

                    const key = `${day}-${time}-${session}-${branch}`;
                    if (!uniqueClasses.has(key)) {
                        // Standardize Name
                        let className = `[${session}/${branch}] 겨울방학특강 ${day} ${time}`;
                        if (classObj.originalText && classObj.originalText !== time) {
                            if (classObj.originalText.length > 5) {
                                className += ` (${classObj.originalText})`;
                            }
                        }

                        uniqueClasses.set(key, {
                            name: className,
                            day_of_week: day,
                            start_time: time, // Now Normalized HH:MM
                            end_time: time,   // DB expects Time type, HH:MM is fine
                            branch: branch,
                            session: session
                        });
                    }
                }

            } catch (e: any) {
                errors.push(`Row ${i + 1} Parse Error: ${e.message}`);
            }
        }

        // --- PHASE 1: Sync Classes (Versioning / Soft Delete) ---
        // Goal: Ensure all unique classes exist. Soft Delete any DB class NOT in uniqueClasses.
        try {
            await this.syncClasses(uniqueClasses);
        } catch (msg: any) {
            errors.push(`Class Sync Critical Error: ${msg.message || msg}`);
            // If Class Sync fails, we probably shouldn't proceed with enrollments as they depend on valid class IDs.
            // But we try anyway best effort? No, safely return.
            return { processedCount: 0, errors };
        }




        // --- PHASE 2: Sync Students & Enrollments ---
        const touchedStudentIds = new Set<string>();
        for (const item of parsedData) {
            const { student, enrollment, rowIndex } = item;
            const studentName = student.name;
            try {
                // 1. Upsert Student
                const { data: studentData, error: studentError } = await supabaseAdmin
                    .from('students')
                    .upsert({
                        name: student.name,
                        gender: student.gender,
                        grade: student.grade,
                        birth_date: this.parseDate(student.birthDate),
                        school: student.school,
                        parent_name: student.parentName,
                        student_phone: student.studentPhone,
                        parent_phone: student.parentPhone,
                        address: student.address,
                        note: student.note,
                        registration_source: student.registrationSource,
                        deleted_at: null // Ensure reactivated if was deleted
                    }, { onConflict: 'name, parent_phone' })
                    .select('id')
                    .single();

                if (studentError) throw new Error(`Student Error: ${studentError.message}`);
                const studentId = studentData.id;
                touchedStudentIds.add(studentId);

                // 2. Process Classes & Enrollments (Link to synced classes)
                for (const classObj of enrollment.desiredClasses) {
                    const day = classObj.day;
                    const time = classObj.time;
                    const session = enrollment.session || '1차';
                    const branch = enrollment.branch || '1호점';

                    // Find Class ID from DB (now guaranteed to exist and be active)
                    const { data: classData } = await supabaseAdmin
                        .from('classes')
                        .select('id')
                        .eq('day_of_week', day)
                        .eq('start_time', time)
                        .eq('session', session)
                        .eq('branch', branch)
                        .is('deleted_at', null) // Only link to Active
                        .single();

                    if (!classData) {
                        // Should not happen if Phase 1 succeeded
                        throw new Error(`Class ID not found for ${day} ${time} (${branch}). Sync bug?`);
                    }

                    // Upsert Enrollment
                    const { error: enrollError } = await supabaseAdmin
                        .from('enrollments')
                        .upsert({
                            student_id: studentId,
                            class_id: classData.id,
                            type: enrollment.type,
                            shuttle_use: enrollment.shuttleUse,
                            shuttle_boarding: enrollment.shuttleBoarding,
                            shuttle_time: enrollment.shuttleTime,
                            shuttle_dropoff: enrollment.shuttleDropoff,
                            status: 'active'
                        }, { onConflict: 'student_id, class_id' });

                    if (enrollError) throw new Error(`Enrollment Error: ${enrollError.message}`);
                }

                // 3. Upsert Payment Info
                const { error: payError } = await supabaseAdmin
                    .from('payments')
                    .upsert({
                        student_id: studentId,
                        amount: enrollment.totalPayment,
                        tuition_fee: enrollment.tuition,
                        shuttle_fee: enrollment.shuttleFee,
                        payment_date: this.parseDate(enrollment.paymentDate),
                        payment_method: enrollment.paymentMethod,
                        status: enrollment.totalPayment > 0 ? 'paid' : 'pending'
                    });

                if (payError) throw new Error(`Payment Error: ${payError.message}`);

                processedCount++;

            } catch (e: any) {
                console.error(`Error processing student ${studentName}:`, e.message);
                errors.push(`Row ${rowIndex + 1} (${studentName}): ${e.message}`);
            }
        }

        // --- PHASE 3: Cleanup Students ---
        try {
            const { data: allActiveStudents } = await supabaseAdmin
                .from('students')
                .select('id')
                .is('deleted_at', null);

            if (allActiveStudents) {
                const studentsToDelete = allActiveStudents.filter(s => !touchedStudentIds.has(s.id));
                if (studentsToDelete.length > 0) {
                    console.log(`[StudentCleanup] Soft Deleting ${studentsToDelete.length} students...`);
                    const ids = studentsToDelete.map(s => s.id);
                    await supabaseAdmin
                        .from('students')
                        .update({ deleted_at: new Date().toISOString() })
                        .in('id', ids);
                }
            }
        } catch (cleanupErr: any) {
            console.error('Student Cleanup Error:', cleanupErr);
            errors.push(`Student Cleanup Failed: ${cleanupErr.message}`);
        }

        // 4. 차량 운행(셔틀) 데이터 동기화 통합 호출
        try {
            console.log('--- Starting Shuttle Transport Sync Integration ---');
            const shuttleResult = await this.syncShuttleTransport();
            processedCount += shuttleResult.count;
            if (shuttleResult.errors.length > 0) {
                errors.push(...shuttleResult.errors.map(e => `[Shuttle] ${e}`));
            }
        } catch (shuttleErr: any) {
            console.error('Shuttle Sync Integration Error:', shuttleErr);
            errors.push(`Shuttle Sync Failed: ${shuttleErr.message}`);
        }

        console.log(`--- Sync Complete. Processed: ${processedCount}, Errors: ${errors.length} ---`);

        // 동기화 완료 후 관리자 페이지 캐시 갱신 (서버 환경에서만 실행)
        try {
            revalidatePath('/admin');
            revalidatePath('/admin/shuttle');
            revalidatePath('/admin/classes');
            revalidatePath('/admin/sync');
        } catch (revalidateError) {
            console.warn('Revalidate failed (this is expected in some script environments):', revalidateError);
        }

        return { processedCount, errors };
    }

    /**
     * Phase 1: Sync Classes Table (Versioning / Soft Delete)
     */
    async syncClasses(sheetClasses: Map<string, any>) {
        console.log(`[ClassSync] Found ${sheetClasses.size} unique classes in sheet.`);

        // 1. Fetch ALL Active DB Classes
        const { data: activeClasses, error } = await supabaseAdmin
            .from('classes')
            .select('*')
            .is('deleted_at', null);

        if (error) throw new Error(`Fetch Classes Error: ${error.message}`);

        const dbClasses = activeClasses || [];
        const touchedClassIds = new Set<string>();

        // 2. Match & Sync
        // We iterate "Sheet Classes" -> Ensure they exist in DB (Update if needed, Insert if new)
        // Then iterate "DB Classes" -> If not touched, Soft Delete.

        for (const [key, cls] of sheetClasses) {
            // Key is `${day}-${time}-${session}-${branch}`
            // Find in DB
            const match = dbClasses.find(d =>
                d.day_of_week === cls.day_of_week &&
                d.start_time.substring(0, 5) === cls.start_time.substring(0, 5) && // Time compare carefully
                d.session === cls.session &&
                d.branch === cls.branch
            );

            if (match) {
                touchedClassIds.add(match.id);
                // Update Name if changed (Metadata update)
                // We do NOT soft reset if just name changed, as identity is same (slot is same).
                if (match.name !== cls.name) {
                    await supabaseAdmin.from('classes').update({ name: cls.name }).eq('id', match.id);
                }
            } else {
                // Insert New
                await supabaseAdmin.from('classes').insert({
                    name: cls.name,
                    day_of_week: cls.day_of_week,
                    start_time: cls.start_time,
                    end_time: cls.end_time,
                    session: cls.session,
                    branch: cls.branch,
                    capacity: 20 // Default
                });
            }
        }

        // 3. Soft Delete Orphans
        const orphans = dbClasses.filter(d => !touchedClassIds.has(d.id));
        if (orphans.length > 0) {
            console.log(`[ClassSync] Soft Deleting ${orphans.length} classes not in sheet...`);
            const orphanIds = orphans.map(d => d.id);
            await supabaseAdmin
                .from('classes')
                .update({ deleted_at: new Date().toISOString() })
                .in('id', orphanIds);
        }
    }

    /**
     * '1차차량운행' 시트의 데이터를 shuttle_schedules 테이블과 동기화
     * Strategy: Versioning with Soft Delete
     * 1. Fetch ALL active schedules (deleted_at IS NULL).
     * 2. Parse ALL sheet rows.
     * 3. Match:
     *    - If matched (Student + Day + Type):
     *      - If Time/Loc changed -> Soft Delete Old + Insert New.
     *      - If same -> Skip.
     *    - If Not matched (New): Insert New.
     * 4. Cleanup:
     *    - Any Active DB Schedule NOT in Sheet -> Soft Delete.
     */
    async syncShuttleTransport() {
        let count = 0;
        let errors: string[] = [];
        const sheetName = '1차차량운행';

        try {
            const rawRows = await this.sheetService.fetchRawData(sheetName);
            // Ignore empty check here to allow full cleanup if sheet is empty? 
            // Validating "Empty" vs "Sheet Error" is important. 
            // If fetchRawData throws, we catch below. If empty array, maybe user cleared it.
            // But let's be safe: if 0 rows, we might assume nothing to do or wipe everything?
            // Let's assume 0 rows means "no data to sync", but we should be careful about mass deletion.
            if (rawRows.length === 0) {
                console.log(`[Shuttle] No data found in ${sheetName}. Skipping sync to prevent accidental wipe.`);
                return { count: 0, errors: [] };
            }

            // 1. Fetch ALL Active Schedules
            const { data: existingSchedules, error: fetchError } = await supabaseAdmin
                .from('shuttle_schedules')
                .select('*')
                .is('deleted_at', null);

            if (fetchError) throw new Error(`Fetch Schedules Error: ${fetchError.message}`);

            const activeSchedules = existingSchedules || [];
            // Map for quick lookup: Key = `${studentId}-${dayCode}-${type}`
            const dbMap = new Map<string, any[]>();
            activeSchedules.forEach(s => {
                const key = `${s.student_id}-${s.day_of_week}-${s.type}`;
                if (!dbMap.has(key)) dbMap.set(key, []);
                dbMap.get(key)!.push(s);
            });

            // Track which DB IDs were "touched" (matched). Untouched ones will be soft-deleted.
            const touchedScheduleIds = new Set<string>();

            // 2. Process Sheet Rows
            const dayMap: Record<string, string> = { '월': 'Mon', '화': 'Tue', '수': 'Wed', '목': 'Thu', '금': 'Fri', '토': 'Sat', '일': 'Sun' };

            for (let i = 0; i < rawRows.length; i++) {
                const row = rawRows[i] as any;
                const name = (row['수강생 이름'] || '').trim();
                if (!name || name === '수강생 이름' || name === '성명') continue;

                const dayRaw = (row['요일'] || '').trim();
                const typeRaw = (row['구분'] || '').trim();
                if (!dayRaw || !typeRaw) continue;

                const studentPhone = (row['학생'] || '').replace(/[^0-9]/g, '');
                const parentPhone = (row['학부모'] || '').replace(/[^0-9]/g, '');

                // 2-1. Find Student ID
                // Use looser matching or robust matching if needed. 
                // We should cache students for performance, but loop is fine for <500 rows.
                let { data: student } = await supabaseAdmin
                    .from('students')
                    .select('id')
                    .eq('name', name)
                    .maybeSingle();

                // Enhanced Matching: If multiple with Same Name, check parent phone?
                // Currently 'name' is not unique, but unique(name, parent_phone). 
                // maybeSingle() returns one or null. If multiple, it warns/errors? 
                // maybeSingle implies 0 or 1. If multiple, it errors.
                // We should use .eq('name', name).eq('parent_phone', parentPhone) if possible.
                // But sheet phone format might differ from DB.
                // Let's stick to name for now, or improve if user requests.

                let studentId = student?.id;
                if (!studentId) {
                    // Create Student
                    const { data: newStudent, error: createError } = await supabaseAdmin
                        .from('students')
                        .insert({
                            name,
                            student_phone: studentPhone,
                            parent_phone: parentPhone,
                        })
                        .select('id')
                        .single();
                    if (createError) {
                        errors.push(`Row ${i + 1} (${name}): Student creation failed - ${createError.message}`);
                        continue;
                    }
                    studentId = newStudent.id;
                }

                // 2-2. Parse Time & Info
                let timeStr = this.parseShuttleTime(row['도착시간']);
                const type = (typeRaw.includes('승차') || typeRaw.includes('등원')) ? 'boarding' : 'dropoff';

                if (!timeStr) {
                    if (row['수업시간']) {
                        const match = row['수업시간'].match(/(\d{1,2}:\d{2})~(\d{1,2}:\d{2})/);
                        if (match) {
                            if (type === 'boarding') {
                                const [h, m] = match[1].split(':').map(Number);
                                let val = h * 60 + m - 30;
                                let h2 = Math.floor(val / 60);
                                let m2 = val % 60;
                                timeStr = `${h2.toString().padStart(2, '0')}:${m2.toString().padStart(2, '0')}:00`;
                            } else {
                                timeStr = `${match[2]}:00`;
                            }
                        }
                    }
                }
                if (!timeStr) continue;

                const dayCode = dayMap[dayRaw.charAt(0)] || 'Mon';
                const location = row['목적지'] || '미정';
                const locationAddress = row['주소'] || location; // If address col exists?

                // 2-3. Match against DB
                const key = `${studentId}-${dayCode}-${type}`;
                const candidates = dbMap.get(key) || [];

                let matchedDbSchedule = null;

                if (candidates.length > 0) {
                    // If multiple? Take first.
                    matchedDbSchedule = candidates[0];
                    touchedScheduleIds.add(matchedDbSchedule.id);

                    // Version Check: Has it changed?
                    // normalize times (HH:MM:SS)
                    const dbTime = matchedDbSchedule.time;
                    const dbLoc = matchedDbSchedule.location_name;

                    const isTimeChanged = dbTime !== timeStr;
                    const isLocChanged = dbLoc !== location;

                    if (isTimeChanged || isLocChanged) {
                        console.log(`[Shuttle] Change Detected for ${name} (${dayCode}): ${dbTime} -> ${timeStr}`);

                        // SOFT DELETE OLD
                        await supabaseAdmin
                            .from('shuttle_schedules')
                            .update({ deleted_at: new Date().toISOString() })
                            .eq('id', matchedDbSchedule.id);

                        // INSERT NEW
                        const { error: insertError } = await supabaseAdmin
                            .from('shuttle_schedules')
                            .insert({
                                student_id: studentId,
                                day_of_week: dayCode,
                                type: type,
                                time: timeStr,
                                location_name: location,
                                location_address: locationAddress
                            });

                        if (insertError) errors.push(`Row ${i + 1}: Update-Insert failed - ${insertError.message}`);
                        else count++;
                    } else {
                        // Same -> No op
                        // console.log(`[Shuttle] No change for ${name} (${dayCode})`);
                    }
                } else {
                    // New Record
                    const { error: insertError } = await supabaseAdmin
                        .from('shuttle_schedules')
                        .insert({
                            student_id: studentId,
                            day_of_week: dayCode,
                            type: type,
                            time: timeStr,
                            location_name: location,
                            location_address: locationAddress
                        });

                    if (insertError) errors.push(`Row ${i + 1}: Insert failed - ${insertError.message}`);
                    else count++;
                }

            } // End Loop

            // 3. Cleanup Untouched (Deleted from Sheet)
            // Filter activeSchedules to find ids NOT in touchedScheduleIds
            const toDelete = activeSchedules.filter(s => !touchedScheduleIds.has(s.id));
            if (toDelete.length > 0) {
                console.log(`[Shuttle] Soft Deleting ${toDelete.length} removed schedules...`);
                const idsToDelete = toDelete.map(s => s.id);

                const { error: deleteError } = await supabaseAdmin
                    .from('shuttle_schedules')
                    .update({ deleted_at: new Date().toISOString() })
                    .in('id', idsToDelete);

                if (deleteError) errors.push(`Cleanup Failed: ${deleteError.message}`);
                else count += toDelete.length;
            }

            return { count, errors };
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error('[SyncService] Shuttle sync fatal error:', msg);
            return { count: 0, errors: [`Fatal sync error: ${msg}`] };
        }
    }

    private parseShuttleTime(timeStr: any): string | null {
        if (!timeStr || typeof timeStr !== 'string') return null;
        const match = timeStr.match(/(\d{1,2}):(\d{2})/);
        if (match) {
            return `${match[1].padStart(2, '0')}:${match[2]}:00`;
        }
        return null;
    }

    private parseDate(dateStr: string | null | undefined): string | null {
        if (!dateStr) return null;

        let cleaned = dateStr.trim();
        if (!cleaned) return null;

        // Handle "1/13" or "01/13" format (MM/DD) -> Assume current year
        if (/^\d{1,2}\/\d{1,2}$/.test(cleaned)) {
            const [month, day] = cleaned.split('/').map(Number);
            const year = new Date().getFullYear();
            return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        }

        // Handle "2024.01.13" or "2024.1.13"
        cleaned = cleaned.replace(/\./g, '-');

        // Handle "2024/01/13"
        cleaned = cleaned.replace(/\//g, '-');

        // Simple check if it looks like a date matching YYYY-MM-DD
        if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(cleaned)) {
            const parts = cleaned.split('-');
            return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }

        return null;
    }
}

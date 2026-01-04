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

        for (let i = 0; i < rawRows.length; i++) {
            const rawRow = rawRows[i];
            let studentName = 'Unknown';
            try {
                const { student, enrollment } = this.sheetService.parseRow(rawRow);
                studentName = student.name || `Row ${i + 1}`;

                // SKIP EMPTY OR HEADER ROWS
                if (!student.name ||
                    student.name.trim() === '' ||
                    student.name.includes('성명') ||
                    student.name.includes('이름') ||
                    student.name === 'undefined' ||
                    enrollment.desiredClasses.length === 0) {
                    continue;
                }

                // 1. Upsert Student (Match by name and parent phone to avoid duplicates)
                // Note: Real-world matching might need to be more robust.
                const { data: studentData, error: studentError } = await supabaseAdmin
                    .from('students')
                    .upsert({
                        name: student.name,
                        gender: student.gender,
                        grade: student.grade,
                        birth_date: student.birthDate ? student.birthDate.replace(/\./g, '-') : null, // format date
                        school: student.school,
                        parent_name: student.parentName,
                        student_phone: student.studentPhone,
                        parent_phone: student.parentPhone,
                        address: student.address,
                        note: student.note,
                        registration_source: student.registrationSource
                    }, { onConflict: 'name, parent_phone' }) // Assuming unique constraint on name+parent_phone or we need to query first.
                    .select('id')
                    .single();

                if (studentError) throw new Error(`Student Error: ${studentError.message}`);
                if (!studentData) throw new Error('Student Upsert failed');

                const studentId = studentData.id;

                // 2. Process Classes & Enrollments
                for (const classObj of enrollment.desiredClasses) {
                    const day = classObj.day;
                    const time = classObj.time;
                    const session = enrollment.session || '1차'; // Default
                    const branch = enrollment.branch || '1호점'; // Default

                    // Construct Class Name (Standardized)
                    // Pattern: "[1차/1호점] 겨울방학특강 월요일 14:00"
                    let className = `[${session}/${branch}] 겨울방학특강 ${day} ${time}`;

                    if (classObj.originalText && classObj.originalText !== time) {
                        className += ` (${classObj.originalText})`;
                    }

                    let classId;

                    // STRICT MATCHING STRATEGY
                    // Find class by COMPOSITE KEY: session + branch + day + time
                    // This ensures we never create duplicates for the same actual class slot.
                    const { data: existingClass } = await supabaseAdmin
                        .from('classes')
                        .select('id')
                        .eq('day_of_week', day)
                        .eq('start_time', time)
                        .eq('session', session)
                        .eq('branch', branch)
                        .single();

                    if (existingClass) {
                        classId = existingClass.id;

                        // FORCE UPDATE: 정보 불일치 시 업데이트 (지점명/차수 등)
                        const { error: updateError } = await supabaseAdmin
                            .from('classes')
                            .update({
                                name: className,
                                branch: branch,
                                session: session
                            })
                            .eq('id', classId);

                        if (updateError) console.error(`Failed to update class ${classId}: ${updateError.message}`);
                    } else {
                        // Create New Class ONLY if strict match fails
                        const { data: newClass, error: createError } = await supabaseAdmin
                            .from('classes')
                            .insert({
                                name: className,
                                day_of_week: day,
                                start_time: time,
                                end_time: time,
                                branch: branch,
                                session: session
                            })
                            .select('id')
                            .single();

                        if (createError) throw new Error(`Class Create Error: ${createError.message}`);
                        classId = newClass.id;
                    }

                    // Upsert Enrollment
                    const { error: enrollError } = await supabaseAdmin
                        .from('enrollments')
                        .upsert({
                            student_id: studentId,
                            class_id: classId,
                            type: enrollment.type,
                            shuttle_use: enrollment.shuttleUse,
                            shuttle_boarding: enrollment.shuttleBoarding,
                            shuttle_time: enrollment.shuttleTime,
                            shuttle_dropoff: enrollment.shuttleDropoff,
                            status: 'active' // Ensure status is active on sync
                        }, { onConflict: 'student_id, class_id' });

                    if (enrollError) throw new Error(`Enrollment Error: ${enrollError.message}`);
                }

                // 3. Upsert Payment Info (One per student or per enrollment? Sheet structure suggests per student/entry)
                // We'll upsert based on student_id for simplicity as an initial balance.
                // In reality, multiple submissions might mean multiple payments, but let's assume one main entry.
                const { error: payError } = await supabaseAdmin
                    .from('payments')
                    .upsert({
                        student_id: studentId,
                        amount: enrollment.totalPayment,
                        tuition_fee: enrollment.tuition,
                        shuttle_fee: enrollment.shuttleFee,
                        payment_date: enrollment.paymentDate ? enrollment.paymentDate.replace(/\./g, '-') : null,
                        payment_method: enrollment.paymentMethod,
                        status: enrollment.totalPayment > 0 ? 'paid' : 'pending' // Simple logic
                    });

                if (payError) throw new Error(`Payment Error: ${payError.message}`);

                processedCount++;

            } catch (e: any) {
                console.error(`Error processing student ${studentName}:`, e.message);
                errors.push(`Row ${i + 1} (${studentName}): ${e.message}`);
            }
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
            revalidatePath('/admin/sync');
        } catch (revalidateError) {
            console.warn('Revalidate failed (this is expected in some script environments):', revalidateError);
        }

        return { processedCount, errors };
    }

    /**
     * '1차차량운행' 시트의 데이터를 shuttle_schedules 테이블과 동기화
     */
    async syncShuttleTransport() {
        let count = 0;
        let errors: string[] = [];
        const sheetName = '1차차량운행';

        try {
            const rawRows = await this.sheetService.fetchRawData(sheetName);
            if (rawRows.length === 0) {
                console.log(`[Shuttle] No data found in ${sheetName}.`);
                return { count: 0, errors: [] };
            }

            // fetchRawData는 이미 헤더를 객체 키로 변환해서 반환함.
            for (let i = 0; i < rawRows.length; i++) {
                const row = rawRows[i] as any;
                const name = (row['수강생 이름'] || '').trim();
                if (!name || name === '수강생 이름' || name === '성명') continue;

                const dayRaw = (row['요일'] || '').trim();
                const typeRaw = (row['구분'] || '').trim();
                if (!dayRaw || !typeRaw) continue;

                const studentPhone = (row['학생'] || '').replace(/[^0-9]/g, '');
                const parentPhone = (row['학부모'] || '').replace(/[^0-9]/g, '');

                // 1. 학생 찾기
                const { data: student } = await supabaseAdmin
                    .from('students')
                    .select('id')
                    .eq('name', name)
                    .maybeSingle();

                let studentId = student?.id;

                if (!studentId) {
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

                // 2. 시간 파싱
                let timeStr = this.parseShuttleTime(row['도착시간']);
                const type = (typeRaw.includes('승차') || typeRaw.includes('등원')) ? 'boarding' : 'dropoff';

                if (!timeStr) {
                    // Try parsing from '수업시간' fallback
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

                // 3. 셔틀 스케줄 수동 매칭 후 업데이트 (중복 방지)
                const dayMap: Record<string, string> = { '월': 'Mon', '화': 'Tue', '수': 'Wed', '목': 'Thu', '금': 'Fri', '토': 'Sat', '일': 'Sun' };
                const dayCode = dayMap[dayRaw.charAt(0)] || 'Mon';
                const location = row['목적지'] || '미정';

                // 기존 스케줄 존재 여부 확인
                const { data: existingSchedules } = await supabaseAdmin
                    .from('shuttle_schedules')
                    .select('id, time')
                    .eq('student_id', studentId)
                    .eq('day_of_week', dayCode)
                    .eq('type', type);

                // 중복 처리: 이미 해당 학생/요일/타입의 스케줄이 있다면, 
                // 만약 현재 시트의 timeStr이 '도착시간'에서 직접 온 것이라면(유효한 시간) 업데이트하고,
                // 아니라면(fallback) 기존 데이터가 없을 때만 유지함.
                const existingSchedule = existingSchedules && existingSchedules.length > 0 ? existingSchedules[0] : null;

                if (existingSchedule) {
                    // 중복 로우인 경우 (이도경 사례): 이미 데이터가 있고, 새로 읽은 시트의 도착시간이 빈 값이라면 스킵
                    // (즉, 이미 유효한 데이터가 먼저 파싱되었다면 빈 데이터가 덮어쓰지 못하게 함)
                    if (!row['도착시간'] && existingSchedule.time !== '00:00:00') {
                        console.log(`[Shuttle] Skipping duplicate row for ${name} as existing record has valid time.`);
                        continue;
                    }

                    // 업데이트
                    const { error: updateError } = await supabaseAdmin
                        .from('shuttle_schedules')
                        .update({
                            time: timeStr,
                            location_name: location,
                            location_address: location
                        })
                        .eq('id', existingSchedule.id);
                    if (updateError) errors.push(`Row ${i + 1} (${name}): Update failed - ${updateError.message}`);
                    else count++;
                } else {
                    // 새로 삽입
                    const { error: insertError } = await supabaseAdmin
                        .from('shuttle_schedules')
                        .insert({
                            student_id: studentId,
                            day_of_week: dayCode,
                            type: type,
                            time: timeStr,
                            location_name: location,
                            location_address: location
                        });
                    if (insertError) errors.push(`Row ${i + 1} (${name}): Insert failed - ${insertError.message}`);
                    else count++;
                }
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
}

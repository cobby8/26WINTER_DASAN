
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generateAttendanceRecordsFeb() {
    console.log('--- Generating Daily Attendance Records for Feb 2026 (2nd Session) ---');

    // 1. Fetch Active Enrollments for 2nd Session
    // Step 1: Get 2nd Session Classes
    const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('session', '2차')
        .is('deleted_at', null);

    if (classError || !classes || classes.length === 0) {
        console.error('No 2nd session classes found.');
        return;
    }

    // Create Map for quick lookup
    const classMap = new Map(classes.map(c => [c.id, c]));

    // Step 2: Get Enrollments for these classes
    const classIds = classes.map(c => c.id);
    const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select('*')
        .in('class_id', classIds)
        .eq('status', 'active');

    if (enrollError) {
        console.error('Enrollment fetch error:', enrollError);
        return;
    }

    if (!enrollments || enrollments.length === 0) {
        console.log('No active enrollments found for 2nd session classes.');
        return;
    }

    console.log(`Found ${enrollments.length} enrollments to process.`);

    // 2. Define Date Range & Exclusion
    const startDate = new Date('2026-02-02'); // Monday
    const endDate = new Date('2026-02-28');   // Saturday

    // Exclusion: Feb 16-20
    const excludeStart = new Date('2026-02-16').getTime();
    const excludeEnd = new Date('2026-02-20').getTime();

    // Mapping Day string to JS Day index
    const dayMap: Record<string, number> = {
        '일요일': 0, '월요일': 1, '화요일': 2, '수요일': 3, '목요일': 4, '금요일': 5, '토요일': 6
    };

    let createdCount = 0;

    for (const enrollment of enrollments) {
        const cls = classMap.get(enrollment.class_id);
        if (!cls) continue;

        const targetDay = dayMap[cls.day_of_week];
        if (targetDay === undefined) {
            console.warn(`Unknown day: ${cls.day_of_week}`);
            continue;
        }

        // Iterate dates
        let curr = new Date(startDate);
        while (curr <= endDate) {
            if (curr.getDay() === targetDay) {
                // Check exclusion
                const t = curr.getTime();
                if (t >= excludeStart && t <= excludeEnd) {
                    process.stdout.write('.'); // Show progress
                    // console.log(`  Skipping Holiday: ${curr.toISOString().split('T')[0]}`);
                } else {
                    const dateStr = curr.toISOString().split('T')[0];

                    // Check existence to avoid duplicates
                    const { data: existing } = await supabase
                        .from('attendance')
                        .select('id')
                        .eq('enrollment_id', enrollment.id)
                        .eq('date', dateStr)
                        .maybeSingle();

                    if (!existing) {
                        const { error: upsertError } = await supabase
                            .from('attendance')
                            .insert({
                                enrollment_id: enrollment.id,
                                class_id: cls.id,
                                date: dateStr,
                                status: 'present', // Default
                                created_at: new Date().toISOString()
                            });

                        if (upsertError) {
                            console.error(`Error creating attendance:`, upsertError.message);
                        } else {
                            createdCount++;
                        }
                    }
                }
            }
            curr.setDate(curr.getDate() + 1);
        }
    }
    console.log('\n');
    console.log(`Finished. Created ${createdCount} new attendance records.`);
}

generateAttendanceRecordsFeb();

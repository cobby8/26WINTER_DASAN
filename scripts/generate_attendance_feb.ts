
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generateAttendanceFeb() {
    console.log('--- Generating Attendance Sessions for Feb 2026 (2nd Session) ---');

    // 1. Fetch '2차' Classes
    const { data: classes, error: fetchError } = await supabase
        .from('classes')
        .select('*')
        .eq('session', '2차')
        .is('deleted_at', null);

    if (fetchError) {
        console.error('Fetch Error:', fetchError);
        return;
    }

    if (!classes || classes.length === 0) {
        console.log('No 2nd Session classes found. Did you run create_2nd_session_classes.ts?');
        return;
    }

    console.log(`Found ${classes.length} 2nd Session classes.`);

    // 2. Define Date Range & Exclusion
    const startDate = new Date('2026-02-02');
    const endDate = new Date('2026-02-28');

    // Exclusion: Feb 16 (Mon) - Feb 20 (Fri) basically the whole week.
    // Actually dates are: 16, 17, 18, 19, 20.
    // We can just check string format or range.
    const excludeStart = new Date('2026-02-16').getTime();
    const excludeEnd = new Date('2026-02-20').getTime();

    // Helper: Map 'Mon' -> 1, 'Tue' -> 2...
    const dayMap: Record<string, number> = {
        'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    };

    let sessionCount = 0;

    for (const cls of classes) {
        const classDay = dayMap[cls.day_of_week];
        if (classDay === undefined) continue;

        // Iterate dates
        let curr = new Date(startDate);
        while (curr <= endDate) {
            // Check day of week
            if (curr.getDay() === classDay) {
                // Check exclusion
                const t = curr.getTime();
                if (t >= excludeStart && t <= excludeEnd) {
                    console.log(`Skipping Holiday: ${curr.toISOString().split('T')[0]} for ${cls.name}`);
                } else {
                    // Create Session
                    const dateStr = curr.toISOString().split('T')[0];

                    // UPSERT based on class_id + date?
                    // Typically sessions might not have a composite unique key, but let's assume we want to avoid dupes.
                    // We check existence first.

                    const { data: existing } = await supabase
                        .from('class_sessions') // Verify table name! Usually class_sessions or separate.
                        .select('id')
                        .eq('class_id', cls.id)
                        .eq('date', dateStr)
                        .maybeSingle();

                    if (!existing) {
                        const { error: insertError } = await supabase
                            .from('class_sessions')
                            .insert({
                                class_id: cls.id,
                                date: dateStr,
                                start_time: cls.start_time,
                                end_time: cls.end_time
                            });

                        if (insertError) {
                            console.error(`Error creating session ${dateStr} for ${cls.name}:`, insertError.message);
                        } else {
                            sessionCount++;
                        }
                    }
                }
            }
            // Next day
            curr.setDate(curr.getDate() + 1);
        }
    }

    console.log(`Finished. Created ${sessionCount} attendance sessions.`);
}

generateAttendanceFeb();

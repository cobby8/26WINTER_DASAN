
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDuplicates() {
    console.log(`[Check Duplicates] Connecting to ${supabaseUrl}`);

    // Fetch ALL 2차 classes (including deleted ones if needed, but let's focus on active first)
    // Actually, user said "Appeared then disappeared", maybe I restored duplicates?
    const { data: classes, error } = await supabase
        .from('classes')
        .select('id, name, session, day_of_week, start_time, branch, created_at, deleted_at')
        .eq('session', '2차')
        // .is('deleted_at', null) // Check ALL to see if duplicates are causing switching
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching classes:', error);
        return;
    }

    console.log(`Fetched ${classes?.length} classes for '2차' session.`);

    const map = new Map<string, any[]>();

    classes?.forEach(c => {
        // Unique Key: Branch-Day-Time (Name might vary slightly?)
        // Let's use Branch + Day + Time as strict uniqueness.
        const key = `${c.branch}|${c.day_of_week}|${c.start_time}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(c);
    });

    let dupGroups = 0;
    let totalDups = 0;

    for (const [key, items] of map) {
        if (items.length > 1) {
            dupGroups++;
            totalDups += (items.length - 1);
            console.log(`\nDuplicate Group: [${key}] (${items.length} items)`);

            // Check Enrollments for each
            for (const item of items) {
                const { count } = await supabase
                    .from('enrollments')
                    .select('*', { count: 'exact', head: true })
                    .eq('class_id', item.id);

                console.log(`  - ID: ${item.id}, Name: "${item.name}", Created: ${item.created_at}, Deleted: ${item.deleted_at}, Enrollments: ${count}`);
            }
        }
    }

    console.log(`\nFound ${dupGroups} groups with duplicates. Total obsolete records: ${totalDups}`);
}

checkDuplicates();

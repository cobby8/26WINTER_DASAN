
import { supabaseAdmin } from '@/lib/supabase';

export async function repairClassData() {
    const { data: classes, error } = await supabaseAdmin.from('classes').select('*');

    if (error || !classes) throw new Error('Failed to fetch classes');

    let updatedCount = 0;
    const errors = [];

    for (const cls of classes) {
        let updates: any = {};

        // 1. Parse Branch (1호점/2호점)
        if (cls.name.includes('1호점')) updates.branch = '1호점';
        else if (cls.name.includes('2호점')) updates.branch = '2호점';

        // 2. Parse Session (1차/2차)
        if (cls.name.includes('1차')) updates.session = '1차';
        else if (cls.name.includes('2차')) updates.session = '2차';

        // 3. Parse Day of Week (Fix mismatch)
        const dayMap: { [key: string]: string } = {
            '월요일': '월요일', '화요일': '화요일', '수요일': '수요일',
            '목요일': '목요일', '금요일': '금요일', '토요일': '토요일', '일요일': '일요일'
        };

        // Check if name contains a day
        for (const day in dayMap) {
            if (cls.name.includes(day)) {
                // If current day_of_week is different, update it
                if (cls.day_of_week !== day) {
                    updates.day_of_week = day;
                }
                break;
            }
        }

        if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabaseAdmin
                .from('classes')
                .update(updates)
                .eq('id', cls.id);

            if (updateError) {
                errors.push(`Failed to update ${cls.name}: ${updateError.message}`);
            } else {
                updatedCount++;
            }
        }
    }

    return { updatedCount, errors };
}

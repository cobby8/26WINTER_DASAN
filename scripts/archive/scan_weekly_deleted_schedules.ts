
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env from root
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function scanWeeklyDeleted() {
    console.log('--- SCANNING DELETED SCHEDULES (ALL DAYS) ---');

    // Fetch ALL deleted schedules with student info
    const { data: deletedSchedules, error } = await supabase
        .from('shuttle_schedules')
        .select(`
            id, 
            day_of_week, 
            time, 
            type, 
            deleted_at, 
            student_id,
            students (name)
        `)
        .not('deleted_at', 'is', null)
        .order('day_of_week')
        .order('time');

    if (error) {
        console.error('Error scanning:', error);
        return;
    }

    if (!deletedSchedules || deletedSchedules.length === 0) {
        console.log('No deleted schedules found.');
        return;
    }

    // Group by Day
    const grouped = deletedSchedules.reduce((acc, curr) => {
        const day = curr.day_of_week;
        if (!acc[day]) acc[day] = [];
        acc[day].push(curr);
        return acc;
    }, {} as Record<string, typeof deletedSchedules>);

    // Report
    let report = '--- WEEKLY DELETED SCHEDULE REPORT ---\n';
    let totalFound = 0;

    Object.keys(grouped).forEach(day => {
        const items = grouped[day];
        if (items.length > 0) {
            report += `\n[${day}] Found ${items.length} deleted schedules:\n`;

            // Also log to console for immediate visibility
            console.log(`\n[${day}] Found ${items.length} deleted schedules:`);
            const names = items.map(i => (i.students as any)?.name || 'System');
            // Unique names
            const uniqueNames = [...new Set(names)];
            console.log(`Students affected: ${uniqueNames.join(', ')}`);

            items.forEach(item => {
                const studentName = (item.students as any)?.name || 'Unknown/System';
                report += `  - ${item.time} (${item.type}): ${studentName} (Deleted: ${item.deleted_at})\n`;
            });
            totalFound += items.length;
        }
    });

    report += `\n--------------------------------------------\n`;
    report += `Total Deleted Schedules Found: ${totalFound}\n`;

    if (totalFound > 0) {
        report += 'Recommendation: Review and restore these if they match the Google Sheet.\n';
    }

    fs.writeFileSync('weekly_deleted_report.txt', report, 'utf8');
    console.log('Report written to weekly_deleted_report.txt');
}

scanWeeklyDeleted();

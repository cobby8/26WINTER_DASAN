
import { supabaseAdmin } from '../src/lib/supabase-admin';

async function check() {
    console.log('--- Checking Class Status ---');

    // 1. Session Counts (Active)
    const { data: activeClasses, error: err1 } = await supabaseAdmin
        .from('classes')
        .select('*')
        .is('deleted_at', null);

    if (err1) { console.error(err1); return; }

    const activeCounts = activeClasses?.reduce((acc: any, c: any) => {
        acc[c.session] = (acc[c.session] || 0) + 1;
        return acc;
    }, {});
    console.log('Active Classes by Session:', activeCounts);

    // 2. Session Counts (Deleted)
    const { data: deletedClasses, error: err2 } = await supabaseAdmin
        .from('classes')
        .select('*')
        .not('deleted_at', 'is', null);

    if (err2) { console.error(err2); return; }

    const deletedCounts = deletedClasses?.reduce((acc: any, c: any) => {
        acc[c.session] = (acc[c.session] || 0) + 1;
        return acc;
    }, {});
    console.log('Deleted Classes by Session:', deletedCounts);

    // 3. Sample 2nd Session (Active)
    const sample2nd = activeClasses?.filter((c: any) => c.session === '2차').slice(0, 5);
    if (sample2nd && sample2nd.length > 0) {
        console.log('Sample 2nd Session (Active):');
        sample2nd.forEach((c: any) => console.log(` - ${c.name} (${c.day_of_week} ${c.start_time})`));
    } else {
        console.log('No Active 2nd Session classes found.');
    }

    // 4. Sample 2nd Session (Deleted)
    const sample2ndDel = deletedClasses?.filter((c: any) => c.session === '2차').slice(0, 5);
    if (sample2ndDel && sample2ndDel.length > 0) {
        console.log('Sample 2nd Session (Deleted):');
        sample2ndDel.forEach((c: any) => console.log(` - ${c.name} (Deleted At: ${c.deleted_at})`));
    }
}

check();

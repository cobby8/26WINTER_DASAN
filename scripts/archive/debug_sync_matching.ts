
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// ... Copy relevant parts of StandaloneSheetService ...
// To save space, I'll just hardcode fetching the sheet and basic parsing logic
// or import from the existing file if I exported it (I didn't).

// Minimal implementation
async function debugMatching() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch DB Classes
    const { data: allClasses } = await supabase
        .from('classes')
        .select('*')
        .eq('session', '2차')
        .is('deleted_at', null);

    // Filter for 2호점 화요일 just to see candidates
    const candidates = allClasses?.filter(c => c.branch === '2호점' && c.day_of_week === '화요일');

    console.log('--- Candidates for 2호점 화요일 ---');
    candidates?.forEach(c => {
        console.log(`[${c.start_time}] (Len: ${c.start_time.length}) matches '09:30'? ${c.start_time.startsWith('09:30')}`);
        console.log(JSON.stringify(c));
    });

    // 2. Fetch Sheet Data (Mocking finding a row or using googleapis)
    // I'll assume the parsing logic is the potential issue. I will replicate 
    // the logic for a sample case that failed.
    // e.g. "2호점", "화요일", "09:30"

    console.log('\n--- Match Test ---');
    const cases = [
        { branch: '2호점', day: '화요일', time: '09:30' },
        { branch: '2호점', day: '목요일', time: '09:30' },
        { branch: '1호점', day: '월요일', time: '10:30' }
    ];

    cases.forEach(cls => {
        const mat = allClasses?.find(c =>
            c.day_of_week === cls.day &&
            c.branch === cls.branch &&
            c.start_time.startsWith(cls.time)
        );
        console.log(`Target: ${JSON.stringify(cls)} -> Found: ${mat ? mat.id : 'FALSE'}`);
    });
}

debugMatching();

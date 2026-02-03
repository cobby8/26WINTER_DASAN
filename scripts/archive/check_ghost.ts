
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGhost() {
    const targetOldName = '[1차/1호점] 겨울방학특강 월요일 10:00 (1호점 1교시(초등저) 10:00~11:20)';

    console.log(`Checking for Old Name: "${targetOldName}"`);

    const { data: ghost, error } = await supabase
        .from('classes')
        .select('*')
        .eq('name', targetOldName);

    if (ghost && ghost.length > 0) {
        console.log('!!! FOUND GHOST RECORD (Old Name Persists) !!!');
        ghost.forEach(g => console.log(`ID: ${g.id}, Name: ${g.name}, Session: ${g.session}`));
    } else {
        console.log('Old Name NOT found in DB.');
    }

    // Check for what it SHOULD be
    // 1호점 1교시(초등저) 10:00~11:20
    // Actually, "1호점 1교시(초등저) 10:00~11:20" (My recover logic: "1호점 1교시(초등저) 10:00~11:20")
    // Wait, let's just search by loose match

    const { data: loose } = await supabase
        .from('classes')
        .select('*')
        .ilike('name', '%1호점 1교시(초등저) 10:00~11:20%');

    console.log('\nChecking for New Name Pattern:');
    if (loose && loose.length > 0) {
        loose.forEach(g => console.log(`ID: ${g.id}, Name: ${g.name}`));
    } else {
        console.log('New Name Pattern NOT found.');
    }
}

checkGhost();

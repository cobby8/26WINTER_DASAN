const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- DB Check ---');
    const { data: students } = await supabase.from('students').select('id, name, status').order('name');

    const deleted = students?.filter(s => s.status === 'deleted') || [];
    console.log(`Deleted Students: ${deleted.length}`);
    deleted.forEach(s => console.log(`- ${s.name} (${s.id})`));

    const nameCounts = {};
    students?.forEach(s => {
        nameCounts[s.name] = (nameCounts[s.name] || 0) + 1;
    });

    const duplicates = Object.keys(nameCounts).filter(name => nameCounts[name] > 1);
    console.log(`\nDuplicate Names: ${duplicates.length}`);
    duplicates.forEach(name => console.log(`- ${name} (${nameCounts[name]})`));

    console.log('\n--- End ---');
}

check();


import fs from 'fs';
import path from 'path';

async function runMigration() {
    const sqlPath = path.join(process.cwd(), 'scripts', 'add_class_period_phase6.sql');
    try {
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('----------------------------------------------------------------');
        console.log('Please execute the following SQL in your Supabase Dashboard SQL Editor:');
        console.log('----------------------------------------------------------------');
        console.log(sql);
        console.log('----------------------------------------------------------------');
    } catch (e) {
        console.error('Failed to read SQL file:', e);
    }
}

runMigration();

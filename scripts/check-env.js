
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
console.log('Checking file:', envPath);

if (!fs.existsSync(envPath)) {
    console.error('File does NOT exist!');
    process.exit(1);
}

const content = fs.readFileSync(envPath, 'utf8');
console.log('File length:', content.length);

const lines = content.split('\n');
console.log('Total lines:', lines.length);

lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
        const parts = trimmed.split('=');
        console.log(`[Line ${idx + 1}] Key found: "${parts[0]}"`);
        if (parts[0] === 'SUPABASE_SERVICE_ROLE_KEY') {
            console.log('   !!! MATCH FOUND !!!');
        }
    }
});

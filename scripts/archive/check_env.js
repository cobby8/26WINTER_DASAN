
const fs = require('fs');
const content = fs.readFileSync('.env.local', 'utf8');
console.log('--- .env.local Content (Masked) ---');
const lines = content.split('\n');
lines.forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL')) {
        console.log('URL_PREVIEW: ' + line.split('=')[1]);
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY')) {
        console.log('KEY_PREVIEW: ' + (line.split('=')[1] || '').substring(0, 10) + '...');
    }
});

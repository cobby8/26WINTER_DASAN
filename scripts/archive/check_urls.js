
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env.local
const envLocal = dotenv.config({ path: path.join(process.cwd(), '.env.local') }).parsed || {};
const urlLocal = envLocal.NEXT_PUBLIC_SUPABASE_URL;

// Load debug_log.txt last line to get Page URL
let pageUrl = 'Unknown';
try {
    const logContent = fs.readFileSync('debug_page_log.txt', 'utf8').trim().split('\n').pop();
    const match = logContent.match(/URL: ([^,]+)/);
    if (match) pageUrl = match[1];
} catch (e) { }

console.log(`Script/Local URL: ${urlLocal}`);
console.log(`Page/Server URL:  ${pageUrl}`);

if (urlLocal !== pageUrl) {
    console.log('MISMATCH DETECTED!');
} else {
    console.log('URLs Match.');
}

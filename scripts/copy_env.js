
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const localPath = path.join(process.cwd(), '.env.local');
const envConfig = dotenv.config({ path: localPath }).parsed;

if (!envConfig) {
    console.error('.env.local not found or empty');
    process.exit(1);
}

const url = envConfig.NEXT_PUBLIC_SUPABASE_URL;
if (!url || !url.startsWith('https://')) {
    console.error('Invalid URL in .env.local:', url);
    process.exit(1);
}

const envContent = Object.entries(envConfig)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

fs.writeFileSync(path.join(process.cwd(), '.env'), envContent);
console.log('Successfully copied .env.local to .env');
console.log('URL:', url);

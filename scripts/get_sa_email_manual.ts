import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
try {
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(/GOOGLE_SERVICE_ACCOUNT_EMAIL=(.*)/);
    if (match) {
        console.log("SA_EMAIL_FOUND:", match[1].trim());
    } else {
        console.log("SA_EMAIL_NOT_FOUND");
    }
} catch (e) {
    console.error("Error reading env:", e);
}


import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
console.log("SA_EMAIL:", process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);

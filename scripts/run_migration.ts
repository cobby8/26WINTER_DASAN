
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runMigration() {
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('Missing DATABASE_URL or POSTGRES_URL');
        return;
    }

    const client = new Client({
        connectionString,
    });

    try {
        await client.connect();
        console.log('Connected to DB');

        const sqlPath = path.resolve(__dirname, 'add_manual_exceptions.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running Migration...');
        await client.query(sql);
        console.log('Migration Successful!');

    } catch (err) {
        console.error('Migration Failed:', err);
    } finally {
        await client.end();
    }
}

runMigration();

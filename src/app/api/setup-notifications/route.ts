
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Direct SQL execution via rpc if available, or using Supabase standard methods?
        // Actually, supabase-js admin client strictly doesn't support generic SQL execution unless enabled via extensions.
        // However, we can create the table using standard Postgres query if we have the connection string, 
        // OR we can rely on the fact that we can't easily do DDL from the client.

        // Wait, if I cannot run DDL from here easily without 'pg' and connection string, 
        // I should try to use the 'pg' library if it's installed in the project.
        // The project has 'pg' installed as seen in the scripts.

        // But 'pg' needs connection string. 
        // Let's try to grab it from process.env.DATABASE_URL or POSTGRES_URL.

        const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

        if (!connectionString) {
            return NextResponse.json({ error: 'No database connection string found in environment.' }, { status: 500 });
        }

        const { Client } = require('pg'); // Dynamic require to avoid build issues if types missing
        const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

        await client.connect();

        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS notifications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                student_id UUID REFERENCES students(id) ON DELETE CASCADE,
                type TEXT NOT NULL, -- 'attendance', 'shuttle', 'payment', 'notice'
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                metadata JSONB -- Optional for storing related ID (class_id, etc.)
            );

            CREATE INDEX IF NOT EXISTS idx_notifications_student ON notifications(student_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(student_id) WHERE is_read = FALSE;
        `;

        await client.query(createTableSQL);
        await client.end();

        return NextResponse.json({ success: true, message: 'Notifications table created successfully.' });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

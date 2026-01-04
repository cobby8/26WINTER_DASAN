
import { supabaseAdmin } from '@/lib/supabase';

export const revalidate = 0;

export default async function DebugPage() {
    console.log('--- Debugging Classes ---');
    const { data: classes, error } = await supabaseAdmin
        .from('classes')
        .select('*')
        .order('id');

    if (error) return <div>Error: {error.message}</div>;

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Database Inspector (Classes)</h1>
            <table className="min-w-full border">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border p-2">ID</th>
                        <th className="border p-2">Day (DB Column)</th>
                        <th className="border p-2">Name</th>
                        <th className="border p-2">Start Time</th>
                    </tr>
                </thead>
                <tbody>
                    {classes?.map(c => (
                        <tr key={c.id}>
                            <td className="border p-2">{c.id}</td>
                            <td className="border p-2 font-bold text-red-600">{c.day_of_week}</td>
                            <td className="border p-2">{c.name}</td>
                            <td className="border p-2">{c.start_time}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

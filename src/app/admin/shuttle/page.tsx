import { getDailyShuttleData } from '@/app/actions/shuttle-ops-actions';
import ShuttleOperationList from '@/components/admin/shuttle/shuttle-operation-list';
import ShuttleHeader from '@/components/admin/shuttle/shuttle-header';

export default async function ShuttleAdminPage({
    searchParams,
}: {
    searchParams: Promise<{ date?: string }>;
}) {
    // 1. Determine Date (Default: Today in KST)
    const { date } = await searchParams;
    const dateStr = date || new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [year, month, day] = dateStr.split('-').map(Number);
    const kstDate = new Date(year, month - 1, day);
    const targetDateStr = dateStr;

    // 2. Data Fetching
    const { data: items, error } = await getDailyShuttleData(targetDateStr);

    if (error) {
        return (
            <div className="max-w-7xl mx-auto min-h-screen bg-slate-100">
                <div className="p-8 text-red-500 text-center font-bold bg-white rounded-lg shadow m-4">
                    데이터를 불러오는 중 오류가 발생했습니다: {error}
                </div>
            </div>
        );
    }

    // Date Navigation Logic
    const currDate = new Date(targetDateStr);

    // Helper to format date without timezone shift
    const formatDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const prevDate = new Date(currDate); prevDate.setDate(currDate.getDate() - 1);
    const nextDate = new Date(currDate); nextDate.setDate(currDate.getDate() + 1);

    const prevDateStr = formatDate(prevDate);
    const nextDateStr = formatDate(nextDate);

    return (
        <div className="max-w-7xl mx-auto min-h-screen bg-slate-100 pb-20">
            {/* Unified Slim Header */}
            <ShuttleHeader
                dateStr={targetDateStr}
                prevDateStr={prevDateStr}
                nextDateStr={nextDateStr}
            />

            {/* Content Area */}
            <main className="px-2 sm:px-4 py-4">
                <ShuttleOperationList items={items || []} dateStr={targetDateStr} />
            </main>
        </div>
    );
}

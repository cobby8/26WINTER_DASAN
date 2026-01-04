'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function RepairDataButton() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleRepair = async () => {
        if (!confirm('수업 데이터(지점, 회차, 요일)를 이름 기반으로 자동 보정하시겠습니까?')) return;

        setLoading(true);
        try {
            const res = await fetch('/api/repair-data', { method: 'POST' });
            const data = await res.json();

            if (data.success) {
                toast.success(`데이터 보정 완료: ${data.updatedCount}건 업데이트됨`);
                router.refresh();
            } else {
                toast.error(`오류 발생: ${data.error}`);
            }
        } catch (e) {
            toast.error('요청 실패');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button variant="outline" onClick={handleRepair} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            데이터 보정
        </Button>
    );
}

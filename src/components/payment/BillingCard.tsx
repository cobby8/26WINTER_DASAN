
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createInvoice } from '@/app/actions/payment-actions';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Payment {
    id: string;
    tuition_fee: number;
    shuttle_fee: number;
    sibling_discount: number;
    manual_adjustment: number;
    sessions: string;
    calculation_log: any;
    status: string;
}

interface BillingCardProps {
    studentId: string;
    initialPayment?: Payment | null;
}

export default function BillingCard({ studentId, initialPayment }: BillingCardProps) {
    const [loading, setLoading] = useState(false);
    const [payment, setPayment] = useState<Payment | null | undefined>(initialPayment);

    const handleCalculate = async () => {
        setLoading(true);
        try {
            const result = await createInvoice(studentId);
            if (result.success && result.data) {
                setPayment(result.data[0]); // Accessing the first returned record
                toast.success("청구서가 갱신되었습니다.");
            } else {
                toast.error("계산 실패: " + (typeof result.error === 'string' ? result.error : '알 수 없는 오류'));
            }
        } catch (e) {
            toast.error("오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const total = payment
        ? (payment.tuition_fee || 0) + (payment.shuttle_fee || 0) - (payment.sibling_discount || 0) + (payment.manual_adjustment || 0)
        : 0;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl">수강료 및 정산</CardTitle>
                {payment && (
                    <Badge variant={payment.status === 'paid' ? 'default' : 'outline'}>
                        {payment.status === 'paid' ? '납부완료' : '미납'}
                    </Badge>
                )}
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                {payment ? (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">기본 수강료 ({payment.sessions || '-'})</span>
                            <span>{(payment.tuition_fee || 0).toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">셔틀비</span>
                            <span>{(payment.shuttle_fee || 0).toLocaleString()}원</span>
                        </div>
                        {payment.sibling_discount > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                                <span>형제 할인</span>
                                <span>-{(payment.sibling_discount).toLocaleString()}원</span>
                            </div>
                        )}
                        {payment.manual_adjustment !== 0 && (
                            <div className="flex justify-between text-sm text-blue-600">
                                <span>임의 조정</span>
                                <span>{payment.manual_adjustment > 0 ? '+' : ''}{(payment.manual_adjustment).toLocaleString()}원</span>
                            </div>
                        )}
                        <div className="border-t pt-2 flex justify-between font-bold text-lg">
                            <span>총 청구금액</span>
                            <span>{total.toLocaleString()}원</span>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-6 text-muted-foreground">
                        청구서가 생성되지 않았습니다.
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleCalculate}
                    disabled={loading}
                >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    {payment ? '수강료 재계산' : '청구서 생성 (계산)'}
                </Button>
            </CardFooter>
        </Card>
    );
}

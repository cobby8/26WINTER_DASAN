import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Download, CreditCard } from 'lucide-react';

export const revalidate = 0;

export default async function PaymentsPage() {
    const cookieStore = await cookies();
    const studentId = cookieStore.get('studentId')?.value;

    if (!studentId) redirect('/portal');

    // Fetch Payment Data
    const { data: student } = await supabaseAdmin
        .from('students')
        .select(`
            id, name,
            payments (*)
        `)
        .eq('id', studentId)
        .single();

    if (!student) redirect('/portal');

    const payment = student.payments?.[0]; // Assuming single active payment for now

    // Fallback if no payment record
    if (!payment) {
        return (
            <div className="bg-[#F2F4F6] min-h-screen pb-24 flex items-center justify-center">
                <p className="text-gray-400">납부 내역이 없습니다.</p>
            </div>
        );
    }

    const { tuition_fee, shuttle_fee, carry_over_deduction, status, created_at } = payment;
    const totalDue = tuition_fee + shuttle_fee - carry_over_deduction;
    const isPaid = status === 'paid';
    const invoiceDate = new Date(created_at).toLocaleDateString('ko-KR');

    return (
        <div className="bg-[#F2F4F6] min-h-screen pb-24">
            <header className="px-6 py-5 bg-white mb-6">
                <h1 className="text-xl font-bold text-gray-900">수납 관리</h1>
            </header>

            <main className="px-5 space-y-6">

                {/* Invoice Card */}
                <Card className="rounded-[24px] border-none shadow-sm bg-white overflow-hidden relative">
                    {/* Status Badge */}
                    <div className="absolute top-0 right-0 p-5">
                        <Badge className={isPaid ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-red-50 text-red-600 hover:bg-red-100"}>
                            {isPaid ? "납부완료" : "미납"}
                        </Badge>
                    </div>

                    <div className="p-6 pt-10">
                        <p className="text-gray-500 text-sm mb-1">총 납부 금액</p>
                        <h2 className="text-3xl font-bold mb-6">{totalDue.toLocaleString()}원</h2>

                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">수강료 (Winter Class)</span>
                                <span className="font-medium text-gray-900">{tuition_fee.toLocaleString()}원</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">셔틀비</span>
                                <span className="font-medium text-gray-900">+{shuttle_fee.toLocaleString()}원</span>
                            </div>
                            {carry_over_deduction > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>이월 차감</span>
                                    <span>-{carry_over_deduction.toLocaleString()}원</span>
                                </div>
                            )}
                        </div>

                        <Separator className="my-6" />

                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">발행일</span>
                            <span className="text-gray-400">{invoiceDate}</span>
                        </div>
                    </div>
                </Card>

                {/* Actions */}
                {!isPaid && (
                    <Button className="w-full h-12 text-lg rounded-xl bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200">
                        <CreditCard className="w-5 h-5 mr-2" />
                        결제하기 (준비중)
                    </Button>
                )}

                {/* History (Mock) */}
                <section>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-gray-800 font-bold text-lg">지난 내역</h3>
                        <Button variant="ghost" size="sm" className="text-gray-400">전체보기</Button>
                    </div>

                    <Card className="rounded-[20px] border-none shadow-sm p-4 bg-white relative opacity-60">
                        {/* Mock previous month */}
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-bold text-gray-900">12월 정규반 수강료</p>
                                <p className="text-xs text-gray-400">2025. 12. 01</p>
                            </div>
                            <span className="text-gray-900 font-medium">240,000원</span>
                        </div>
                        {/* Overlay for demo */}
                        <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">이전 내역이 없습니다</span>
                        </div>
                    </Card>
                </section>

            </main>
        </div>
    );
}

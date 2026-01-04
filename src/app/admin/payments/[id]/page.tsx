import { supabaseAdmin } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import MarkAsPaidButton from '@/components/payment/MarkAsPaidButton';

export const revalidate = 0;

interface Props {
    params: { id: string };
}

export default async function PaymentDetailPage({ params }: Props) {
    const { id } = params;

    // Fetch Student with Payment Logic
    const { data: student, error } = await supabaseAdmin
        .from('students')
        .select(`
      *,
      payments (*),
      enrollments (
        *,
        classes (name, day_of_week, start_time)
      )
    `)
        .eq('id', id)
        .single();

    if (error || !student) return <div>Student not found</div>;

    const payment = student.payments?.[0]; // Assuming single payment record for now
    const enrollments = student.enrollments || [];

    const totalTuition = payment?.tuition_fee || 0;
    const shuttleFee = payment?.shuttle_fee || 0;
    const deduction = payment?.carry_over_deduction || 0;
    const finalAmount = totalTuition + shuttleFee - deduction;
    const paidAmount = payment?.amount || 0;
    const isPaid = payment?.status === 'paid';

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center space-x-4 print:hidden">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin/payments">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h2 className="text-3xl font-bold tracking-tight">Invoice Details</h2>
                <div className="flex-1 text-right">
                    <Button variant="outline" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" /> Print Invoice
                    </Button>
                </div>
            </div>

            <Card className="border-2 border-gray-100 shadow-lg">
                <CardHeader className="border-b bg-gray-50/50">
                    <div className="flex justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">WINTER BASKETBALL CLASS</h3>
                            <p className="text-sm text-gray-500">2026 Winter Special Program</p>
                        </div>
                        <div className="text-right">
                            <Badge variant={isPaid ? 'default' : 'destructive'} className="text-lg px-4 py-1">
                                {isPaid ? 'PAID' : 'UNPAID'}
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Billed To</h4>
                            <p className="font-bold text-gray-900">{student.name}</p>
                            <p className="text-gray-600">{student.parent_name}</p>
                            <p className="text-gray-600">{student.address}</p>
                            <p className="text-gray-600">{student.student_phone}</p>
                        </div>
                        <div className="text-right">
                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Payment Info</h4>
                            <p><span className="text-gray-600 mr-2">Method:</span> <span className="font-medium">{payment?.payment_method || 'Bank Transfer'}</span></p>
                            <p><span className="text-gray-600 mr-2">Date:</span> <span className="font-medium">{payment?.payment_date || '-'}</span></p>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Enrollment Order</h4>
                        <div className="space-y-2">
                            {enrollments.map((enr: any) => (
                                <div key={enr.id} className="flex justify-between items-center py-2">
                                    <div>
                                        <p className="font-bold">{enr.classes.name}</p>
                                        <p className="text-sm text-gray-500">{enr.classes.day_of_week} {enr.classes.start_time}</p>
                                    </div>
                                    <div className="text-right text-gray-600">
                                        {enr.shuttle_use ? 'Includes Shuttle' : 'Class Only'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <div className="flex justify-between py-2 text-gray-600">
                            <span>Base Tuition Fee</span>
                            <span>{totalTuition.toLocaleString()} KRW</span>
                        </div>
                        <div className="flex justify-between py-2 text-gray-600">
                            <span>Shuttle Fee</span>
                            <span>{shuttleFee.toLocaleString()} KRW</span>
                        </div>
                        {deduction > 0 && (
                            <div className="flex justify-between py-2 text-green-600">
                                <span>Carry-over Deduction (Absence Credit)</span>
                                <span>- {deduction.toLocaleString()} KRW</span>
                            </div>
                        )}
                        <div className="flex justify-between py-4 text-xl font-bold border-t mt-2 text-gray-900">
                            <span>Total Amount</span>
                            <span>{finalAmount.toLocaleString()} KRW</span>
                        </div>
                    </div>
                </CardContent>
                {!isPaid && payment && (
                    <CardFooter className="bg-gray-50 border-t p-6 flex justify-end">
                        <MarkAsPaidButton paymentId={payment.id} />
                    </CardFooter>
                )}
            </Card>

            <div className="text-center text-sm text-gray-400 print:hidden">
                This invoice is auto-generated based on enrollment data.
            </div>
        </div>
    );
}

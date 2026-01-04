import { supabaseAdmin } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const revalidate = 0;

export default async function PaymentsPage() {
    // Fetch students with payment info
    // Since we might have multiple payment records per student (one per month),
    // for now we'll fetch the latest one or all.
    // Assuming 'Winter Special' is a single billing event for simplicity for now.

    const { data: students, error } = await supabaseAdmin
        .from('students')
        .select(`
      id,
      name,
      grade,
      parent_name,
      parent_phone,
      payments (
        id,
        amount,
        tuition_fee,
        shuttle_fee,
        carry_over_deduction,
        status,
        payment_date,
        payment_method
      )
    `)
        .order('name');

    if (error) return <div>Error: {error.message}</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Tuition & Payments</h2>
                <Button variant="outline">Create Invoice (All)</Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Payment Status</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Parent</TableHead>
                                <TableHead>Total Bill</TableHead>
                                <TableHead>Paid Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {students.map((student) => {
                                // Determine latest payment record or aggregate
                                const payment = student.payments?.[0]; // Taking first for now
                                const totalBill = payment ? (payment.tuition_fee + payment.shuttle_fee - payment.carry_over_deduction) : 0;
                                const paidAmount = payment?.amount || 0;
                                const status = payment?.status || 'pending';

                                return (
                                    <TableRow key={student.id}>
                                        <TableCell>
                                            <div className="font-medium">{student.name}</div>
                                            <div className="text-xs text-gray-500">{student.grade}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div>{student.parent_name}</div>
                                            <div className="text-xs text-gray-500">{student.parent_phone}</div>
                                        </TableCell>
                                        <TableCell>
                                            {totalBill.toLocaleString()} KRW
                                            {payment?.carry_over_deduction > 0 && (
                                                <span className="block text-xs text-green-600">(-{payment.carry_over_deduction.toLocaleString()} Carry Over)</span>
                                            )}
                                        </TableCell>
                                        <TableCell>{paidAmount.toLocaleString()} KRW</TableCell>
                                        <TableCell>
                                            <Badge variant={status === 'paid' ? 'default' : status === 'pending' ? 'secondary' : 'destructive'}>
                                                {status.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" variant="outline" asChild>
                                                <Link href={`/admin/payments/${student.id}`}>Details</Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

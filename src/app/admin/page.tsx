import { supabaseAdmin } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, BookOpen, DollarSign } from 'lucide-react';

export const revalidate = 0;

export default async function AdminDashboard() {
    // Fetch basic stats
    const { count: studentCount } = await supabaseAdmin.from('students').select('*', { count: 'exact', head: true });
    const { count: classCount } = await supabaseAdmin.from('classes').select('*', { count: 'exact', head: true });

    // Calculate total pending revenue (approx)
    // This is expensive if we have many rows, but fine for small scale
    const { data: payments } = await supabaseAdmin.from('payments').select('amount, status');
    const totalRevenue = payments?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;
    const paidRevenue = payments?.filter(p => p.status === 'paid').reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{studentCount || 0}</div>
                        <p className="text-xs text-muted-foreground">Enrolled for Winter Term</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Classes</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{classCount || 0}</div>
                        <p className="text-xs text-muted-foreground">Weekly classes scheduled</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{paidRevenue.toLocaleString()} KRW</div>
                        <p className="text-xs text-muted-foreground">
                            of {totalRevenue.toLocaleString()} KRW invoiced
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Sync Google Sheets to see latest data.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

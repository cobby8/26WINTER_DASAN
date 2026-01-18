"use client";

import { Bar, BarChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer, Cell, Pie, PieChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

interface ChartProps {
    data: any[];
}

export function AttendanceChart({ data }: ChartProps) {
    return (
        <Card className="col-span-4">
            <CardHeader>
                <CardTitle>최근 출석 추이</CardTitle>
                <CardDescription>최근 7일간의 출석 현황입니다.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="date"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => value.slice(5)} // Show MM-DD
                            />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

export function RevenueChart({ data }: ChartProps) {
    // Expect data: [{name: '납부', value: 300}, {name: '미납', value: 100}]
    const activeData = data.filter(d => d.value > 0);

    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>이번 달 수납 현황</CardTitle>
                <CardDescription>청구 대비 납부 비율입니다.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[200px] w-full flex justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={activeData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {activeData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                        <div className="text-xl font-bold">{Math.round((data[0]?.value / (data[0]?.value + data[1]?.value || 1)) * 100)}%</div>
                        <div className="text-xs text-gray-500">납부율</div>
                    </div>
                </div>
                <div className="flex justify-center gap-4 mt-2">
                    {activeData.map((entry, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                            <span className="text-xs text-gray-600">{entry.name}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

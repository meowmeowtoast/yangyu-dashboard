import React, { useMemo, useState } from 'react';
import type { NormalizedPost } from '../types';
import { format } from 'date-fns/format';
import { startOfDay } from 'date-fns/startOfDay';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type DailyChartData = {
    date: string;
    FB_Reach: number;
    FB_Engagement: number;
    IG_Reach: number;
    IG_Engagement: number;
};

type PlatformView = 'All' | 'Facebook' | 'Instagram';

const PerformanceLineChart: React.FC<{ data: NormalizedPost[] }> = ({ data }) => {
    const [platformView, setPlatformView] = useState<PlatformView>('All');

    const chartData = useMemo(() => {
        const groupedData = data.reduce((acc, post) => {
            const day = format(startOfDay(post.publishTime), 'yyyy-MM-dd');
            if (!acc[day]) {
                acc[day] = {
                    date: day,
                    FB_Reach: 0,
                    FB_Engagement: 0,
                    IG_Reach: 0,
                    IG_Engagement: 0,
                };
            }
            if (post.platform === 'Facebook') {
                acc[day].FB_Reach += post.reach;
                acc[day].FB_Engagement += post.totalEngagement;
            } else if (post.platform === 'Instagram') {
                acc[day].IG_Reach += post.reach;
                acc[day].IG_Engagement += post.totalEngagement;
            }
            return acc;
        }, {} as Record<string, DailyChartData>);

        return Object.values(groupedData)
            .sort((a: DailyChartData, b: DailyChartData) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [data]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
            <div className="p-2 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-md shadow-md">
                <p className="font-bold text-slate-800 dark:text-slate-200">{format(new Date(label), 'yyyy/MM/dd')}</p>
                {payload.map((pld: any) => (
                    <div key={pld.dataKey} style={{ color: pld.color }}>
                        {pld.name}: {pld.value.toLocaleString()}
                    </div>
                ))}
            </div>
            );
        }
        return null;
    };

    const platformButtons: { key: PlatformView, label: string }[] = [
        { key: 'All', label: '全部平台' },
        { key: 'Facebook', label: 'Facebook' },
        { key: 'Instagram', label: 'Instagram' },
    ];
    
    return (
      <div>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">每日成效趨勢 (互動與觸及)</h3>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 mt-2 sm:mt-0">
                {platformButtons.map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setPlatformView(key)}
                        className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${platformView === key ? 'bg-white text-emerald-600 shadow dark:bg-slate-900 dark:text-emerald-400' : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                    >
                        {label}
                    </button>
                ))}
            </div>
        </div>
        
        {chartData.length < 2 ? (
            <div className="flex items-center justify-center h-[300px] text-slate-500 dark:text-slate-400">需要至少兩天的資料才能繪製趨勢圖</div>
        ) : (
            <div style={{ width: '100%', height: 400 }}>
                <ResponsiveContainer>
                    <LineChart
                        data={chartData}
                        margin={{
                            top: 5, right: -25, left: -15, bottom: 5,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                        <XAxis dataKey="date" tickFormatter={(tick) => format(new Date(tick), 'MM/dd')} tick={{ fill: '#64748b', fontSize: 12 }} interval="preserveStartEnd" />
                        <YAxis yAxisId="left" stroke="#8884d8" tickFormatter={(val) => val.toLocaleString()} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" tickFormatter={(val) => val.toLocaleString()} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ color: '#64748b' }} />
                        {(platformView === 'All' || platformView === 'Facebook') && <Line yAxisId="left" type="monotone" dataKey="FB_Engagement" name="FB 互動數" stroke="#1877F2" activeDot={{ r: 6 }} />}
                        {(platformView === 'All' || platformView === 'Instagram') && <Line yAxisId="left" type="monotone" dataKey="IG_Engagement" name="IG 互動數" stroke="#E4405F" activeDot={{ r: 6 }}/>}
                        {(platformView === 'All' || platformView === 'Facebook') && <Line yAxisId="right" type="monotone" dataKey="FB_Reach" name="FB 觸及數" stroke="#a4b3f2" strokeDasharray="3 3" />}
                        {(platformView === 'All' || platformView === 'Instagram') && <Line yAxisId="right" type="monotone" dataKey="IG_Reach" name="IG 觸及數" stroke="#f2a2b3" strokeDasharray="3 3" />}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        )}
      </div>
    );
};

export default PerformanceLineChart;
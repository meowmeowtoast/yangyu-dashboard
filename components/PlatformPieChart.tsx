import React, { useMemo } from 'react';
import type { NormalizedPost } from '../types';

const COLORS = {
    Facebook: '#1877F2',
    Instagram: '#E4405F',
};

const PlatformPieChart: React.FC<{ data: NormalizedPost[] }> = ({ data }) => {
    const chartData = useMemo(() => {
        const counts = data.reduce((acc, post) => {
            acc[post.platform] = (acc[post.platform] || 0) + 1;
            return acc;
        }, {} as Record<'Facebook' | 'Instagram', number>);

        return [
            { name: 'Facebook', value: counts.Facebook || 0, color: COLORS.Facebook },
            { name: 'Instagram', value: counts.Instagram || 0, color: COLORS.Instagram },
        ].filter(item => item.value > 0);
    }, [data]);

    const total = useMemo(() => chartData.reduce((sum, item) => sum + item.value, 0), [chartData]);

    if (total === 0) {
        return <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">沒有可顯示的資料</div>;
    }
    
    let cumulativePercentage = 0;

    return (
        <div className="flex flex-col md:flex-row items-center justify-center h-full gap-8">
            <div className="relative w-48 h-48">
                 <svg viewBox="0 0 36 36" className="w-full h-full block">
                    {chartData.map(entry => {
                        const percentage = (entry.value / total) * 100;
                        const strokeDasharray = `${percentage} ${100 - percentage}`;
                        const strokeDashoffset = 25 - cumulativePercentage;
                        cumulativePercentage += percentage;
                        
                        return (
                            <circle
                                key={entry.name}
                                cx="18"
                                cy="18"
                                r="15.9155"
                                fill="transparent"
                                stroke={entry.color}
                                strokeWidth="3.8"
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                                transform="rotate(-90 18 18)"
                            />
                        );
                    })}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-2xl font-bold text-gray-800 dark:text-slate-200">{total}</span>
                    <span className="text-sm text-gray-500 dark:text-slate-400">則貼文</span>
                </div>
            </div>
            <div className="flex flex-col gap-2">
                {chartData.map(entry => (
                    <div key={entry.name} className="flex items-center">
                        <span className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: entry.color }}></span>
                        <span className="text-gray-700 dark:text-slate-300 font-medium">{entry.name}:</span>
                        <span className="ml-2 text-gray-600 dark:text-slate-400">{entry.value} ({(entry.value / total * 100).toFixed(1)}%)</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PlatformPieChart;
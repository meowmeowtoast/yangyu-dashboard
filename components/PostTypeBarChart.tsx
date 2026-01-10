import React, { useMemo } from 'react';
import type { NormalizedPost } from '../types';

const PostTypeBarChart: React.FC<{ data: NormalizedPost[] }> = ({ data }) => {
    const chartData = useMemo(() => {
        // FIX: Explicitly type the accumulator `acc` and cast the initial value for `reduce`.
        // This ensures TypeScript correctly infers the `aggregated` object's structure,
        // resolving errors in the subsequent `.map()` where properties were destructured
        // from what was previously inferred as an empty object type (`{}`).
        const aggregated = data.reduce((acc: Record<string, { totalEngagement: number; count: number }>, post) => {
            const type = post.postType || '未知類型';
            const current = acc[type] || { totalEngagement: 0, count: 0 };
            return {
                ...acc,
                [type]: {
                    totalEngagement: current.totalEngagement + post.totalEngagement,
                    count: current.count + 1,
                },
            };
        }, {} as Record<string, { totalEngagement: number; count: number }>);

        // FIX: Add explicit type casting to Object.entries result to resolve destructuring errors
        // where 'totalEngagement' and 'count' were not found on the inferred empty object type on line 23.
        return (Object.entries(aggregated) as [string, { totalEngagement: number; count: number }][])
            .map(([postType, { totalEngagement, count }]) => ({
                postType,
                avgEngagement: count > 0 ? Math.round(totalEngagement / count) : 0,
            }))
            .sort((a, b) => b.avgEngagement - a.avgEngagement)
            .slice(0, 5); // Show top 5
    }, [data]);

    if (chartData.length === 0) {
        return <div className="flex items-center justify-center h-full text-gray-500 dark:text-slate-400">沒有可顯示的資料</div>;
    }

    const maxAvgEngagement = Math.max(...chartData.map(d => d.avgEngagement), 0);

    return (
        <div className="space-y-4">
            {chartData.map(({ postType, avgEngagement }) => (
                <div key={postType} className="w-full">
                    <div className="flex justify-between items-center mb-1 text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate" title={postType}>{postType}</span>
                        <span className="font-semibold text-slate-600 dark:text-slate-400">{avgEngagement.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4">
                        <div
                            className="bg-emerald-500 h-4 rounded-full"
                            style={{ width: `${maxAvgEngagement > 0 ? (avgEngagement / maxAvgEngagement) * 100 : 0}%` }}
                            title={`平均互動數: ${avgEngagement.toLocaleString()}`}
                        ></div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default PostTypeBarChart;
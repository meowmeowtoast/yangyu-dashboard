
import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface KpiCardProps {
    title: string;
    value: number | string;
    unit?: string;
    description?: string;
    change?: number;
    trendData?: { date: string; value: number }[];
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, unit, description, change, trendData }) => {
    const displayValue = typeof value === 'number' ? value.toLocaleString() : value;
    const isPositive = change !== undefined && change >= 0;

    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 relative group flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{title}</h3>
                    <div className="flex items-baseline gap-1 mt-1">
                        <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                            {displayValue}{unit && <span className="text-sm font-medium text-zinc-500 ml-0.5">{unit}</span>}
                        </p>
                    </div>
                </div>
                {change !== undefined && isFinite(change) && (
                    <div className={`flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${isPositive ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' : 'text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                       {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
                    </div>
                )}
            </div>
            
             <div className="h-10 mt-auto opacity-50 group-hover:opacity-100 transition-opacity">
                {trendData && trendData.length > 1 && (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData}>
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke={isPositive ? '#10b981' : '#f43f5e'} // emerald-500 : rose-500
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false} // Performance optimization
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
            {description && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max max-w-[200px] p-2 text-xs bg-zinc-800 text-zinc-100 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 text-center">
                    {description}
                </div>
            )}
        </div>
    );
};

export default KpiCard;

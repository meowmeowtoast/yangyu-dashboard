import React, { useMemo } from 'react';
import { eachMonthOfInterval } from 'date-fns/eachMonthOfInterval';
import { endOfMonth } from 'date-fns/endOfMonth';
import { format } from 'date-fns/format';
import { isBefore } from 'date-fns/isBefore';
import { startOfMonth } from 'date-fns/startOfMonth';
import type { NormalizedPost, AllMonthlyFollowerData, BaseFollowerData } from '../types';

interface Props {
    posts: NormalizedPost[];
    allMonthlyData: AllMonthlyFollowerData;
    baseData: BaseFollowerData;
}

const FollowerGrowth: React.FC<Props> = ({ posts, allMonthlyData, baseData }) => {

    const growthCalculations = useMemo(() => {
        const baseFb = Number(baseData.fbBase) || 0;
        const baseIg = Number(baseData.igBase) || 0;

        const result = {
            fb: { start: baseFb, gained: 0, lost: 0, net: 0, end: baseFb, rate: 0 },
            ig: { start: baseIg, gained: 0, lost: 0, net: 0, end: baseIg, rate: 0 },
        };

        if (!allMonthlyData || Object.keys(allMonthlyData).length === 0) {
            return result;
        }
        
        const periodStartDate = posts.length > 0 ? startOfMonth(posts[posts.length - 1].publishTime) : null;
        const periodEndDate = posts.length > 0 ? endOfMonth(posts[0].publishTime) : null;

        let fbGrowthBefore = 0;
        let igGrowthBefore = 0;

        const sortedMonthKeys = Object.keys(allMonthlyData).sort();

        sortedMonthKeys.forEach((monthKey) => {
            const monthData = allMonthlyData[monthKey];
            const monthDate = new Date(`${monthKey}-01T12:00:00Z`); // Use UTC to avoid timezone issues
            const fbGained = Number(monthData.fbGained) || 0;
            const fbLost = Number(monthData.fbLost) || 0;
            const igGained = Number(monthData.igGained) || 0;
            const igLost = Number(monthData.igLost) || 0;

            // Calculate growth before the selected period to determine the "start" amount
            if (periodStartDate && isBefore(monthDate, periodStartDate)) {
                fbGrowthBefore += fbGained - fbLost;
                igGrowthBefore += igGained - igLost;
            }
            
            // Calculate growth within the selected period
            if (periodStartDate && periodEndDate && monthDate >= periodStartDate && monthDate <= periodEndDate) {
                result.fb.gained += fbGained;
                result.fb.lost += fbLost;
                result.ig.gained += igGained;
                result.ig.lost += igLost;
            }
        });

        result.fb.start = baseFb + fbGrowthBefore;
        result.ig.start = baseIg + igGrowthBefore;

        result.fb.net = result.fb.gained - result.fb.lost;
        result.ig.net = result.ig.gained - result.ig.lost;

        result.fb.end = result.fb.start + result.fb.net;
        result.ig.end = result.ig.start + result.ig.net;
        
        result.fb.rate = result.fb.start > 0 ? (result.fb.net / result.fb.start) * 100 : (result.fb.net > 0 ? 100 : 0);
        result.ig.rate = result.ig.start > 0 ? (result.ig.net / result.ig.start) * 100 : (result.ig.net > 0 ? 100 : 0);

        return result;

    }, [posts, allMonthlyData, baseData]);

    const total = {
        start: growthCalculations.fb.start + growthCalculations.ig.start,
        gained: growthCalculations.fb.gained + growthCalculations.ig.gained,
        lost: growthCalculations.fb.lost + growthCalculations.ig.lost,
        net: growthCalculations.fb.net + growthCalculations.ig.net,
        end: growthCalculations.fb.end + growthCalculations.ig.end,
        rate: 0
    };
    total.rate = total.start > 0 ? (total.net / total.start) * 100 : (total.net > 0 ? 100 : 0);

    const GrowthRow: React.FC<{
        platform: string;
        data: { start: number; gained: number; lost: number; net: number; end: number; rate: number };
        isTotal?: boolean;
    }> = ({ platform, data, isTotal = false }) => (
        <tr className={isTotal ? "bg-gray-50 dark:bg-slate-700/50 font-bold" : "bg-white dark:bg-slate-800 border-b dark:border-slate-700"}>
            <th scope="row" className={`px-2 py-3 font-medium ${isTotal ? 'text-gray-900 dark:text-slate-100' : 'text-gray-700 dark:text-slate-300'}`}>{platform}</th>
            <td className="px-2 py-3 text-gray-800 dark:text-slate-200">{data.start.toLocaleString()}</td>
            <td className="px-2 py-3 text-green-600">{`+${data.gained.toLocaleString()}`}</td>
            <td className="px-2 py-3 text-red-600">{`-${data.lost.toLocaleString()}`}</td>
            <td className={`px-2 py-3 font-semibold ${data.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.net >= 0 ? '+' : ''}{data.net.toLocaleString()}
            </td>
            <td className="px-2 py-3 text-gray-800 dark:text-slate-200 font-semibold">{data.end.toLocaleString()}</td>
            <td className={`px-2 py-3 text-right font-semibold ${data.rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.rate.toFixed(2)}%
            </td>
        </tr>
    );

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600 dark:text-slate-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-700 dark:text-slate-300">
                    <tr>
                        <th scope="col" className="px-2 py-3">平台</th>
                        <th scope="col" className="px-2 py-3">期初粉絲數</th>
                        <th scope="col" className="px-2 py-3">新增追蹤</th>
                        <th scope="col" className="px-2 py-3">取消追蹤</th>
                        <th scope="col" className="px-2 py-3">本期淨增長</th>
                        <th scope="col" className="px-2 py-3">期末粉絲數</th>
                        <th scope="col" className="px-2 py-3 text-right">增長率</th>
                    </tr>
                </thead>
                <tbody>
                    <GrowthRow platform="Facebook" data={growthCalculations.fb} />
                    <GrowthRow platform="Instagram" data={growthCalculations.ig} />
                    <GrowthRow platform="總計" data={total} isTotal={true} />
                </tbody>
            </table>
        </div>
    );
};

export default FollowerGrowth;
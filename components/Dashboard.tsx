
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { getDay } from 'date-fns/getDay';
import { getHours } from 'date-fns/getHours';
import { lastDayOfMonth } from 'date-fns/lastDayOfMonth';
import { format } from 'date-fns/format';
import { subDays } from 'date-fns/subDays';
import { startOfDay } from 'date-fns/startOfDay';
import type { NormalizedPost, AnalysisData, AllMonthlyFollowerData, BaseFollowerData, ReadOnlyViewState, AnalysisDisplaySettings } from '../types';
import { Platform } from '../types';
import { fetchOgImage } from '../utils/ogFetcher';
import KpiCard from './KpiCard';
import PerformanceLineChart from './PerformanceLineChart';
import PlatformPieChart from './PlatformPieChart';
import TopPostsTable from './TopPostsTable';
import PostTypeBarChart from './PostTypeBarChart';
import AnalysisAndSuggestions from './AnalysisAndSuggestions';
import FollowerGrowth from './FollowerGrowth';
import Modal from './Modal';
import ExportModal from './ExportModal';
import AllPostsTable from './AllPostsTable';
import PlatformIcon from './PlatformIcon';


const daysOfWeek = ['日', '一', '二', '三', '四', '五', '六'];
const hoursOfDay = Array.from({ length: 24 }, (_, i) => i);

interface HeatmapTooltipInfo {
    content: React.ReactNode;
    x: number;
    y: number;
}

const PostingHeatmap: React.FC<{ 
    data: NormalizedPost[];
    onCellHover: (info: HeatmapTooltipInfo | null) => void; 
}> = ({ data, onCellHover }) => {
    // ... (Heatmap Logic unchanged, just styles)
    const heatmapData = useMemo(() => {
        const grid: { totalEngagement: number; totalReach: number; count: number }[][] = 
            Array(7).fill(0).map(() => Array(24).fill(0).map(() => ({ totalEngagement: 0, totalReach: 0, count: 0 })));

        data.forEach(post => {
            const day = getDay(post.publishTime);
            const hour = getHours(post.publishTime);
            grid[day][hour].totalEngagement += post.totalEngagement;
            grid[day][hour].totalReach += post.reach;
            grid[day][hour].count += 1;
        });

        let maxInteractionRate = 0;
        let maxActivity = 0;
        let maxReach = 0;
        let maxCount = 0;

        const metricsGrid = grid.map(row => row.map(cell => {
            const count = cell.count;
            if (count === 0) return { interactionRate: 0, activity: 0, reach: 0, count: 0 };
            const interactionRate = cell.totalReach > 0 ? (cell.totalEngagement / cell.totalReach) * 100 : 0;
            const activity = cell.totalEngagement;
            const reach = cell.totalReach / count;
            if (interactionRate > maxInteractionRate) maxInteractionRate = interactionRate;
            if (activity > maxActivity) maxActivity = activity;
            if (reach > maxReach) maxReach = reach;
            if (count > maxCount) maxCount = count;
            return { interactionRate, activity, reach, count };
        }));

        let maxScore = 0;
        const scoreGrid = metricsGrid.map((row, dayIndex) => row.map((cell, hourIndex) => {
            if (cell.count === 0) return { score: 0, details: null };
            
            const norm_interactionRate = maxInteractionRate > 0 ? cell.interactionRate / maxInteractionRate : 0;
            const norm_activity = maxActivity > 0 ? cell.activity / maxActivity : 0;
            const norm_reach = maxReach > 0 ? cell.reach / maxReach : 0;
            const norm_historical = maxCount > 0 ? cell.count / maxCount : 0;

            const score = (norm_interactionRate * 0.4) + (norm_activity * 0.3) + (norm_reach * 0.2) + (norm_historical * 0.1);
            if (score > maxScore) maxScore = score;
            
            return {
                score,
                details: {
                    day: daysOfWeek[dayIndex],
                    hour: hourIndex,
                    score,
                    interactionRate: cell.interactionRate,
                    activity: cell.activity,
                    reach: cell.reach,
                    count: cell.count
                }
            };
        }));

        return { scoreGrid, maxScore };
    }, [data]);

    const { scoreGrid, maxScore } = heatmapData;

    const handleMouseMove = (e: React.MouseEvent, details: any) => {
        if (!details) return;
        const content = (
            <div className="text-sm">
                <div className="font-bold mb-2 border-b border-zinc-600 pb-1 text-zinc-100">星期{details.day} {details.hour}:00 - {details.hour+1}:00</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span className="font-medium text-zinc-300">綜合評分:</span> <span className="text-right text-zinc-100">{details.score.toFixed(3)}</span>
                    <span className="text-zinc-400">互動率:</span> <span className="text-right text-zinc-400">{details.interactionRate.toFixed(2)}%</span>
                    <span className="text-zinc-400">總互動:</span> <span className="text-right text-zinc-400">{details.activity.toLocaleString()}</span>
                    <span className="text-zinc-400">平均觸及:</span> <span className="text-right text-zinc-400">{Math.round(details.reach).toLocaleString()}</span>
                    <span className="text-zinc-400">貼文數:</span> <span className="text-right text-zinc-400">{details.count}</span>
                </div>
            </div>
        );
        onCellHover({ content, x: e.clientX, y: e.clientY });
    };

    if (maxScore === 0) {
        return <div className="flex items-center justify-center h-full text-zinc-400 dark:text-zinc-500 text-sm">沒有足夠的資料來分析發文時間</div>;
    }

    const getColor = (score: number) => {
        if (score === 0) return 'bg-zinc-100 dark:bg-zinc-800';
        const intensity = maxScore > 0 ? (score / maxScore) : 0;
        if (intensity < 0.01) return 'bg-emerald-50 dark:bg-emerald-950/30';
        if (intensity < 0.2) return 'bg-emerald-100 dark:bg-emerald-900/50';
        if (intensity < 0.4) return 'bg-emerald-200 dark:bg-emerald-800/70';
        if (intensity < 0.6) return 'bg-emerald-300 dark:bg-emerald-700';
        if (intensity < 0.8) return 'bg-emerald-400 dark:bg-emerald-600';
        return 'bg-emerald-500 dark:bg-emerald-500';
    };

    return (
        <div className="overflow-x-auto pb-2">
            <table className="w-full border-collapse text-center">
                <thead>
                    <tr>
                        <th className="p-1 text-[10px] text-zinc-400 w-8"></th>
                        {hoursOfDay.map(hour => (
                            <th key={hour} className="p-1 text-[10px] font-medium text-zinc-400">{hour}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {daysOfWeek.map((day, dayIndex) => (
                        <tr key={day}>
                            <td className="p-1 text-[10px] font-semibold text-zinc-500">{day}</td>
                            {hoursOfDay.map(hourIndex => {
                                const cell = scoreGrid[dayIndex][hourIndex];
                                return (
                                    <td key={hourIndex} className="p-[2px]">
                                        <div 
                                            className={`w-full h-6 rounded-sm transition-colors duration-200 ${getColor(cell.score)}`}
                                            onMouseMove={(e) => handleMouseMove(e, cell.details)}
                                            onMouseLeave={() => onCellHover(null)}
                                        ></div>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const dateRanges = {
    '7': '近 7 天',
    '30': '近 30 天',
    '90': '近 90 天',
    'all': '全部時間',
    'monthly': '月份',
    'custom': '自訂區間',
};

type DateRangeKey = keyof typeof dateRanges;

const calculateKpis = (data: NormalizedPost[]) => {
    // ... (KPI Logic Unchanged)
    const totals = data.reduce((acc, post) => {
        acc.totalPosts += 1;
        acc.totalReach += post.reach;
        acc.totalImpressions += post.impressions;
        acc.totalEngagement += post.totalEngagement;
        return acc;
    }, {
        totalPosts: 0,
        totalReach: 0,
        totalImpressions: 0,
        totalEngagement: 0,
    });
    const engagementRate = totals.totalReach > 0 ? (totals.totalEngagement / totals.totalReach) * 100 : 0;
    return { ...totals, engagementRate };
};

interface DashboardProps {
    posts: NormalizedPost[];
    allMonthlyFollowerData: AllMonthlyFollowerData;
    baseFollowerData: BaseFollowerData;
    analysisDisplaySettings?: AnalysisDisplaySettings;
    isReadOnly: boolean;
    readOnlyViewState: ReadOnlyViewState | null;
    readOnlyAnalysis: AnalysisData | null;
    onDateRangeLabelChange: (label: string) => void;
    allAnalyses: Record<string, AnalysisData>;
    onSaveAnalysis: (key: string, data: AnalysisData) => void;
    onShareRequest?: (viewState: ReadOnlyViewState, analysis: AnalysisData, postsForView: NormalizedPost[]) => Promise<{link: string; isShort: boolean}>;
    clientId?: string;
}

const DASHBOARD_FILTER_STORAGE_KEY = 'yangyuDashboardFilterState';

const copyToClipboard = (text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(resolve).catch(reject);
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed'; 
            textArea.style.top = '-9999px';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    resolve();
                } else {
                    reject(new Error('Copy command failed.'));
                }
            } catch (err) {
                reject(err);
            } finally {
                document.body.removeChild(textArea);
            }
        }
    });
};


const Dashboard: React.FC<DashboardProps> = ({ 
    posts, allMonthlyFollowerData, baseFollowerData, analysisDisplaySettings, isReadOnly, readOnlyViewState, 
    readOnlyAnalysis, onDateRangeLabelChange, allAnalyses, onSaveAnalysis, onShareRequest, clientId
}) => {
    const filterStorageKey = useMemo(() => {
        const scope = (clientId || '').trim();
        return scope ? `${DASHBOARD_FILTER_STORAGE_KEY}:${scope}` : DASHBOARD_FILTER_STORAGE_KEY;
    }, [clientId]);

    // ... (Filter Logic Unchanged)
    const initialFilterState = useMemo(() => {
        if (readOnlyViewState) {
            return {
                platformFilter: readOnlyViewState.platformFilter,
                dateRangeFilter: readOnlyViewState.dateRangeFilter as DateRangeKey,
                customDateRange: readOnlyViewState.customDateRange,
                selectedMonth: readOnlyViewState.selectedMonth,
            };
        }
        try {
            if (typeof window === 'undefined') throw new Error('No window');
            const savedStateJSON = localStorage.getItem(filterStorageKey);
            if (savedStateJSON) {
                const savedState = JSON.parse(savedStateJSON);
                if (savedState && typeof savedState === 'object') {
                    return {
                        platformFilter: savedState.platformFilter || Platform.All,
                        dateRangeFilter: savedState.dateRangeFilter || '30',
                        customDateRange: savedState.customDateRange || { start: '', end: '' },
                        selectedMonth: savedState.selectedMonth || '',
                    };
                }
            }
        } catch (error) {
            console.warn("Could not load dashboard filter state:", error);
        }
        return {
            platformFilter: Platform.All,
            dateRangeFilter: '30' as DateRangeKey,
            customDateRange: { start: '', end: '' },
            selectedMonth: '',
        };
    }, [readOnlyViewState, filterStorageKey]);

    const [platformFilter, setPlatformFilter] = useState<Platform>(initialFilterState.platformFilter);
    const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeKey>(initialFilterState.dateRangeFilter);
    const [customDateRange, setCustomDateRange] = useState(initialFilterState.customDateRange);
    const [selectedMonth, setSelectedMonth] = useState(initialFilterState.selectedMonth);

    const [previewPost, setPreviewPost] = useState<NormalizedPost | null>(null);
    const [ogImageState, setOgImageState] = useState({ loading: false, url: null as string | null, error: false });
    const [heatmapTooltip, setHeatmapTooltip] = useState<HeatmapTooltipInfo | null>(null);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    
    useEffect(() => {
        if (isReadOnly) return; 
        const currentState = {
            platformFilter,
            dateRangeFilter,
            customDateRange,
            selectedMonth,
        };
        try {
            if (typeof window === 'undefined') return;
            localStorage.setItem(filterStorageKey, JSON.stringify(currentState));
        } catch (error) {
            console.error("Failed to save dashboard filter state:", error);
        }
    }, [platformFilter, dateRangeFilter, customDateRange, selectedMonth, isReadOnly, filterStorageKey]);

    const handlePostSelect = useCallback(async (post: NormalizedPost) => {
        setPreviewPost(post);
        setOgImageState({ loading: true, url: null, error: false });
        try {
            const imageUrl = await fetchOgImage(post.permalink);
            setOgImageState({ loading: false, url: imageUrl, error: !imageUrl });
        } catch {
            setOgImageState({ loading: false, url: null, error: true });
        }
    }, []);

    const handleRetryOgImage = useCallback(async () => {
        if (!previewPost) return;
        setOgImageState({ loading: true, url: null, error: false });
        try {
            const imageUrl = await fetchOgImage(previewPost.permalink, true); 
            setOgImageState({ loading: false, url: imageUrl, error: !imageUrl });
        } catch {
            setOgImageState({ loading: false, url: null, error: true });
        }
    }, [previewPost]);

    const handleCloseModal = () => {
        setPreviewPost(null);
        setOgImageState({ loading: false, url: null, error: false });
    };

    const uniqueMonths = useMemo(() => {
        if (!posts || posts.length === 0) return [];
        const months = new Set<string>();
        posts.forEach(post => {
            months.add(format(post.publishTime, 'yyyy-MM'));
        });
        return Array.from(months).sort().reverse();
    }, [posts]);

    useEffect(() => {
        if (isReadOnly) return;
        if (dateRangeFilter !== 'monthly') {
            setSelectedMonth('');
        } else if (uniqueMonths.length > 0 && !selectedMonth) {
            setSelectedMonth(uniqueMonths[0]);
        }
    }, [dateRangeFilter, uniqueMonths, selectedMonth, isReadOnly]);


    const [analysisData, setAnalysisData] = useState<AnalysisData>({ insights: '', contentSuggestions: '', platformAdjustments: '' });

    const isSameAnalysisData = (a: AnalysisData, b: AnalysisData) => {
        return (
            String(a.insights || '') === String(b.insights || '') &&
            String(a.contentSuggestions || '') === String(b.contentSuggestions || '') &&
            String(a.platformAdjustments || '') === String(b.platformAdjustments || '')
        );
    };

    const { currentPeriodPosts, previousPeriodPosts, dateRangeLabel, storageKey, currentStartDate, currentEndDate } = useMemo(() => {
        let startDate: Date | null = null;
        let endDate: Date | null = null;
        let label = '';
        let key = '';
        const now = new Date();

        if (isReadOnly && readOnlyViewState?.absoluteDateRange) {
            startDate = new Date(readOnlyViewState.absoluteDateRange.start);
            endDate = new Date(readOnlyViewState.absoluteDateRange.end);
        } else {
            if (dateRangeFilter === 'monthly') {
                if (selectedMonth) {
                    const [year, month] = selectedMonth.split('-').map(Number);
                    startDate = new Date(year, month - 1, 1);
                    endDate = lastDayOfMonth(startDate);
                    label = `${format(startDate, 'yyyy年 M月')}`;
                    key = selectedMonth;
                }
            } else if (dateRangeFilter === 'custom') {
                if (customDateRange.start) {
                    const [y, m, d] = customDateRange.start.split('-').map(Number);
                    startDate = new Date(y, m - 1, d);
                }
                if (customDateRange.end) {
                    const [y, m, d] = customDateRange.end.split('-').map(Number);
                    endDate = new Date(y, m - 1, d);
                }
            } else if (dateRangeFilter !== 'all') {
                startDate = startOfDay(subDays(now, Number(dateRangeFilter)));
                endDate = now;
            }
        }

        if (startDate) startDate.setHours(0, 0, 0, 0);
        if (endDate) endDate.setHours(23, 59, 59, 999);
        
        if (!label) {
            if (isReadOnly && startDate && endDate) {
                label = `${format(startDate, 'yyyy年 M月 d日')} - ${format(endDate, 'yyyy年 M月 d日')}`;
            } else if (dateRangeFilter !== 'custom' && dateRangeFilter !== 'monthly') {
                label = dateRanges[dateRangeFilter];
            } else if (startDate && endDate) {
                label = `${format(startDate, 'yyyy年 M月 d日')} - ${format(endDate, 'yyyy年 M月 d日')}`;
            } else if (posts.length > 0) {
                 const firstDate = format(posts[posts.length - 1].publishTime, 'yyyy/MM/dd');
                 const lastDate = format(posts[0].publishTime, 'yyyy/MM/dd');
                 label = `${firstDate} - ${lastDate}`;
            } else {
                  label = '全部時間';
            }
        }
        
        if (!key) {
           key = endDate ? format(endDate, 'yyyy-MM') : 'all-time';
        }

        const currentPosts = posts.filter(post => {
            const platformMatch = platformFilter === Platform.All || post.platform === platformFilter;
            if (!startDate || !endDate) return platformMatch; 
            const postTime = post.publishTime;
            const dateMatch = postTime >= startDate && postTime <= endDate;
            return platformMatch && dateMatch;
        });

        let prevPosts: NormalizedPost[] = [];
        if (startDate && endDate) {
            const duration = endDate.getTime() - startDate.getTime();
            const prevEndDate = new Date(startDate.getTime() - 1);
            const prevStartDate = new Date(prevEndDate.getTime() - duration);
            prevPosts = posts.filter(post => {
                const platformMatch = platformFilter === Platform.All || post.platform === platformFilter;
                const postTime = post.publishTime.getTime();
                return platformMatch && (postTime >= prevStartDate.getTime() && postTime <= prevEndDate.getTime());
            });
        }

        return { 
            currentPeriodPosts: currentPosts, 
            previousPeriodPosts: prevPosts, 
            dateRangeLabel: label, 
            storageKey: key,
            currentStartDate: startDate,
            currentEndDate: endDate 
        };
    }, [posts, platformFilter, dateRangeFilter, customDateRange, selectedMonth, isReadOnly, readOnlyViewState]);
    
    useEffect(() => {
        if (onDateRangeLabelChange) {
            onDateRangeLabelChange(dateRangeLabel);
        }
    }, [dateRangeLabel, onDateRangeLabelChange]);

    useEffect(() => {
        if (isReadOnly) {
            const next = readOnlyAnalysis || { insights: '', contentSuggestions: '', platformAdjustments: '' };
            setAnalysisData((prev) => (isSameAnalysisData(prev, next) ? prev : next));
        } else if (storageKey && allAnalyses) {
            const loadedAnalysis = allAnalyses[storageKey];
            const next = loadedAnalysis || { insights: '', contentSuggestions: '', platformAdjustments: '' };
            setAnalysisData((prev) => (isSameAnalysisData(prev, next) ? prev : next));
        }
    }, [storageKey, isReadOnly, readOnlyAnalysis, allAnalyses]);

    const handleSaveAnalysis = (data: AnalysisData) => {
        if (isReadOnly) return;
        onSaveAnalysis(storageKey, data);
        alert('分析與建議已儲存！');
    };

    const handleShareView = async () => {
        if (!onShareRequest || isSharing) return;
        setIsSharing(true);
        
        const currentViewState: ReadOnlyViewState = {
            platformFilter,
            dateRangeFilter,
            customDateRange,
            selectedMonth,
            absoluteDateRange: currentStartDate && currentEndDate ? {
                start: currentStartDate.toISOString(),
                end: currentEndDate.toISOString(),
            } : undefined,
        };
        
        try {
            const allPostsForView = [...new Set([...currentPeriodPosts, ...previousPeriodPosts])];
            const { link, isShort } = await onShareRequest(currentViewState, analysisData, allPostsForView);
            
            const successMessage = isShort
                ? '唯讀分享連結已產生並複製到剪貼簿！'
                : '短連結服務權限不足，已為您產生備用的長連結並複製到剪貼簿。';

            copyToClipboard(link)
                .then(() => alert(successMessage))
                .catch(() => prompt('複製失敗，請手動複製此連結:', link));

        } catch (error: any) {
            console.error('Sharing failed', error);
            alert(error.message || '產生分享連結時發生錯誤。');
        } finally {
            setIsSharing(false);
        }
    };

    const handleExport = (selectedSections: Record<string, boolean>) => {
        const reportData = {
            profile: {
                companyName: document.querySelector<HTMLInputElement>('#companyName')?.value || '',
                instagramUrl: document.querySelector<HTMLInputElement>('#instagramUrl')?.value || '',
                facebookUrl: document.querySelector<HTMLInputElement>('#facebookUrl')?.value || '',
                logo: document.querySelector<HTMLImageElement>('.h-9.w-auto')?.src || '', 
            },
            dateRangeLabel: dateRangeLabel,
            sections: selectedSections,
            posts: currentPeriodPosts,
            kpiData: kpiData,
            kpiTrendData: kpiTrendData,
            allMonthlyFollowerData: allMonthlyFollowerData,
            baseFollowerData: baseFollowerData,
            analysisData: analysisData,
            analysisDisplaySettings: analysisDisplaySettings || { insights: true, contentSuggestions: true, platformAdjustments: true },
        };

        try {
            const serializedData = JSON.stringify(reportData, (key, value) => {
                if (value instanceof Date) {
                    return value.toISOString();
                }
                return value;
            });

            sessionStorage.setItem('reportData', serializedData);
            const reportUrl = new URL(window.location.href);
            reportUrl.hash = 'report';
            window.open(reportUrl.toString(), '_blank');
        } catch (error) {
            console.error('Failed to save report data to sessionStorage', error);
            alert('產生報表時發生錯誤，資料量可能過大。');
        }
    };

    const { kpiData, kpiTrendData } = useMemo(() => {
        const dailyMetrics: Record<string, any> = {};
        currentPeriodPosts.forEach(post => {
            const day = format(startOfDay(post.publishTime), 'yyyy-MM-dd');
            if (!dailyMetrics[day]) {
                dailyMetrics[day] = { totalPosts: 0, totalReach: 0, totalImpressions: 0, totalEngagement: 0 };
            }
            dailyMetrics[day].totalPosts += 1;
            dailyMetrics[day].totalReach += post.reach;
            dailyMetrics[day].totalImpressions += post.impressions;
            dailyMetrics[day].totalEngagement += post.totalEngagement;
        });

        const sortedDailyData = Object.entries(dailyMetrics)
            .map(([date, values]) => ({ date, ...values }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
        const totals = sortedDailyData.reduce((acc, day) => {
            acc.totalPosts += day.totalPosts;
            acc.totalReach += day.totalReach;
            acc.totalImpressions += day.totalImpressions;
            acc.totalEngagement += day.totalEngagement;
            return acc;
        }, { totalPosts: 0, totalReach: 0, totalImpressions: 0, totalEngagement: 0 });

        const engagementRate = totals.totalReach > 0 ? (totals.totalEngagement / totals.totalReach) * 100 : 0;

        const trends = {
            totalPosts: sortedDailyData.map(d => ({ date: d.date, value: d.totalPosts })),
            totalReach: sortedDailyData.map(d => ({ date: d.date, value: d.totalReach })),
            totalImpressions: sortedDailyData.map(d => ({ date: d.date, value: d.totalImpressions })),
            totalEngagement: sortedDailyData.map(d => ({ date: d.date, value: d.totalEngagement })),
            engagementRate: sortedDailyData.map(d => ({
                date: d.date,
                value: d.totalReach > 0 ? (d.totalEngagement / d.totalReach) * 100 : 0
            }))
        };
        
        return { kpiData: { ...totals, engagementRate }, kpiTrendData: trends };
    }, [currentPeriodPosts]);

    const prevKpiData = useMemo(() => calculateKpis(previousPeriodPosts), [previousPeriodPosts]);

    const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };
    
    return (
        <div className="space-y-6">
            {heatmapTooltip && (
                <div 
                    className="fixed z-50 p-3 bg-zinc-800 text-zinc-100 rounded-lg shadow-xl pointer-events-none transition-opacity duration-200 text-sm border border-zinc-700"
                    style={(() => {
                        const offset = 15;
                        const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
                        const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
                        const maxW = 320;
                        const maxH = 220;

                        const preferRight = vw ? (heatmapTooltip.x + offset + maxW <= vw - 12) : true;
                        const preferDown = vh ? (heatmapTooltip.y + offset + maxH <= vh - 12) : true;

                        const left = preferRight ? (heatmapTooltip.x + offset) : (heatmapTooltip.x - offset);
                        const top = preferDown ? (heatmapTooltip.y + offset) : (heatmapTooltip.y - offset);

                        return {
                            top,
                            left,
                            maxWidth: 'min(320px, calc(100vw - 24px))',
                            transform: `${preferRight ? '' : 'translateX(-100%)'}${preferDown ? '' : ' translateY(-100%)'}`.trim(),
                        } as React.CSSProperties;
                    })()}
                >
                    {heatmapTooltip.content}
                </div>
            )}
            
            {/* Filter Section - Designed as a "Control Bar" */}
            <div className="flex flex-col gap-4">
                 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1 rounded-lg shadow-sm">
                        {(Object.keys(Platform) as Array<keyof typeof Platform>).map((key) => (
                            <button
                                key={key}
                                onClick={() => setPlatformFilter(Platform[key])}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${platformFilter === Platform[key] ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
                            >
                                {Platform[key]}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsExportModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm0 2h8v12H6V4zm2 2a1 1 0 100 2h4a1 1 0 100-2H8zm0 4a1 1 0 100 2h4a1 1 0 100-2H8zm0 4a1 1 0 100 2h2a1 1 0 100-2H8z" clipRule="evenodd" /></svg>
                            匯出
                        </button>
                         <button onClick={handleShareView} disabled={isSharing} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-50">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
                            {isSharing ? '分享中...' : '分享檢視'}
                        </button>
                    </div>
                </div>
                
                {!isReadOnly ? (
                    <div className="flex flex-wrap items-center gap-2">
                        {(Object.keys(dateRanges) as DateRangeKey[]).map((key) => (
                            <button
                                key={key}
                                onClick={() => setDateRangeFilter(key)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${dateRangeFilter === key ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900' : 'bg-transparent border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600'}`}
                            >
                                {dateRanges[key]}
                            </button>
                        ))}
                        
                        {/* Dropdowns for Monthly/Custom */}
                        {dateRangeFilter === 'monthly' && uniqueMonths.length > 0 && (
                            <div className="relative">
                                <select 
                                    id="month-select"
                                    value={selectedMonth} 
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="appearance-none pl-3 pr-8 py-1.5 text-xs bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-full focus:outline-none focus:ring-2 focus:ring-zinc-500"
                                >
                                    {uniqueMonths.map(month => (
                                        <option key={month} value={month} className="bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">{month.replace('-', '年 ')}月</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {dateRangeFilter === 'custom' && (
                            <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                <input type="date" value={customDateRange.start} onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))} className="text-xs bg-transparent border-none focus:ring-0 text-zinc-700 dark:text-zinc-300"/>
                                <span className="text-zinc-400">-</span>
                                <input type="date" value={customDateRange.end} onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))} className="text-xs bg-transparent border-none focus:ring-0 text-zinc-700 dark:text-zinc-300"/>
                            </div>
                        )}
                        <span className="ml-auto text-xs text-zinc-400 font-medium">{dateRangeLabel}</span>
                    </div>
                ) : (
                    <div className="flex items-center justify-end">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">期間：{dateRangeLabel}</span>
                    </div>
                )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <KpiCard title="貼文數" value={kpiData.totalPosts} change={calculateChange(kpiData.totalPosts, prevKpiData.totalPosts)} trendData={kpiTrendData.totalPosts} />
                <KpiCard title="觸及" value={kpiData.totalReach} change={calculateChange(kpiData.totalReach, prevKpiData.totalReach)} trendData={kpiTrendData.totalReach} />
                <KpiCard title="曝光" value={kpiData.totalImpressions} change={calculateChange(kpiData.totalImpressions, prevKpiData.totalImpressions)} trendData={kpiTrendData.totalImpressions} />
                <KpiCard title="互動" value={kpiData.totalEngagement} change={calculateChange(kpiData.totalEngagement, prevKpiData.totalEngagement)} trendData={kpiTrendData.totalEngagement} />
                <KpiCard title="互動率" value={kpiData.engagementRate.toFixed(2)} unit="%" change={calculateChange(kpiData.engagementRate, prevKpiData.engagementRate)} trendData={kpiTrendData.engagementRate} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-subtle">
                    <PerformanceLineChart data={currentPeriodPosts} />
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-subtle">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-6 uppercase tracking-wider">平台占比</h3>
                    <PlatformPieChart data={currentPeriodPosts} />
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-subtle">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-6 uppercase tracking-wider">粉絲成長</h3>
                <FollowerGrowth posts={currentPeriodPosts} allMonthlyData={allMonthlyFollowerData} baseData={baseFollowerData} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-subtle">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-6 uppercase tracking-wider">互動類型分佈</h3>
                    <PostTypeBarChart data={currentPeriodPosts} />
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-subtle">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-6 uppercase tracking-wider">發文熱點</h3>
                    <PostingHeatmap data={currentPeriodPosts} onCellHover={setHeatmapTooltip} />
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-subtle">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-6 uppercase tracking-wider">全部貼文</h3>
                    <AllPostsTable data={currentPeriodPosts} onPostSelect={handlePostSelect} />
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-subtle">
                     <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-6 uppercase tracking-wider">表現最佳</h3>
                    <TopPostsTable data={currentPeriodPosts} onPostSelect={handlePostSelect} />
                </div>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-1 rounded-2xl">
                      <AnalysisAndSuggestions
                          savedData={analysisData}
                          onSave={handleSaveAnalysis}
                          isReadOnly={isReadOnly}
                          displaySettings={analysisDisplaySettings}
                      />
            </div>
            
            <Modal isOpen={!!previewPost} onClose={handleCloseModal} title="貼文詳情">
                {previewPost && (
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <PlatformIcon platform={previewPost.platform} />
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{previewPost.platform}</span>
                            <span className="text-zinc-400 text-xs">• {format(previewPost.publishTime, 'yyyy/MM/dd HH:mm')}</span>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl border border-zinc-100 dark:border-zinc-700">
                             <p className="whitespace-pre-wrap text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">{previewPost.content}</p>
                        </div>
                        
                        <div className="rounded-xl overflow-hidden border border-zinc-100 dark:border-zinc-800">
                            {ogImageState.loading && <div className="flex items-center justify-center h-48 bg-zinc-50 dark:bg-zinc-900"><div className="animate-spin rounded-full h-6 w-6 border-2 border-zinc-300 border-t-zinc-600"></div></div>}
                            {ogImageState.error && (
                                <div className="flex flex-col items-center justify-center h-32 bg-zinc-50 dark:bg-zinc-900 text-center p-4">
                                    <p className="text-zinc-400 text-xs">沒有可預覽的內容。</p>
                                </div>
                            )}
                            {ogImageState.url && <img src={ogImageState.url} alt="Post preview" className="w-full object-cover max-h-[300px]" />}
                        </div>
                        <a href={previewPost.permalink} target="_blank" rel="noopener noreferrer" className="block text-center w-full mt-4 px-4 py-2.5 bg-zinc-900 text-white font-medium text-sm rounded-lg hover:bg-zinc-800 transition-colors">在 {previewPost.platform} 開啟</a>
                    </div>
                )}
            </Modal>

            <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} onExport={handleExport} />
        </div>
    );
};

export default Dashboard;

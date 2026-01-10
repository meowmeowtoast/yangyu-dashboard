import React, { useState, useEffect } from 'react';
import { format } from 'date-fns/format';
import type { NormalizedPost, AllMonthlyFollowerData, BaseFollowerData, CompanyProfile } from '../types';
import KpiCard from './KpiCard';
import FollowerGrowth from './FollowerGrowth';
import PlatformPieChart from './PlatformPieChart';
import PerformanceLineChart from './PerformanceLineChart';
import PostTypeBarChart from './PostTypeBarChart';
import TopPostsTable from './TopPostsTable';
import AnalysisAndSuggestions from './AnalysisAndSuggestions';

// Simplified version for report rendering
const AllPostsTableReport: React.FC<{ data: NormalizedPost[] }> = ({ data }) => {
    return (
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500 report-table" style={{borderCollapse: 'collapse'}}>
                <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                    <tr>
                        <th scope="col" className="px-2 py-2 border">平台</th>
                        <th scope="col" className="px-2 py-2 border">發佈時間</th>
                        <th scope="col" className="px-2 py-2 border">內容</th>
                        <th scope="col" className="px-2 py-2 border text-right">曝光</th>
                        <th scope="col" className="px-2 py-2 border text-right">觸及</th>
                        <th scope="col" className="px-2 py-2 border text-right">互動</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((post) => (
                        <tr key={post.permalink} className="border-t">
                            <td className="px-2 py-1 border">{post.platform.substring(0,2)}</td>
                            <td className="px-2 py-1 border whitespace-nowrap">{format(post.publishTime, 'yy/MM/dd')}</td>
                            <td className="px-2 py-1 border">{post.content.substring(0, 80)}{post.content.length > 80 && '...'}</td>
                            <td className="px-2 py-1 border text-right">{post.impressions.toLocaleString()}</td>
                            <td className="px-2 py-1 border text-right">{post.reach.toLocaleString()}</td>
                            <td className="px-2 py-1 border text-right">{post.totalEngagement.toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


const ReportPage = () => {
    const [reportData, setReportData] = useState<any>(null);

    useEffect(() => {
        try {
            const storedData = sessionStorage.getItem('reportData');
            if (storedData) {
                const parsedData = JSON.parse(storedData, (key, value) => {
                    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
                        return new Date(value);
                    }
                    return value;
                });
                
                if (parsedData.posts) {
                    parsedData.posts = parsedData.posts.map((post: any) => ({
                        ...post,
                        publishTime: new Date(post.publishTime),
                    }));
                }
                
                setReportData(parsedData);
            }
        } catch (error) {
            console.error("Failed to load report data from sessionStorage", error);
        }
    }, []);

    if (!reportData) {
        return <div className="flex items-center justify-center min-h-screen">正在產生報表...</div>;
    }

    const {
        profile,
        dateRangeLabel,
        sections,
        kpiData,
        kpiTrendData,
        posts,
        allMonthlyFollowerData,
        baseFollowerData
    } = reportData;

    const ReportSection: React.FC<{title: string; children: React.ReactNode}> = ({ title, children }) => (
        <section className="report-section mb-8">
            <h2 className="text-2xl font-bold text-slate-800 border-b-2 border-emerald-500 pb-2 mb-4">{title}</h2>
            {children}
        </section>
    );

    return (
        <div className="bg-white">
            <header className="p-8 print:hidden flex justify-between items-center bg-slate-100 border-b">
                <h1 className="text-xl font-bold text-slate-700">報表預覽</h1>
                <div className="space-x-2">
                    <button onClick={() => window.print()} className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700">列印 / 存為 PDF</button>
                    <button onClick={() => window.close()} className="px-4 py-2 bg-slate-500 text-white font-semibold rounded-lg hover:bg-slate-600">關閉</button>
                </div>
            </header>

            <main className="p-8 md:p-12 mx-auto max-w-4xl report-body">
                <div className="flex justify-between items-start mb-12">
                    <div>
                        <h1 className="text-4xl font-bold text-slate-900">{profile.companyName || '秧語工作室'}</h1>
                        <p className="text-2xl text-slate-600 mt-2">社群成效報告書</p>
                    </div>
                    {profile.logo && <img src={profile.logo} alt="Logo" className="h-20 w-auto max-w-xs" />}
                </div>
                 <div className="bg-slate-50 p-4 rounded-lg mb-8 text-center">
                    <p className="text-lg font-semibold text-slate-800">報告期間：{dateRangeLabel}</p>
                </div>
                
                {sections.kpis && (
                    <ReportSection title="關鍵指標 (KPIs)">
                         <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <KpiCard title="總貼文數" value={kpiData.totalPosts} trendData={kpiTrendData.totalPosts} />
                            <KpiCard title="總觸及數" value={kpiData.totalReach} trendData={kpiTrendData.totalReach} />
                            <KpiCard title="總曝光數" value={kpiData.totalImpressions} trendData={kpiTrendData.totalImpressions} />
                            <KpiCard title="總互動數" value={kpiData.totalEngagement} trendData={kpiTrendData.totalEngagement} />
                            <KpiCard title="互動率" value={kpiData.engagementRate.toFixed(2)} unit="%" trendData={kpiTrendData.engagementRate} />
                        </div>
                    </ReportSection>
                )}
                {sections.followerGrowth && (
                    <ReportSection title="粉絲/追蹤人數增長">
                        <FollowerGrowth posts={posts} allMonthlyData={allMonthlyFollowerData} baseData={baseFollowerData} />
                    </ReportSection>
                )}
                 {sections.platformDistribution && (
                    <ReportSection title="平台貼文佔比">
                        <div className="flex justify-center"><PlatformPieChart data={posts} /></div>
                    </ReportSection>
                )}
                 {sections.dailyPerformance && (
                    <ReportSection title="每日成效趨勢">
                        <PerformanceLineChart data={posts} />
                    </ReportSection>
                )}
                {sections.postTypes && (
                     <ReportSection title="各類型貼文平均互動">
                        <PostTypeBarChart data={posts} />
                    </ReportSection>
                )}
                {sections.topPosts && (
                     <ReportSection title="熱門貼文">
                        <TopPostsTable data={posts} onPostSelect={() => {}} />
                    </ReportSection>
                )}
                 {sections.allPosts && (
                     <ReportSection title="所有貼文列表">
                        <div className="overflow-x-auto">
                            <AllPostsTableReport data={posts} />
                        </div>
                    </ReportSection>
                )}

                 {sections.analysis && reportData.analysisData && (
                    <ReportSection title="分析與建議">
                         <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-slate-700">本月重點洞察</h4>
                                <p className="whitespace-pre-wrap p-2 bg-slate-50 rounded mt-1">{reportData.analysisData.insights || '無'}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-700">內容方向建議</h4>
                                <p className="whitespace-pre-wrap p-2 bg-slate-50 rounded mt-1">{reportData.analysisData.contentSuggestions || '無'}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-700">平台策略調整</h4>
                                <p className="whitespace-pre-wrap p-2 bg-slate-50 rounded mt-1">{reportData.analysisData.platformAdjustments || '無'}</p>
                            </div>
                        </div>
                    </ReportSection>
                )}
            </main>
        </div>
    );
};

export default ReportPage;
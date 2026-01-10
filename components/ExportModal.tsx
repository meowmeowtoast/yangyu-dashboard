import React, { useState } from 'react';

const availableSections = {
    kpis: '關鍵指標 (KPIs)',
    followerGrowth: '粉絲/追蹤人數增長',
    platformDistribution: '平台貼文佔比',
    dailyPerformance: '每日成效趨勢',
    postTypes: '各類型貼文平均互動',
    topPosts: '熱門貼文',
    allPosts: '所有貼文列表',
    analysis: '分析與建議',
};

type SectionKey = keyof typeof availableSections;

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (selectedSections: Record<SectionKey, boolean>) => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport }) => {
    if (!isOpen) return null;

    const [selected, setSelected] = useState<Record<SectionKey, boolean>>(() => {
        const allSelected: Record<string, boolean> = {};
        Object.keys(availableSections).forEach(key => {
            allSelected[key] = true;
        });
        return allSelected;
    });

    const handleToggle = (key: SectionKey) => {
        setSelected(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleToggleAll = (isChecked: boolean) => {
        const allSelected: Record<string, boolean> = {};
        Object.keys(availableSections).forEach(key => {
            allSelected[key] = isChecked;
        });
        setSelected(allSelected);
    };

    const isAllSelected = Object.values(selected).every(Boolean);
    const isNoneSelected = Object.values(selected).every(v => !v);

    const handleGenerate = () => {
        onExport(selected);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-slate-200">客製化報表匯出</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200 text-2xl">&times;</button>
                </div>
                
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">請勾選您想在報表中包含的區塊。報表將會根據您目前在儀表板上設定的篩選器（日期、平台）來產生。</p>

                <div className="border-t border-b dark:border-slate-700 py-2 mb-4">
                     <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="toggle-all"
                            checked={isAllSelected}
                            onChange={e => handleToggleAll(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <label htmlFor="toggle-all" className="ml-3 block text-sm font-bold text-gray-900 dark:text-slate-100">
                           {isAllSelected ? '取消全選' : '全選'}
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 max-h-64 overflow-y-auto pr-2">
                    {Object.entries(availableSections).map(([key, label]) => (
                        <div key={key} className="flex items-center">
                            <input
                                type="checkbox"
                                id={`section-${key}`}
                                checked={!!selected[key as SectionKey]}
                                onChange={() => handleToggle(key as SectionKey)}
                                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <label htmlFor={`section-${key}`} className="ml-3 block text-sm font-medium text-gray-700 dark:text-slate-300">
                                {label}
                            </label>
                        </div>
                    ))}
                </div>

                <div className="mt-6 flex justify-end space-x-2">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500">取消</button>
                    <button onClick={handleGenerate} disabled={isNoneSelected} className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:bg-emerald-300">產生報表</button>
                </div>
            </div>
        </div>
    );
};

export default ExportModal;
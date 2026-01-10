import React, { useState, useEffect } from 'react';
import type { AnalysisData } from '../types';

interface Props {
    savedData: AnalysisData;
    onSave: (data: AnalysisData) => void;
    isReadOnly: boolean;
}

const EditIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
        <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
    </svg>
);

const AnalysisAndSuggestions: React.FC<Props> = ({ savedData, onSave, isReadOnly }) => {
    const [data, setData] = useState<AnalysisData>(savedData);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        setData(savedData);
        if (!isReadOnly && !savedData.insights && !savedData.contentSuggestions && !savedData.platformAdjustments) {
            setIsEditing(true);
        } else {
            setIsEditing(false);
        }
    }, [savedData, isReadOnly]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        if (isReadOnly) return;
        onSave(data);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setData(savedData);
        if (savedData.insights || savedData.contentSuggestions || savedData.platformAdjustments) {
             setIsEditing(false);
        }
    };
    
    const ReadOnlyView: React.FC<{label: string; value: string}> = ({ label, value }) => (
        <div>
            <h4 className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</h4>
            <div className="w-full p-2 bg-slate-50 dark:bg-slate-700/50 rounded-md min-h-[108px] whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                {value || <span className="text-slate-400 dark:text-slate-500">尚未填寫</span>}
            </div>
        </div>
    );

    if (isEditing && !isReadOnly) {
        return (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">分析與建議</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="insights" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">本月重點洞察</label>
                        <textarea
                            id="insights"
                            name="insights"
                            rows={4}
                            className="w-full p-2 border border-slate-300 bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-600 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="輸入您觀察到的重點..."
                            value={data.insights}
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label htmlFor="contentSuggestions" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">內容方向建議</label>
                        <textarea
                            id="contentSuggestions"
                            name="contentSuggestions"
                            rows={4}
                            className="w-full p-2 border border-slate-300 bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-600 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="根據洞察，提出未來的內容方向..."
                            value={data.contentSuggestions}
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label htmlFor="platformAdjustments" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">平台策略調整</label>
                        <textarea
                            id="platformAdjustments"
                            name="platformAdjustments"
                            rows={4}
                            className="w-full p-2 border border-slate-300 bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-600 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="是否有需要調整的平台經營策略..."
                            value={data.platformAdjustments}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="flex justify-end items-center gap-2">
                        <button
                            onClick={handleCancel}
                            className="px-6 py-2 bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-200 font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors duration-300"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors duration-300"
                        >
                            儲存
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm relative">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">分析與建議</h3>
                {!isReadOnly && (
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200 rounded-full transition-colors"
                        title="編輯"
                    >
                        <EditIcon />
                    </button>
                )}
            </div>
            <div className="space-y-4">
                <ReadOnlyView label="本月重點洞察" value={data.insights} />
                <ReadOnlyView label="內容方向建議" value={data.contentSuggestions} />
                <ReadOnlyView label="平台策略調整" value={data.platformAdjustments} />
            </div>
        </div>
    );
};

export default AnalysisAndSuggestions;
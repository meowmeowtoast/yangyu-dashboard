
import React, { useState, useMemo, useEffect, useRef } from 'react';
import FileUpload from './FileUpload';
import Modal from './Modal';
import type { NormalizedPost, DataSet, SelectionState, AllMonthlyFollowerData, MonthlyFollowerData, BaseFollowerData, CompanyProfile, AnalysisData, UserData } from '../types';
import { format } from 'date-fns/format';
import PlatformIcon from './PlatformIcon';
import * as KVStore from '../utils/kvStore';

interface DataManagementPageProps {
    dataSets: DataSet[];
    selectionState: SelectionState;
    onSelectionChange: (newState: SelectionState) => void;
    onAddMoreFiles: (processedFiles: { filename: string; posts: NormalizedPost[] }[]) => void;
    onClearAllData: () => void;
    onClearDataByRange: (startDate: Date, endDate: Date) => void;
    onDeleteDataSet: (dataSetId: string) => void;
    allMonthlyFollowerData: AllMonthlyFollowerData;
    onMonthlyFollowerDataUpdate: (newData: AllMonthlyFollowerData) => void;
    baseFollowerData: BaseFollowerData;
    onBaseFollowerDataUpdate: (newData: BaseFollowerData) => void;
    companyProfile: CompanyProfile;
    onCompanyProfileUpdate: (newProfile: CompanyProfile) => void;
    onExportData: () => void;
    onImportData: (file: File) => void;
    onBackupRequest: () => UserData & { analyses: Record<string, AnalysisData> };
    onRestoreRequest: (data: any) => void;
    clientId?: string;
    onDirtyChange?: (dirty: boolean) => void;
}

const DATA_MANAGEMENT_VIEWSTATE_STORAGE_KEY = 'yangyuDataManagementViewState';

// Reusing LocalDataManager but updating styling
export const LocalDataManager: React.FC<{
    onExportData: () => void;
    onImportData: (file: File) => void;
    onClearAllData: () => void;
    onClearDataByRange: (startDate: Date, endDate: Date) => void;
}> = ({ onExportData, onImportData, onClearAllData, onClearDataByRange }) => {
    const [isClearRangeModalOpen, setIsClearRangeModalOpen] = useState(false);
    const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
    const [rangeToDelete, setRangeToDelete] = useState({ start: '', end: '' });
    const [pendingFile, setPendingFile] = useState<File | null>(null);

    const showDebugTools = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');
    const [cloudBackups, setCloudBackups] = useState<string[]>([]);
    const [isLoadingBackups, setIsLoadingBackups] = useState(false);
    const [backupError, setBackupError] = useState<string | null>(null);

    const loadCloudBackups = async () => {
        setIsLoadingBackups(true);
        setBackupError(null);
        try {
            const res = await fetch('/api/state-backups', { credentials: 'include' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
            setCloudBackups(Array.isArray(data?.backups) ? data.backups : []);
        } catch (err: any) {
            setBackupError(err?.message || '載入備份失敗');
        } finally {
            setIsLoadingBackups(false);
        }
    };

    const restoreCloudBackup = async (backupKey: string) => {
        const confirmText = window.prompt(
            '此操作會以雲端備份覆蓋目前雲端資料（無法復原）。\n\n請輸入「還原」以確認：',
            ''
        );
        if (confirmText === null) return;
        if (confirmText.trim() !== '還原') {
            alert('輸入不正確，已取消。');
            return;
        }

        try {
            const res = await fetch('/api/state-restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ backupKey }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
            alert('已還原雲端備份，頁面將重新整理。');
            window.location.reload();
        } catch (err: any) {
            alert(`還原失敗：${err?.message || '未知錯誤'}`);
        }
    };

    const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
        console.log("File input change detected");
        const file = event.target.files?.[0];
        if (file) {
            console.log("File selected:", file.name);
            setPendingFile(file);
            setIsImportConfirmOpen(true);
        } else {
            console.log("No file selected");
        }
        // Reset the value so the same file can be selected again
        event.target.value = '';
    };
    
    const confirmImport = () => {
        if (pendingFile) {
            onImportData(pendingFile);
        }
        setIsImportConfirmOpen(false);
        setPendingFile(null);
    };

    const cancelImport = () => {
        setIsImportConfirmOpen(false);
        setPendingFile(null);
    };
    
    const handleClearRange = () => {
        const { start, end } = rangeToDelete;
        if (!start || !end) return alert('請選取開始與結束日期。');
        onClearDataByRange(new Date(start), new Date(end));
        setIsClearRangeModalOpen(false);
        setRangeToDelete({ start: '', end: '' });
    };

    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-subtle">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4 uppercase tracking-wider">本機資料操作</h2>
            <div className="flex items-center flex-wrap gap-3">
                <button onClick={onExportData} className="px-3 py-2 bg-zinc-100 text-zinc-700 text-sm font-medium rounded-lg hover:bg-zinc-200 transition-colors border border-zinc-200">匯出備份 (JSON)</button>
                
                <label className="cursor-pointer px-3 py-2 bg-zinc-100 text-zinc-700 text-sm font-medium rounded-lg hover:bg-zinc-200 transition-colors border border-zinc-200 flex items-center">
                    匯入備份 (JSON)
                    <input 
                        type="file" 
                        onChange={handleImportBackup} 
                        className="hidden" 
                        accept=".json" 
                        onClick={(e) => (e.target as HTMLInputElement).value = ''}
                    />
                </label>

                <div className="h-4 w-px bg-zinc-300 mx-1"></div>
                <button onClick={() => setIsClearRangeModalOpen(true)} className="px-3 py-2 text-amber-600 bg-amber-50 text-sm font-medium rounded-lg hover:bg-amber-100 transition-colors border border-amber-200">清除範圍資料</button>
                <button onClick={onClearAllData} className="px-3 py-2 text-rose-600 bg-rose-50 text-sm font-medium rounded-lg hover:bg-rose-100 transition-colors border border-rose-200">清除所有資料</button>
            </div>

            {showDebugTools && (
                <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">雲端備份（Debug）</h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">用於意外覆寫時的緊急還原（僅 debug 模式顯示）。</p>
                        </div>
                        <button
                            onClick={loadCloudBackups}
                            className="px-3 py-2 bg-zinc-100 text-zinc-700 text-sm font-medium rounded-lg hover:bg-zinc-200 transition-colors border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-700"
                            disabled={isLoadingBackups}
                        >
                            {isLoadingBackups ? '載入中…' : '載入備份清單'}
                        </button>
                    </div>

                    {backupError && (
                        <div className="mt-3 text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 p-3 rounded-lg border border-rose-100 dark:border-rose-900/50">
                            {backupError}
                        </div>
                    )}

                    {cloudBackups.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {cloudBackups.map((key) => (
                                <div key={key} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                                    <div className="text-xs text-zinc-600 dark:text-zinc-300 break-all">{key}</div>
                                    <button
                                        onClick={() => restoreCloudBackup(key)}
                                        className="px-3 py-2 text-white bg-rose-600 text-sm font-medium rounded-lg hover:bg-rose-700 transition-colors"
                                    >
                                        還原
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
             <Modal isOpen={isClearRangeModalOpen} onClose={() => setIsClearRangeModalOpen(false)} title="清除指定範圍內的資料">
                 <div className="space-y-4">
                     <p className="text-sm text-zinc-500">此操作將會永久刪除選定日期範圍內的所有貼文資料，且無法復原。</p>
                     <div className="flex gap-4">
                         <div className="flex-1">
                             <label className="block text-xs font-medium text-zinc-500 mb-1">開始日期</label>
                             <input type="date" value={rangeToDelete.start} onChange={(e) => setRangeToDelete(prev => ({...prev, start: e.target.value}))} className="w-full text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-md px-3 py-2 focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 outline-none"/>
                         </div>
                         <div className="flex-1">
                             <label className="block text-xs font-medium text-zinc-500 mb-1">結束日期</label>
                             <input type="date" value={rangeToDelete.end} onChange={(e) => setRangeToDelete(prev => ({...prev, end: e.target.value}))} className="w-full text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-md px-3 py-2 focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 outline-none"/>
                         </div>
                     </div>
                     <div className="flex justify-end pt-2">
                         <button onClick={handleClearRange} className="px-4 py-2 bg-rose-600 text-white font-medium rounded-lg hover:bg-rose-700 text-sm" disabled={!rangeToDelete.start || !rangeToDelete.end}>確認清除</button>
                     </div>
                 </div>
            </Modal>

            <Modal isOpen={isImportConfirmOpen} onClose={cancelImport} title="確認匯入資料">
                <div className="space-y-4">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        您確定要匯入 <span className="font-semibold text-zinc-800 dark:text-zinc-200">{pendingFile?.name}</span> 嗎？
                    </p>
                    <p className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 p-3 rounded-lg border border-rose-100 dark:border-rose-900/50">
                        警告：此操作將會<strong>覆寫</strong>您目前所有的儀表板資料，且無法復原。建議您在匯入前先匯出目前的資料作為備份。
                    </p>
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={cancelImport} className="px-4 py-2 bg-zinc-100 text-zinc-700 font-medium rounded-lg hover:bg-zinc-200 text-sm dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">取消</button>
                        <button onClick={confirmImport} className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 text-sm">確認匯入</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};


const DataManagementPage: React.FC<DataManagementPageProps> = ({ 
    dataSets, 
    selectionState,
    onSelectionChange,
    onAddMoreFiles, 
    onClearAllData, 
    onClearDataByRange,
    onDeleteDataSet,
    allMonthlyFollowerData,
    onMonthlyFollowerDataUpdate,
    baseFollowerData,
    onBaseFollowerDataUpdate,
    companyProfile,
    onCompanyProfileUpdate,
    onExportData,
    onImportData,
    onBackupRequest,
    onRestoreRequest,
    clientId,
    onDirtyChange
}) => {
    const viewStateStorageKey = useMemo(() => {
        const scope = (clientId || '').trim();
        return scope ? `${DATA_MANAGEMENT_VIEWSTATE_STORAGE_KEY}:${scope}` : DATA_MANAGEMENT_VIEWSTATE_STORAGE_KEY;
    }, [clientId]);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [expandedDataSetId, setExpandedDataSetId] = useState<string | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
    const [monthlyData, setMonthlyData] = useState<MonthlyFollowerData>({ fbGained: '', fbLost: '', igGained: '', igLost: '' });
    const [monthlyDrafts, setMonthlyDrafts] = useState<Record<string, MonthlyFollowerData>>({});
    const [isMonthlyDirty, setIsMonthlyDirty] = useState(false);
    const [baseData, setBaseData] = useState<BaseFollowerData>({ fbBase: '', igBase: '' });
    const [isBaseDirty, setIsBaseDirty] = useState(false);
    const [profile, setProfile] = useState<CompanyProfile>({ companyName: '', instagramUrl: '', facebookUrl: '', logo: '' });
    const [isProfileDirty, setIsProfileDirty] = useState(false);

    const [sharedViews, setSharedViews] = useState<KVStore.SharedViewIndexItem[]>([]);
    const [isLoadingSharedViews, setIsLoadingSharedViews] = useState(false);
    const [sharedViewsError, setSharedViewsError] = useState<string | null>(null);
    const [editingSharedViewId, setEditingSharedViewId] = useState<string | null>(null);
    const [editingSharedViewLabel, setEditingSharedViewLabel] = useState<string>('');

    const sortedDataSets = useMemo(() => {
        const toTime = (ds: DataSet) => {
            const t = Date.parse(ds.uploadDate || '');
            return Number.isFinite(t) ? t : 0;
        };
        return [...(dataSets || [])].sort((a, b) => {
            const diff = toTime(a) - toTime(b);
            if (diff !== 0) return diff;
            return String(a.id).localeCompare(String(b.id));
        });
    }, [dataSets]);

    // Restore lightweight view state (not drafts) per client
    useEffect(() => {
        try {
            if (typeof window === 'undefined') return;
            const raw = localStorage.getItem(viewStateStorageKey);
            if (!raw) return;
            const saved = JSON.parse(raw);
            if (!saved || typeof saved !== 'object') return;

            if (typeof saved.selectedMonth === 'string' && saved.selectedMonth.trim()) {
                setSelectedMonth(saved.selectedMonth);
            }
            if (typeof saved.expandedDataSetId === 'string') {
                setExpandedDataSetId(saved.expandedDataSetId);
            }
        } catch (err) {
            console.warn('Could not restore DataManagement view state:', err);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewStateStorageKey]);

    useEffect(() => {
        try {
            if (typeof window === 'undefined') return;
            const current = { selectedMonth, expandedDataSetId };
            localStorage.setItem(viewStateStorageKey, JSON.stringify(current));
        } catch (err) {
            console.warn('Could not persist DataManagement view state:', err);
        }
    }, [selectedMonth, expandedDataSetId, viewStateStorageKey]);

    const isDirty = isMonthlyDirty || isBaseDirty || isProfileDirty;
    const lastDirtyRef = useRef<boolean>(false);
    useEffect(() => {
        if (!onDirtyChange) return;
        if (lastDirtyRef.current === isDirty) return;
        lastDirtyRef.current = isDirty;
        onDirtyChange(isDirty);
    }, [isDirty, onDirtyChange]);

    useEffect(() => {
        const draft = monthlyDrafts[selectedMonth];
        if (draft) {
            setMonthlyData(draft);
            setIsMonthlyDirty(true);
            return;
        }
        const dataForMonth = allMonthlyFollowerData[selectedMonth] || { fbGained: '', fbLost: '', igGained: '', igLost: '' };
        setMonthlyData(dataForMonth);
        setIsMonthlyDirty(false);
    }, [allMonthlyFollowerData, monthlyDrafts, selectedMonth]);
    
    useEffect(() => {
        if (isBaseDirty) return;
        setBaseData(baseFollowerData);
    }, [baseFollowerData, isBaseDirty]);
    
    useEffect(() => {
        if (isProfileDirty) return;
        setProfile(companyProfile);
    }, [companyProfile, isProfileDirty]);


    const handleFollowerDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (/^\d*$/.test(value)) {
            setMonthlyData(prev => {
                const next = {
                    ...prev,
                    [name]: value,
                } as MonthlyFollowerData;
                setMonthlyDrafts(d => ({ ...d, [selectedMonth]: next }));
                setIsMonthlyDirty(true);
                return next;
            });
        }
    };

    const handleSaveFollowerData = () => {
        const newData = {
            ...allMonthlyFollowerData,
            [selectedMonth]: monthlyData
        };
        onMonthlyFollowerDataUpdate(newData);
        setMonthlyDrafts(d => {
            const next = { ...d };
            delete next[selectedMonth];
            return next;
        });
        setIsMonthlyDirty(false);
        alert('粉絲變化資料已儲存！');
    };
    
    const handleBaseDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (/^\d*$/.test(value)) {
            setBaseData(prev => ({ ...prev, [name]: value }));
            setIsBaseDirty(true);
        }
    };

    const handleSaveBaseData = () => {
        onBaseFollowerDataUpdate(baseData);
        setIsBaseDirty(false);
        alert('基礎粉絲數已儲存！');
    };

    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProfile(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setIsProfileDirty(true);
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfile(prev => ({ ...prev, logo: reader.result as string }));
                setIsProfileDirty(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLogo = () => {
        setProfile(prev => ({ ...prev, logo: '' }));
        setIsProfileDirty(true);
    };

    const loadSharedViews = async () => {
        setIsLoadingSharedViews(true);
        setSharedViewsError(null);
        try {
            const items = await KVStore.listSharedViews();
            setSharedViews(items);
        } catch (err: any) {
            setSharedViewsError(err?.message || '載入分享連結失敗');
        } finally {
            setIsLoadingSharedViews(false);
        }
    };

    const makeSharedViewUrl = (id: string) => {
        const url = new URL(window.location.origin + window.location.pathname);
        url.searchParams.set('view', id);
        return url.toString();
    };

    const copyText = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            alert('已複製連結');
        } catch {
            window.prompt('請手動複製連結：', text);
        }
    };

    const startEditSharedViewLabel = (id: string, currentLabel: string) => {
        setEditingSharedViewId(id);
        setEditingSharedViewLabel(currentLabel || '');
    };

    const saveSharedViewLabel = async () => {
        if (!editingSharedViewId) return;
        const trimmed = editingSharedViewLabel.trim();
        if (!trimmed) return alert('請輸入名稱');

        try {
            await KVStore.updateSharedViewLabel(editingSharedViewId, trimmed);
            setSharedViews(prev => prev.map(x => x.id === editingSharedViewId ? { ...x, label: trimmed } : x));
            setEditingSharedViewId(null);
            setEditingSharedViewLabel('');
        } catch (err: any) {
            alert(`更新失敗：${err?.message || '未知錯誤'}`);
        }
    };

    const deleteSharedView = async (id: string) => {
        const confirmText = window.prompt('此操作會讓分享連結失效（無法復原）。\n\n請輸入「刪除」以確認：', '');
        if (confirmText === null) return;
        if (confirmText.trim() !== '刪除') {
            alert('輸入不正確，已取消。');
            return;
        }

        try {
            await KVStore.deleteSharedView(id);
            setSharedViews(prev => prev.filter(x => x.id !== id));
        } catch (err: any) {
            alert(`刪除失敗：${err?.message || '未知錯誤'}`);
        }
    };

    const handleSaveProfile = () => {
        onCompanyProfileUpdate(profile);
        setIsProfileDirty(false);
        alert('工作室資訊已儲存！');
    };

     const handleRestoreProfile = () => {
        if (window.confirm('確定要還原工作室資訊為預設值嗎？此操作將會清除已填寫的資訊與 Logo。')) {
            const defaultProfile = { companyName: '', instagramUrl: '', facebookUrl: '', logo: '' };
            onCompanyProfileUpdate(defaultProfile);
            setIsProfileDirty(false);
            alert('工作室資訊已還原。');
        }
    };
    
    const duplicatePostsMap = useMemo(() => {
        const datePlatformMap = new Map<string, string[]>();
        dataSets.forEach(ds => {
            ds.posts.forEach(post => {
                const key = `${format(post.publishTime, 'yyyy-MM-dd')}|${post.platform}`;
                if (!datePlatformMap.has(key)) {
                    datePlatformMap.set(key, []);
                }
                datePlatformMap.get(key)!.push(post.permalink);
            });
        });

        const duplicates = new Set<string>();
        datePlatformMap.forEach(permalinks => {
            if (permalinks.length > 1) {
                permalinks.forEach(link => duplicates.add(link));
            }
        });
        return duplicates;
    }, [dataSets]);

    const handleDataSetToggle = (dataSetId: string, isChecked: boolean) => {
        const dataSet = dataSets.find(ds => ds.id === dataSetId);
        if (!dataSet) return;

        const newSelectionState: SelectionState = {
            enabledDataSetIds: {
                ...selectionState.enabledDataSetIds,
                [dataSetId]: isChecked,
            },
            enabledPostPermalinks: { ...selectionState.enabledPostPermalinks },
        };

        dataSet.posts.forEach(post => {
            newSelectionState.enabledPostPermalinks[post.permalink] = isChecked;
        });

        onSelectionChange(newSelectionState);
    };

    const handlePostToggle = (permalink: string, dataSetId: string, isChecked: boolean) => {
        const newPostPermalinks = {
            ...selectionState.enabledPostPermalinks,
            [permalink]: isChecked,
        };

        const dataSet = dataSets.find(ds => ds.id === dataSetId);
        if (!dataSet) return;
        
        const isDataSetEnabled = dataSet.posts.some(p => newPostPermalinks[p.permalink]);
        
        const newDataSetIds = {
            ...selectionState.enabledDataSetIds,
            [dataSetId]: isDataSetEnabled,
        };
        
        onSelectionChange({
            enabledDataSetIds: newDataSetIds,
            enabledPostPermalinks: newPostPermalinks,
        });
    };

    const handleFilesProcessed = (processedFiles: { filename: string; posts: NormalizedPost[] }[]) => {
        onAddMoreFiles(processedFiles);
        setIsAddModalOpen(false);
    };

    const DataSetCheckbox = ({ dataSet }: { dataSet: DataSet }) => {
        const ref = useRef<HTMLInputElement>(null);
        const enabledCount = dataSet.posts.filter(p => !!selectionState.enabledPostPermalinks[p.permalink]).length;

        const isChecked = dataSet.posts.length > 0 && enabledCount === dataSet.posts.length;
        const isIndeterminate = enabledCount > 0 && enabledCount < dataSet.posts.length;

        useEffect(() => {
            if (ref.current) {
                ref.current.indeterminate = isIndeterminate;
            }
        }, [isIndeterminate]);

        return (
            <input
                type="checkbox"
                ref={ref}
                checked={isChecked}
                onChange={(e) => handleDataSetToggle(dataSet.id, e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
            />
        );
    };
    
    // Helper for input styles
    const inputClass = "mt-1 w-full text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 focus:border-zinc-300 outline-none transition-all";
    const labelClass = "block text-xs font-medium text-zinc-500 dark:text-zinc-400";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-8">
                <LocalDataManager
                    onExportData={onExportData}
                    onImportData={onImportData}
                    onClearAllData={onClearAllData}
                    onClearDataByRange={onClearDataByRange}
                />

                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-subtle">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1 uppercase tracking-wider">分享連結管理</h2>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">管理員可在此檢視、改名或刪除過去產生的分享連結（短連結通常 30 天後到期）。</p>
                        </div>
                        <button
                            onClick={loadSharedViews}
                            className="px-3 py-2 bg-zinc-100 text-zinc-700 text-sm font-medium rounded-lg hover:bg-zinc-200 transition-colors border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-700"
                            disabled={isLoadingSharedViews}
                        >
                            {isLoadingSharedViews ? '載入中…' : '載入清單'}
                        </button>
                    </div>

                    {sharedViewsError && (
                        <div className="mt-3 text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 p-3 rounded-lg border border-rose-100 dark:border-rose-900/50">
                            {sharedViewsError}
                        </div>
                    )}

                    {sharedViews.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {sharedViews.map((item) => {
                                const url = makeSharedViewUrl(item.id);
                                const isEditing = editingSharedViewId === item.id;
                                return (
                                    <div key={item.id} className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                {!isEditing ? (
                                                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{item.label || '未命名分享連結'}</div>
                                                ) : (
                                                    <input
                                                        value={editingSharedViewLabel}
                                                        onChange={(e) => setEditingSharedViewLabel(e.target.value)}
                                                        className="w-full px-3 py-2 rounded-lg text-sm bg-white border border-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/30 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
                                                        placeholder="輸入連結名稱"
                                                        autoFocus
                                                    />
                                                )}
                                                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 truncate">{url}</div>
                                                <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-500">
                                                    {item.clientName ? `客戶：${item.clientName}｜` : ''}建立：{item.createdAt}｜到期：{item.expiresAt}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <button
                                                    onClick={() => copyText(url)}
                                                    className="px-3 py-2 bg-white border border-zinc-200 text-zinc-700 text-xs font-medium rounded-lg hover:bg-zinc-50 transition-colors dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-200"
                                                >
                                                    複製
                                                </button>

                                                {!isEditing ? (
                                                    <button
                                                        onClick={() => startEditSharedViewLabel(item.id, item.label)}
                                                        className="px-3 py-2 bg-white border border-zinc-200 text-zinc-700 text-xs font-medium rounded-lg hover:bg-zinc-50 transition-colors dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-200"
                                                    >
                                                        編輯
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={saveSharedViewLabel}
                                                        className="px-3 py-2 bg-zinc-900 text-white text-xs font-medium rounded-lg hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                                                    >
                                                        儲存
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => deleteSharedView(item.id)}
                                                    className="px-3 py-2 text-white bg-rose-600 text-xs font-medium rounded-lg hover:bg-rose-700 transition-colors"
                                                >
                                                    刪除
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                 <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-subtle">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4 uppercase tracking-wider">工作室資訊設定</h2>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="companyName" className={labelClass}>公司名稱</label>
                            <input type="text" name="companyName" id="companyName" value={profile.companyName} onChange={handleProfileChange} className={inputClass} placeholder="請輸入公司名稱" />
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="facebookUrl" className={labelClass}>Facebook 網址</label>
                                <input type="text" name="facebookUrl" id="facebookUrl" value={profile.facebookUrl} onChange={handleProfileChange} className={inputClass} placeholder="facebook.com/..." />
                            </div>
                            <div>
                                <label htmlFor="instagramUrl" className={labelClass}>Instagram 網址</label>
                                <input type="text" name="instagramUrl" id="instagramUrl" value={profile.instagramUrl} onChange={handleProfileChange} className={inputClass} placeholder="instagram.com/..." />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>自訂 Logo</label>
                            <div className="mt-2 flex items-center space-x-4">
                                <div className="w-12 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-200">
                                    {profile.logo ? <img src={profile.logo} alt="Logo" className="w-full h-full object-cover" /> : <span className="text-zinc-400 text-[10px]">無</span>}
                                </div>
                                <label className="cursor-pointer px-3 py-1.5 bg-white border border-zinc-200 text-zinc-600 text-xs font-medium rounded-lg hover:bg-zinc-50 transition-colors">
                                    上傳圖片
                                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                </label>

                                {profile.logo && (
                                    <button
                                        type="button"
                                        onClick={handleRemoveLogo}
                                        className="px-3 py-1.5 bg-white border border-zinc-200 text-rose-600 text-xs font-medium rounded-lg hover:bg-rose-50 transition-colors"
                                    >
                                        移除
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end items-center gap-2 mt-6 border-t border-zinc-100 pt-4">
                        <button onClick={handleRestoreProfile} className="text-zinc-400 hover:text-zinc-600 text-xs font-medium px-3 py-2">還原預設</button>
                        <button onClick={handleSaveProfile} className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800">儲存設定</button>
                    </div>
                </div>
            </div>
             <div className="space-y-8">
                 <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-subtle">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4 uppercase tracking-wider">基礎粉絲數設定</h2>
                    <p className="text-sm text-zinc-500 mb-4">請輸入一個起始日期的粉絲/追蹤人數作為計算基準。</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="fbBase" className={labelClass}>Facebook 粉絲總數</label>
                            <input type="text" name="fbBase" id="fbBase" value={baseData.fbBase} onChange={handleBaseDataChange} className={inputClass} placeholder="0" />
                        </div>
                        <div>
                            <label htmlFor="igBase" className={labelClass}>Instagram 追蹤者總數</label>
                            <input type="text" name="igBase" id="igBase" value={baseData.igBase} onChange={handleBaseDataChange} className={inputClass} placeholder="0" />
                        </div>
                    </div>
                    <div className="flex justify-end mt-4">
                        <button onClick={handleSaveBaseData} className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800">儲存基礎數</button>
                    </div>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-subtle">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">每月粉絲變化管理</h2>
                        <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700"/>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-zinc-400 uppercase">Facebook</h4>
                            <div><label className={labelClass}>新增追蹤</label><input type="text" name="fbGained" value={monthlyData.fbGained} onChange={handleFollowerDataChange} className={inputClass} /></div>
                            <div><label className={labelClass}>取消追蹤</label><input type="text" name="fbLost" value={monthlyData.fbLost} onChange={handleFollowerDataChange} className={inputClass} /></div>
                        </div>
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-zinc-400 uppercase">Instagram</h4>
                            <div><label className={labelClass}>新增追蹤</label><input type="text" name="igGained" value={monthlyData.igGained} onChange={handleFollowerDataChange} className={inputClass} /></div>
                            <div><label className={labelClass}>取消追蹤</label><input type="text" name="igLost" value={monthlyData.igLost} onChange={handleFollowerDataChange} className={inputClass} /></div>
                        </div>
                    </div>
                    <div className="flex justify-end mt-4"><button onClick={handleSaveFollowerData} className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800">儲存</button></div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-subtle">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">已上傳資料集</h2>
                        <button onClick={() => setIsAddModalOpen(true)} className="px-3 py-1.5 bg-zinc-100 text-zinc-700 text-xs font-medium rounded-lg hover:bg-zinc-200">新增檔案</button>
                    </div>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                        {sortedDataSets.map((dataSet) => {
                            const isExpanded = expandedDataSetId === dataSet.id;
                            const enabledPostsCount = dataSet.posts.filter(p => !!selectionState.enabledPostPermalinks[p.permalink]).length;

                            const getPostTime = (p: NormalizedPost) => {
                                const d = (p.publishTime instanceof Date ? p.publishTime : new Date(p.publishTime as any));
                                const t = d.getTime();
                                return Number.isFinite(t) ? t : 0;
                            };

                            const sortedPosts = [...(dataSet.posts || [])].sort((a, b) => getPostTime(a) - getPostTime(b));
                            
                            const { dateRange, platforms } = (() => {
                                if (!sortedPosts || sortedPosts.length === 0) return { dateRange: 'N/A', platforms: [] as ('Facebook' | 'Instagram')[] };
                                const minDate = new Date(getPostTime(sortedPosts[0]));
                                const maxDate = new Date(getPostTime(sortedPosts[sortedPosts.length - 1]));
                                const platformSet = new Set(sortedPosts.map(p => p.platform));
                                return {
                                    dateRange: `${format(minDate, 'MMM d')} - ${format(maxDate, 'MMM d, yyyy')}`,
                                    platforms: Array.from(platformSet) as ('Facebook' | 'Instagram')[],
                                };
                            })();

                            return (
                                <div key={dataSet.id} className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden transition-all duration-200 bg-zinc-50/50 hover:bg-zinc-50 hover:shadow-sm">
                                    <div className="flex items-center gap-3 p-3">
                                        <DataSetCheckbox dataSet={dataSet} />
                                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedDataSetId(isExpanded ? null : dataSet.id)}>
                                            <p className="text-sm font-medium text-zinc-900 truncate">{dataSet.name}</p>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <span className="text-xs text-zinc-500">{dateRange}</span>
                                                <div className="flex gap-1">{platforms.map(p => <PlatformIcon key={p} platform={p} />)}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">{enabledPostsCount} / {dataSet.posts.length}</span>
                                            <button onClick={() => onDeleteDataSet(dataSet.id)} className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors"><svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                                        </div>
                                    </div>
                                    {isExpanded && (
                                        <div className="border-t border-zinc-200 bg-white max-h-60 overflow-y-auto">
                                            <table className="w-full text-xs text-left">
                                                <thead className="text-zinc-500 bg-zinc-50 sticky top-0"><tr><th className="px-3 py-2 w-8"></th><th className="px-3 py-2">內容</th><th className="px-3 py-2 w-24">日期</th></tr></thead>
                                                <tbody>
                                                    {sortedPosts.map(post => (
                                                        <tr key={post.permalink} className="border-t border-zinc-100 hover:bg-zinc-50">
                                                            <td className="px-3 py-2 text-center">
                                                                <input type="checkbox" checked={!!selectionState.enabledPostPermalinks[post.permalink]} onChange={(e) => handlePostToggle(post.permalink, dataSet.id, e.target.checked)} className="h-3.5 w-3.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500" />
                                                            </td>
                                                            <td className="px-3 py-2 text-zinc-700 truncate max-w-[200px]">{post.content}</td>
                                                            <td className="px-3 py-2 text-zinc-500 whitespace-nowrap">{format(post.publishTime, 'MMM d, HH:mm')}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="新增更多報表檔案"><FileUpload onFilesProcessed={handleFilesProcessed} isAddingMore={true} existingDataSets={dataSets} /></Modal>
        </div>
    );
};

export default DataManagementPage;

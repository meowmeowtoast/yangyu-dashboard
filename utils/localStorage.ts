
import type { NormalizedPost, AnalysisData, DataSet, SelectionState, AllMonthlyFollowerData, BaseFollowerData, CompanyProfile } from '../types';

export const DATA_SETS_STORAGE_KEY = 'metaDashboardDataSets';
export const ANALYSIS_KEY_PREFIX = 'metaDashboardAnalysis_';
export const SELECTION_STATE_STORAGE_KEY = 'metaDashboardSelectionState';
export const MONTHLY_FOLLOWER_DATA_KEY = 'metaDashboardMonthlyFollowers';
export const BASE_FOLLOWER_DATA_KEY = 'metaDashboardBaseFollowers';
export const COMPANY_PROFILE_KEY = 'metaDashboardCompanyProfile';


export const saveDataSets = (dataSets: DataSet[]): void => {
    try {
        const serializedDataSets = JSON.stringify(dataSets);
        localStorage.setItem(DATA_SETS_STORAGE_KEY, serializedDataSets);
    } catch (error) {
        console.error("Could not save data sets to localStorage", error);
    }
};

export const loadDataSets = (): DataSet[] => {
    try {
        const serializedDataSets = localStorage.getItem(DATA_SETS_STORAGE_KEY);
        if (serializedDataSets === null) {
            return [];
        }
        const parsedDataSets: any[] = JSON.parse(serializedDataSets);
        // Dates are stored as strings in JSON, so we need to convert them back to Date objects.
        return parsedDataSets.map(dataSet => ({
            ...dataSet,
            filenames: dataSet.filenames || [],
            posts: dataSet.posts.map((post: any) => ({
                ...post,
                publishTime: new Date(post.publishTime),
            })).sort((a: NormalizedPost, b: NormalizedPost) => b.publishTime.getTime() - a.publishTime.getTime())
        }));
    } catch (error) {
        console.error("Could not load data sets from localStorage", error);
        return [];
    }
};

// For Analysis Data
export const saveAnalysis = (key: string, data: AnalysisData): void => {
    try {
        localStorage.setItem(`${ANALYSIS_KEY_PREFIX}${key}`, JSON.stringify(data));
    } catch (error) {
        console.error("Could not save analysis to localStorage", error);
    }
};

export const loadAnalysis = (key: string): AnalysisData | null => {
    try {
        const serializedData = localStorage.getItem(`${ANALYSIS_KEY_PREFIX}${key}`);
        if (serializedData === null) return null;
        return JSON.parse(serializedData);
    } catch (error) {
        console.error("Could not load analysis from localStorage", error);
        return null;
    }
};

export const loadAllAnalyses = (): Record<string, AnalysisData> => {
    const analyses: Record<string, AnalysisData> = {};
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(ANALYSIS_KEY_PREFIX)) {
                const analysisId = key.replace(ANALYSIS_KEY_PREFIX, '');
                const data = localStorage.getItem(key);
                if (data) {
                    analyses[analysisId] = JSON.parse(data);
                }
            }
        }
    } catch (error) {
        console.error("Could not load all analyses from localStorage", error);
    }
    return analyses;
};

// For Monthly Follower Data
export const saveAllMonthlyFollowerData = (data: AllMonthlyFollowerData): void => {
    try {
        localStorage.setItem(MONTHLY_FOLLOWER_DATA_KEY, JSON.stringify(data));
    } catch (error) {
        console.error("Could not save monthly follower data to localStorage", error);
    }
};

export const loadAllMonthlyFollowerData = (): AllMonthlyFollowerData => {
    try {
        const serializedData = localStorage.getItem(MONTHLY_FOLLOWER_DATA_KEY);
        if (serializedData === null) return {};
        return JSON.parse(serializedData);
    } catch (error) {
        console.error("Could not load monthly follower data from localStorage", error);
        return {};
    }
};

// For Base Follower Data
export const saveBaseFollowerData = (data: BaseFollowerData): void => {
    try {
        localStorage.setItem(BASE_FOLLOWER_DATA_KEY, JSON.stringify(data));
    } catch (error) {
        console.error("Could not save base follower data to localStorage", error);
    }
};

export const loadBaseFollowerData = (): BaseFollowerData => {
    try {
        const serializedData = localStorage.getItem(BASE_FOLLOWER_DATA_KEY);
        if (serializedData === null) return { fbBase: '', igBase: '' };
        return JSON.parse(serializedData);
    } catch (error) {
        console.error("Could not load base follower data from localStorage", error);
        return { fbBase: '', igBase: '' };
    }
};


// For Selection State
export const saveSelectionState = (state: SelectionState): void => {
    try {
        localStorage.setItem(SELECTION_STATE_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error("Could not save selection state to localStorage", error);
    }
};

export const loadSelectionState = (): SelectionState | null => {
    try {
        const serializedState = localStorage.getItem(SELECTION_STATE_STORAGE_KEY);
        if (serializedState === null) {
            return null;
        }
        return JSON.parse(serializedState);
    } catch (error) {
        console.error("Could not load selection state from localStorage", error);
        return null;
    }
};

// For Company Profile
export const saveCompanyProfile = (profile: CompanyProfile): void => {
    try {
        localStorage.setItem(COMPANY_PROFILE_KEY, JSON.stringify(profile));
    } catch (error) {
        console.error("Could not save company profile to localStorage", error);
    }
};

export const loadCompanyProfile = (): CompanyProfile => {
    try {
        const serializedProfile = localStorage.getItem(COMPANY_PROFILE_KEY);
        if (serializedProfile === null) {
            return { companyName: '', instagramUrl: '', facebookUrl: '', logo: '' };
        }
        return JSON.parse(serializedProfile);
    } catch (error) {
        console.error("Could not load company profile from localStorage", error);
        return { companyName: '', instagramUrl: '', facebookUrl: '', logo: '' };
    }
};

// For Backup/Restore
export const getAllDataAsObject = (): Record<string, string> => {
    const backupData: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('metaDashboard')) {
            const data = localStorage.getItem(key);
            if (data) {
                backupData[key] = data; // Store raw string value
            }
        }
    }
    return backupData;
};

export const exportAllData = () => {
    const backupData = getAllDataAsObject();
    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yangyu_dashboard_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const applyDataFromBackup = (jsonString: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        try {
            const importedData: Record<string, string> = JSON.parse(jsonString);
            if (typeof importedData !== 'object' || importedData === null) {
                 throw new Error('無效的備份檔案格式。');
            }

            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('metaDashboard')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));

            Object.keys(importedData).forEach(key => {
                localStorage.setItem(key, importedData[key]);
            });
            resolve();
        } catch (error) {
            reject(error);
        }
    });
};

export const importDataFromString = (jsonString: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        try {
            const importedData: Record<string, string> = JSON.parse(jsonString);

            // Removed strict check for DATA_SETS_STORAGE_KEY to allow restoring empty backups.
            if (typeof importedData !== 'object' || importedData === null) {
                 throw new Error('無效的備份檔案格式。');
            }

            if (window.confirm('確定要從備份檔案匯入資料嗎？這將會覆寫所有目前的資料，此操作無法復原。')) {
                const keysToRemove: string[] = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('metaDashboard')) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(key => localStorage.removeItem(key));

                Object.keys(importedData).forEach(key => {
                    localStorage.setItem(key, importedData[key]);
                });

                alert('資料匯入成功！頁面將會重新整理。');
                window.location.reload();
                resolve();
            } else {
                reject(new Error('使用者取消匯入。'));
            }
        } catch (error: any) {
            console.error('匯入備份失敗', error);
            alert(`匯入失敗：${error.message}`);
            reject(error);
        }
    });
};

export const importAllData = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const json = event.target?.result;
            if (typeof json !== 'string') {
                reject(new Error('File content is not a valid string.'));
                return;
            }
            importDataFromString(json).then(resolve).catch(reject);
        };
        reader.onerror = (error) => {
            alert('讀取檔案時發生錯誤。');
            reject(error);
        };
        reader.readAsText(file);
    });
};

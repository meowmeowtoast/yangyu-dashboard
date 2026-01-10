
import React, { useState, useEffect, useCallback, useMemo, useTransition } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import FileUpload from './components/FileUpload';
import DataManagementPage, { LocalDataManager } from './components/DataManagementPage';
import Footer from './components/Footer';
import type { DataSet, NormalizedPost, SelectionState, AnalysisData, ReadOnlyViewState, SharedData, UserData, WorkspaceUserDataV2 } from './types';
import { useAuth } from './components/AuthContext';
import * as KVStore from './utils/kvStore';
import { generateShortLink, generateLongLink, getViewIdFromUrl, decompressViewData } from './utils/sharing';
import { exportDataAsJson, importDataFromFile } from './utils/backup';


const WORKSPACE_ANALYSIS_DELIM = '::';

const createEmptyUserData = (companyName = ''): UserData => ({
    dataSets: [],
    selectionState: { enabledDataSetIds: {}, enabledPostPermalinks: {} },
    allMonthlyFollowerData: {},
    baseFollowerData: { fbBase: '', igBase: '' },
    companyProfile: { companyName, instagramUrl: '', facebookUrl: '', logo: '' }
});

const normalizeWorkspaceUserDataV2 = (data: any): WorkspaceUserDataV2 | null => {
    if (!data || typeof data !== 'object') return null;
    const versionOk = data.version === 2 || data.version === '2';
    if (!versionOk) return null;
    if (!data.clients || typeof data.clients !== 'object') return null;

    const clientsRaw = data.clients as Record<string, any>;
    const clientIds = Object.keys(clientsRaw);
    if (clientIds.length === 0) return null;

    const clients: WorkspaceUserDataV2['clients'] = {};
    for (const id of clientIds) {
        const raw = clientsRaw[id];
        if (!raw || typeof raw !== 'object') continue;
        const name = typeof raw.name === 'string' ? raw.name : '未命名客戶';
        const userData = raw.userData;
        if (!userData || typeof userData !== 'object') continue;
        clients[id] = { name, userData };
    }

    const cleanedIds = Object.keys(clients);
    if (cleanedIds.length === 0) return null;

    const requestedId = typeof data.currentClientId === 'string' ? data.currentClientId : '';
    const currentClientId = clients[requestedId] ? requestedId : cleanedIds[0];

    return {
        version: 2,
        currentClientId,
        clients,
    };
};

const createWorkspaceFromLegacy = (userData: UserData): WorkspaceUserDataV2 => {
    const defaultClientId = 'default';
    const inferredName = userData.companyProfile?.companyName?.trim() || '客戶 1';
    return {
        version: 2,
        currentClientId: defaultClientId,
        clients: {
            [defaultClientId]: {
                name: inferredName,
                userData,
            },
        },
    };
};


/**
 * A robust data sanitizer and validator.
 */
const sanitizeAndValidateData = (data: any | null): UserData | null => {
    if (!data) {
        console.error("Data is null or undefined");
        return null;
    }

    console.log("Raw data to sanitize:", data);

    let processingData: any = data;

    // --- Legacy Backup Support ---
    if (data['metaDashboardDataSets'] || data['metaDashboardCompanyProfile']) {
        console.log("Detected legacy backup format. Attempting to parse...");
        try {
            const parseJSONSafe = (key: string, defaultVal: any) => {
                const val = data[key];
                if (typeof val === 'string') {
                    try {
                        return JSON.parse(val);
                    } catch (e) {
                        console.warn(`Failed to parse legacy key ${key}:`, e);
                        return defaultVal;
                    }
                }
                return val || defaultVal;
            };

            processingData = {
                dataSets: parseJSONSafe('metaDashboardDataSets', []),
                selectionState: parseJSONSafe('metaDashboardSelectionState', { enabledDataSetIds: {}, enabledPostPermalinks: {} }),
                allMonthlyFollowerData: parseJSONSafe('metaDashboardMonthlyFollowers', {}),
                baseFollowerData: parseJSONSafe('metaDashboardBaseFollowers', { fbBase: '', igBase: '' }),
                companyProfile: parseJSONSafe('metaDashboardCompanyProfile', { companyName: '', instagramUrl: '', facebookUrl: '', logo: '' }),
            };
        } catch (e) {
            console.error("Critical error transforming legacy data:", e);
        }
    }
    // -----------------------------

    // Validate DataSets structure
    if (!Array.isArray(processingData.dataSets)) {
        console.warn("dataSets is not an array, initializing as empty.");
        processingData.dataSets = [];
    }

    const sanitizedDataSets = (processingData.dataSets || []).map((ds: any) => {
        const validPosts = (ds.posts || []).filter((post: any) => {
            // Check if publishTime exists. String dates from JSON need to be parseable.
            return post.publishTime && !isNaN(new Date(post.publishTime).getTime());
        });
        
        const postsWithDates = validPosts.map((p: any) => ({
            ...p,
            publishTime: new Date(p.publishTime)
        }));

        return {
            ...ds,
            posts: postsWithDates,
            filenames: ds.filenames || [], 
        };
    });

    const validatedData: UserData = {
        dataSets: sanitizedDataSets,
        selectionState: processingData.selectionState || { enabledDataSetIds: {}, enabledPostPermalinks: {} },
        allMonthlyFollowerData: processingData.allMonthlyFollowerData || {},
        baseFollowerData: processingData.baseFollowerData || { fbBase: '', igBase: '' },
        companyProfile: processingData.companyProfile || { companyName: '', instagramUrl: '', facebookUrl: '', logo: '' },
    };

    console.log("Sanitized Data:", validatedData);
    return validatedData;
};


const App: React.FC = () => {
    const { fbUser, isSignedIn } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [isRestoring, setIsRestoring] = useState(false);

    const [isClientSwitching, startClientSwitchTransition] = useTransition();

    const [workspace, setWorkspace] = useState<WorkspaceUserDataV2 | null>(null);
    
    // Main application state
    const [allUserData, setAllUserData] = useState<UserData>({
        dataSets: [],
        selectionState: { enabledDataSetIds: {}, enabledPostPermalinks: {} },
        allMonthlyFollowerData: {},
        baseFollowerData: { fbBase: '', igBase: '' },
        companyProfile: { companyName: '', instagramUrl: '', facebookUrl: '', logo: '' }
    });
    const [rawAnalyses, setRawAnalyses] = useState<Record<string, AnalysisData>>({});
    const [allAnalyses, setAllAnalyses] = useState<Record<string, AnalysisData>>({});
    
    const [currentView, setCurrentView] = useState<'dashboard' | 'dataManagement'>('dashboard');
    const [dateRangeLabel, setDateRangeLabel] = useState('');

    const [isDataManagementDirty, setIsDataManagementDirty] = useState(false);

    // Read-only state
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [readOnlyViewState, setReadOnlyViewState] = useState<ReadOnlyViewState | null>(null);
    const [readOnlyAnalysis, setReadOnlyAnalysis] = useState<AnalysisData | null>(null);

    // UI State
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

    // Deconstruct for easier access
    const { dataSets, selectionState, allMonthlyFollowerData, baseFollowerData, companyProfile } = allUserData;

    const currentClientId = workspace?.currentClientId;
    const currentClientName = currentClientId
        ? (workspace?.clients?.[currentClientId]?.name || '未命名客戶')
        : (companyProfile.companyName || '');

    useEffect(() => {
        if (!workspace) {
            setAllAnalyses(rawAnalyses || {});
            return;
        }

        const clientId = workspace.currentClientId;
        const prefix = `${clientId}${WORKSPACE_ANALYSIS_DELIM}`;
        const next: Record<string, AnalysisData> = {};
        for (const [k, v] of Object.entries(rawAnalyses || {})) {
            if (k.startsWith(prefix)) {
                next[k.slice(prefix.length)] = v;
            }
        }
        setAllAnalyses(next);
    }, [rawAnalyses, workspace]);

    useEffect(() => {
        if (!fbUser || isReadOnly) return;
        if (!workspace) return;
        const keys = Object.keys(rawAnalyses || {});
        if (keys.length === 0) return;

        const inferredClientIds = new Set<string>();
        for (const k of keys) {
            const idx = k.indexOf(WORKSPACE_ANALYSIS_DELIM);
            if (idx <= 0) continue;
            const clientId = k.slice(0, idx);
            if (clientId) inferredClientIds.add(clientId);
        }

        const missing = Array.from(inferredClientIds).filter(id => !workspace.clients?.[id]);
        if (missing.length === 0) return;

        const nextClients = { ...workspace.clients };
        for (const id of missing) {
            nextClients[id] = {
                name: `復原客戶 ${id}`,
                userData: createEmptyUserData(''),
            };
        }

        const nextWorkspace: WorkspaceUserDataV2 = {
            ...workspace,
            clients: nextClients,
            currentClientId: nextClients[workspace.currentClientId] ? workspace.currentClientId : Object.keys(nextClients)[0],
        };
        setWorkspace(nextWorkspace);
        void KVStore.setUserData(fbUser.uid, nextWorkspace);
    }, [fbUser, isReadOnly, rawAnalyses, workspace]);

    useEffect(() => {
        if (!fbUser || !workspace) return;

        const keys = Object.keys(rawAnalyses || {});
        if (keys.length === 0) return;

        const hasPrefixed = keys.some(k => k.includes(WORKSPACE_ANALYSIS_DELIM));
        const hasLegacy = keys.some(k => !k.includes(WORKSPACE_ANALYSIS_DELIM));
        if (!hasLegacy || hasPrefixed) return;

        const clientId = workspace.currentClientId;
        const prefixed: Record<string, AnalysisData> = {};
        for (const [k, v] of Object.entries(rawAnalyses)) {
            prefixed[`${clientId}${WORKSPACE_ANALYSIS_DELIM}${k}`] = v;
        }

        setRawAnalyses(prefixed);
        KVStore.setAnalyses(fbUser.uid, prefixed).catch(err => {
            console.error('Failed to migrate analyses to workspace format:', err);
        });
    }, [fbUser, rawAnalyses, workspace]);

    const updateStateAndPersist = useCallback(async (newUserData: Partial<UserData>, newAnalyses?: Record<string, AnalysisData>) => {
        if (isReadOnly) return;

        const nextActiveUserData = newUserData ? ({ ...allUserData, ...newUserData }) : allUserData;

        if (newUserData) {
            setAllUserData(nextActiveUserData);
        }
        if (newAnalyses) {
            setAllAnalyses(newAnalyses);
        }

        if (!fbUser || !newUserData) return;

        try {
            if (workspace) {
                const clientId = workspace.currentClientId;
                const currentClient = workspace.clients[clientId];
                const nextClientName = nextActiveUserData.companyProfile?.companyName?.trim() || currentClient.name;
                const nextWorkspace: WorkspaceUserDataV2 = {
                    ...workspace,
                    clients: {
                        ...workspace.clients,
                        [clientId]: {
                            ...currentClient,
                            name: nextClientName,
                            userData: nextActiveUserData,
                        },
                    },
                };
                setWorkspace(nextWorkspace);
                await KVStore.setUserData(fbUser.uid, nextWorkspace);
            } else {
                await KVStore.updateUserData(fbUser.uid, newUserData);
            }
        } catch (error) {
            console.error('Failed to persist user data:', error);
        }
    }, [allUserData, fbUser, isReadOnly, workspace]);


    // Initial check for read-only link or safe mode
    useEffect(() => {
        const initializeApp = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const hash = window.location.hash;

            if (urlParams.has('safe_mode')) {
                console.warn("SAFE MODE ACTIVATED. Skipping all data loading.");
                setIsLoading(false);
                return;
            }

            const viewId = getViewIdFromUrl();
            
            const loadSharedData = (sharedData: SharedData | null) => {
                if (!sharedData) {
                    alert('分享的檢視不存在或資料已損毀。');
                    return;
                }
                
                const restoredUserData = sanitizeAndValidateData(sharedData.allData as unknown as UserData);
                if (!restoredUserData) {
                    alert('分享的資料已損毀。');
                    return;
                }
        
                const allSharedPosts = restoredUserData.dataSets.flatMap(ds => ds.posts);
                const allSharedPermalinks = allSharedPosts.reduce((acc, post) => {
                    acc[post.permalink] = true;
                    return acc;
                }, {} as Record<string, boolean>);
        
                const allSharedDataSetIds = restoredUserData.dataSets.reduce((acc, ds) => {
                    acc[ds.id] = true;
                    return acc;
                }, {} as Record<string, boolean>);

                const forcedSelectionState: SelectionState = {
                    enabledDataSetIds: allSharedDataSetIds,
                    enabledPostPermalinks: allSharedPermalinks,
                };
                
                restoredUserData.selectionState = forcedSelectionState;

                setAllUserData(restoredUserData);
                setAllAnalyses(sharedData.analyses || {});
                setReadOnlyViewState(sharedData.viewState);
                setReadOnlyAnalysis(sharedData.analysis);
            };

            if (viewId) {
                setIsReadOnly(true);
                setIsLoading(true);
                try {
                    const compressedData = await KVStore.getSharedView(viewId);
                    if (compressedData) {
                        const sharedData = decompressViewData(compressedData);
                        loadSharedData(sharedData);
                    } else {
                        alert('分享的檢視不存在或已過期。');
                    }
                } catch (err) {
                    console.error("Failed to load shared view:", err);
                    alert('載入分享的檢視時發生錯誤。');
                } finally {
                    setIsLoading(false);
                }
            } else if (hash.startsWith('#/readonly/')) {
                setIsReadOnly(true);
                setIsLoading(true);
                try {
                    const compressedData = hash.substring('#/readonly/'.length);
                    const sharedData = decompressViewData(compressedData);
                    loadSharedData(sharedData);
                    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
                } catch (err) {
                     console.error("Failed to load shared view from hash:", err);
                     alert('載入分享的檢視時發生錯誤。');
                } finally {
                     setIsLoading(false);
                }
            }
        };

        initializeApp();
    }, []);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (isReadOnly || urlParams.has('safe_mode')) return;
        
        let unsubUserData: (() => void) | undefined;
        let unsubAnalyses: (() => void) | undefined;

        if (fbUser) { 
            setIsLoading(true);
            unsubUserData = KVStore.onUserDataSnapshot(fbUser.uid, (data) => {
                // If we are currently restoring, ignore realtime updates to prevent conflicts
                if (isRestoring) return;

                const normalizedWorkspace = normalizeWorkspaceUserDataV2(data);
                if (normalizedWorkspace) {
                    const clientId = normalizedWorkspace.currentClientId;
                    setWorkspace(normalizedWorkspace);

                    const clientUserData = normalizedWorkspace.clients?.[clientId]?.userData;
                    const sanitized = sanitizeAndValidateData(clientUserData);
                    if (sanitized) {
                        setAllUserData(sanitized);
                    } else {
                        console.warn('Workspace client userData failed to sanitize; keeping current state.');
                    }
                } else {
                    const sanitizedData = sanitizeAndValidateData(data as any);
                    if (sanitizedData) {
                        setAllUserData(sanitizedData);

                        // Auto-migrate legacy single-client state into workspace v2.
                        const nextWorkspace = createWorkspaceFromLegacy(sanitizedData);
                        setWorkspace(nextWorkspace);
                        KVStore.setUserData(fbUser.uid, nextWorkspace).catch(err => {
                            console.error('Failed to migrate userData to workspace format:', err);
                        });
                    } else {
                        console.warn('User data failed to sanitize. Not overwriting remote state to avoid data loss.');
                        const empty = createEmptyUserData('');
                        setAllUserData(empty);
                        setWorkspace(createWorkspaceFromLegacy(empty));
                    }
                }
                setIsLoading(false);
            });
            unsubAnalyses = KVStore.onAnalysesSnapshot(fbUser.uid, (analyses) => {
                if (isRestoring) return;
                setRawAnalyses(analyses);
            });
        } else if (isSignedIn === false) { 
            setIsLoading(false);
        }
        
        return () => {
            if (unsubUserData) unsubUserData();
            if (unsubAnalyses) unsubAnalyses();
        };
    }, [fbUser, isSignedIn, isReadOnly, isRestoring]);
    
    const persistAnalysis = useCallback((key: string, data: AnalysisData) => {
        if (isReadOnly || !fbUser) return;

        const clientId = workspace?.currentClientId;
        const kvKey = clientId ? `${clientId}${WORKSPACE_ANALYSIS_DELIM}${key}` : key;
        setRawAnalyses(prev => ({ ...prev, [kvKey]: data }));
        setAllAnalyses(prev => ({ ...prev, [key]: data }));
        KVStore.saveAnalysis(fbUser.uid, kvKey, data);
    }, [fbUser, isReadOnly, workspace]);

    const renameWorkspaceClient = useCallback(async (clientId: string, name: string) => {
        if (isReadOnly || !fbUser || !workspace) return;
        const trimmed = name.trim();
        if (!trimmed) return;
        if (!workspace.clients?.[clientId]) return;

        const currentClient = workspace.clients[clientId];
        const nextUserData: UserData = {
            ...(currentClient.userData || createEmptyUserData(trimmed)),
            companyProfile: {
                ...(currentClient.userData?.companyProfile || { companyName: '', instagramUrl: '', facebookUrl: '', logo: '' }),
                companyName: trimmed,
            },
        };

        const nextWorkspace: WorkspaceUserDataV2 = {
            ...workspace,
            clients: {
                ...workspace.clients,
                [clientId]: {
                    ...currentClient,
                    name: trimmed,
                    userData: nextUserData,
                },
            },
        };

        setWorkspace(nextWorkspace);
        if (workspace.currentClientId === clientId) {
            const sanitized = sanitizeAndValidateData(nextUserData) || createEmptyUserData(trimmed);
            setAllUserData(sanitized);
        }

        void KVStore.setUserData(fbUser.uid, nextWorkspace);
    }, [fbUser, isReadOnly, workspace]);

    const deleteWorkspaceClient = useCallback(async (clientId: string) => {
        if (isReadOnly || !fbUser || !workspace) return;
        if (!workspace.clients?.[clientId]) return;

        const clientIds = Object.keys(workspace.clients || {});
        if (clientIds.length <= 1) {
            alert('至少需要保留一個客戶，無法刪除最後一個客戶。');
            return;
        }

        const clientName = workspace.clients[clientId]?.name || '未命名客戶';
        const confirmText = window.prompt(
            `此操作將會刪除「${clientName}」的資料與分析（無法復原）。\n\n請輸入客戶名稱以確認刪除：`,
            ''
        );
        if (confirmText === null) return;
        if (confirmText.trim() !== clientName.trim()) {
            alert('輸入的名稱不符合，已取消刪除。');
            return;
        }

        const nextClients = { ...workspace.clients };
        delete nextClients[clientId];
        const nextCurrentClientId = workspace.currentClientId === clientId
            ? (Object.keys(nextClients)[0] || '')
            : workspace.currentClientId;

        const nextWorkspace: WorkspaceUserDataV2 = {
            ...workspace,
            currentClientId: nextCurrentClientId,
            clients: nextClients,
        };

        setWorkspace(nextWorkspace);
        if (nextCurrentClientId && nextClients[nextCurrentClientId]) {
            const clientUserData = nextClients[nextCurrentClientId].userData;
            const sanitized = sanitizeAndValidateData(clientUserData) || createEmptyUserData(nextClients[nextCurrentClientId].name || '');
            setAllUserData(sanitized);
        } else {
            setAllUserData(createEmptyUserData(''));
        }

        const prefix = `${clientId}${WORKSPACE_ANALYSIS_DELIM}`;
        const nextRaw = Object.fromEntries(
            Object.entries(rawAnalyses || {}).filter(([k]) => !k.startsWith(prefix))
        ) as Record<string, AnalysisData>;
        setRawAnalyses(nextRaw);

        await KVStore.setUserData(fbUser.uid, nextWorkspace);
        await KVStore.setAnalyses(fbUser.uid, nextRaw);
    }, [fbUser, isReadOnly, rawAnalyses, workspace]);

    const handleFilesProcessed = useCallback((processedFiles: { filename: string; posts: NormalizedPost[] }[]) => {
        const newDataSet: DataSet = {
            id: `ds-${Date.now()}-${Math.random()}`,
            name: processedFiles.map(f => f.filename).join(', '),
            uploadDate: new Date().toISOString(),
            posts: processedFiles.flatMap(f => f.posts),
            filenames: processedFiles.map(f => f.filename)
        };
        
        const updatedDataSets = [...dataSets, newDataSet];
        
        const newSelectionState: SelectionState = {
            enabledDataSetIds: {
                ...selectionState.enabledDataSetIds,
                [newDataSet.id]: true,
            },
            enabledPostPermalinks: { ...selectionState.enabledPostPermalinks },
        };
        
        newDataSet.posts.forEach(post => {
            newSelectionState.enabledPostPermalinks[post.permalink] = true;
        });

        updateStateAndPersist({ dataSets: updatedDataSets, selectionState: newSelectionState });
        setCurrentView('dashboard'); // Auto-switch to dashboard on new file
    }, [dataSets, selectionState, updateStateAndPersist]);


    const handleDeleteDataSet = (dataSetId: string) => {
        if (!window.confirm("確定要刪除這個資料集嗎？此操作無法復原。")) return;

        const updatedDataSets = dataSets.filter(ds => ds.id !== dataSetId);
        
        const updatedSelection = { ...selectionState };
        delete updatedSelection.enabledDataSetIds[dataSetId];
        const postsToRemove = dataSets.find(ds => ds.id === dataSetId)?.posts.map(p => p.permalink) || [];
        postsToRemove.forEach(permalink => {
            delete updatedSelection.enabledPostPermalinks[permalink];
        });

        updateStateAndPersist({ dataSets: updatedDataSets, selectionState: updatedSelection });
    };

    const handleClearAllData = async () => {
        if (!window.confirm("警告：這將會清除您雲端所有上傳的資料、設定與分析，且無法復原。確定要繼續嗎？")) return;

        const emptyData = createEmptyUserData('');
        
        setAllUserData(emptyData);
        setAllAnalyses({});
        setRawAnalyses({});

        if (!fbUser) return;

        try {
            if (workspace) {
                const clientId = workspace.currentClientId;
                const currentClient = workspace.clients[clientId];

                const nextWorkspace: WorkspaceUserDataV2 = {
                    ...workspace,
                    clients: {
                        ...workspace.clients,
                        [clientId]: {
                            ...currentClient,
                            userData: emptyData,
                        },
                    },
                };
                setWorkspace(nextWorkspace);
                await KVStore.setUserData(fbUser.uid, nextWorkspace);

                const prefix = `${clientId}${WORKSPACE_ANALYSIS_DELIM}`;
                const nextRaw = Object.fromEntries(
                    Object.entries(rawAnalyses || {}).filter(([k]) => !k.startsWith(prefix))
                ) as Record<string, AnalysisData>;
                setRawAnalyses(nextRaw);
                await KVStore.setAnalyses(fbUser.uid, nextRaw);
            } else {
                await KVStore.setUserData(fbUser.uid, emptyData);
                await KVStore.setAnalyses(fbUser.uid, {});
            }
        } catch (err) {
            console.error('Failed to clear data:', err);
        }
    };
    
     const handleClearDataByRange = (startDate: Date, endDate: Date) => {
        const start = startDate.getTime();
        const end = new Date(endDate).setHours(23, 59, 59, 999);
        
        if (!window.confirm(`確定要刪除從 ${startDate.toLocaleDateString()} 到 ${endDate.toLocaleDateString()} 之間的所有貼文嗎？`)) return;

        const updatedDataSets = dataSets.map(ds => ({
            ...ds,
            posts: ds.posts.filter(post => {
                const postTime = post.publishTime.getTime();
                return !(postTime >= start && postTime <= end);
            })
        })).filter(ds => ds.posts.length > 0);

        updateStateAndPersist({ dataSets: updatedDataSets });
        alert('指定範圍內的資料已清除。');
    };
    
    const getAllDataForBackup = (): UserData & { analyses: Record<string, AnalysisData> } => {
        return {
            ...allUserData,
            analyses: allAnalyses
        };
    };

    const restoreAllData = async (dataToRestore: any) => {
        // Confirmation is now handled by the UI components (LocalDataManager)
        // to prevent browser blocking issues and improve UX.
        
        setIsRestoring(true);
        console.log("Starting Restore Process. Data received:", dataToRestore ? "Object present" : "Null/Undefined");
        
        try {
            const restoredUserData = sanitizeAndValidateData(dataToRestore);
            let restoredAnalyses = dataToRestore.analyses || {};
            
            // Legacy handling for analyses
            if (!dataToRestore.analyses && typeof dataToRestore === 'object') {
                 Object.keys(dataToRestore).forEach(key => {
                     if (key.startsWith('metaDashboardAnalysis_')) {
                         const analysisId = key.replace('metaDashboardAnalysis_', '');
                         try {
                             const analysisContent = typeof dataToRestore[key] === 'string' 
                                ? JSON.parse(dataToRestore[key]) 
                                : dataToRestore[key];
                             if (analysisContent) {
                                 restoredAnalyses[analysisId] = analysisContent;
                             }
                         } catch (e) {
                             console.warn("Failed to parse legacy analysis", key, e);
                         }
                     }
                 });
            }

            if (restoredUserData) {
                // Update Local State Immediately
                setAllUserData(restoredUserData);
                setAllAnalyses(restoredAnalyses);
                if (workspace?.currentClientId) {
                    const prefix = `${workspace.currentClientId}${WORKSPACE_ANALYSIS_DELIM}`;
                    const nextRaw: Record<string, AnalysisData> = {
                        ...(rawAnalyses || {}),
                        ...Object.fromEntries(
                            Object.entries(restoredAnalyses).map(([k, v]) => [`${prefix}${k}`, v as AnalysisData])
                        ),
                    };
                    setRawAnalyses(nextRaw);
                } else {
                    setRawAnalyses(restoredAnalyses);
                }
                
                // Persist to Cloud/LocalStorage
                await updateStateAndPersist(restoredUserData);
                
                if(fbUser) {
                    const clientId = workspace?.currentClientId;
                    const analysisPromises = Object.entries(restoredAnalyses).map(([key, value]) => {
                        const kvKey = clientId ? `${clientId}${WORKSPACE_ANALYSIS_DELIM}${key}` : key;
                        return KVStore.saveAnalysis(fbUser.uid, kvKey, value as AnalysisData);
                    });
                    await Promise.all(analysisPromises);
                }
                
                // Feedback
                if (restoredUserData.dataSets.length === 0) {
                    alert('還原成功，但備份檔案中沒有發現任何貼文資料。');
                } else {
                    alert(`還原成功！已載入 ${restoredUserData.dataSets.length} 個資料集。`);
                    setCurrentView('dashboard'); // Force switch to dashboard
                }
            } else {
                console.error("Sanitization failed. Returned null.");
                alert('還原失敗：備份檔案格式不正確或資料已損毀。請檢查檔案內容。');
            }
        } catch (error: any) {
            console.error("Error during data restoration:", error);
            alert(`還原過程中發生錯誤: ${error.message}`);
        } finally {
            setIsRestoring(false);
        }
    };

    const handleShareRequest = async (viewState: ReadOnlyViewState, analysis: AnalysisData, postsForView: NormalizedPost[]): Promise<{link: string; isShort: boolean}> => {
        const minimalDataSet: DataSet = {
            id: 'shared-view-data',
            name: `Shared View - ${new Date().toISOString()}`,
            uploadDate: new Date().toISOString(),
            posts: postsForView,
            filenames: [],
        };

        const enabledPostPermalinks = postsForView.reduce((acc, post) => {
            acc[post.permalink] = true;
            return acc;
        }, {} as Record<string, boolean>);

        const minimalSelectionState: SelectionState = {
            enabledDataSetIds: { [minimalDataSet.id]: true },
            enabledPostPermalinks,
        };

        const minimalUserData: UserData = {
            dataSets: [minimalDataSet],
            selectionState: minimalSelectionState, 
            allMonthlyFollowerData: allMonthlyFollowerData,
            baseFollowerData: baseFollowerData,
            companyProfile: companyProfile,
        };

        const sharedData: SharedData = {
            allData: minimalUserData,
            analyses: allAnalyses,
            viewState,
            analysis,
        };

        try {
            const { url, id } = await generateShortLink(sharedData);
            if (!isReadOnly) {
                KVStore.recordSharedView({
                    id,
                    label: `${companyProfile.companyName || currentClientName || '分享檢視'}｜${new Date().toLocaleString()}`,
                    clientId: currentClientId || undefined,
                    clientName: currentClientName || undefined,
                }).catch((err) => {
                    console.warn('Failed to record shared view meta:', err);
                });
            }
            return { link: url, isShort: true };
        } catch (error: any) {
            console.warn('Short link error', error);
            const isPermissionError = error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'));

            if (isPermissionError) {
                try {
                    const longLink = generateLongLink(sharedData);
                    return { link: longLink, isShort: false };
                } catch (longLinkError) {
                    console.error('Fallback error:', longLinkError);
                    throw new Error('產生分享連結時發生未知錯誤。');
                }
            } else {
                 throw new Error('產生分享連結時發生錯誤，請稍後再試。');
            }
        }
    };
    
    const handleExportData = () => {
        exportDataAsJson(getAllDataForBackup());
    };

    const handleImportData = async (file: File) => {
        console.log("Handling import for file:", file.name);
        try {
            const data = await importDataFromFile(file);
            // Don't log full data to console to keep it clean, just length check or summary
            console.log(`File parsed. Keys: ${Object.keys(data).join(', ')}`);
            await restoreAllData(data);
        } catch(err: any) {
            console.error("Import failed:", err);
            alert(`匯入失敗: ${err.message}`);
        }
    };

    const enabledPosts = useMemo(() => {
        return dataSets
            .flatMap(ds => ds.posts)
            .filter(post => selectionState.enabledPostPermalinks[post.permalink] === true);
    }, [dataSets, selectionState]);

    const confirmDiscardIfDirty = useCallback((nextActionLabel: string) => {
        if (isReadOnly) return true;
        if (currentView !== 'dataManagement') return true;
        if (!isDataManagementDirty) return true;
        return window.confirm(`你有尚未儲存的變更。\n\n確定要${nextActionLabel}並放棄未儲存內容嗎？`);
    }, [currentView, isDataManagementDirty, isReadOnly]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (isReadOnly) return;
        if (currentView !== 'dataManagement') return;
        if (!isDataManagementDirty) return;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
            return '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [currentView, isDataManagementDirty, isReadOnly]);

    if (isLoading || isRestoring) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-zinc-50 dark:bg-zinc-900 gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zinc-500"></div>
                {isRestoring && <p className="text-zinc-600 dark:text-zinc-400 font-medium">正在還原資料，請稍候...</p>}
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950 flex font-inter">
            {isMobileNavOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-40 md:hidden"
                    onClick={() => setIsMobileNavOpen(false)}
                />
            )}
            <Sidebar 
                currentView={currentView}
                setView={(view) => {
                    if (view === currentView) return;
                    if (!confirmDiscardIfDirty('切換頁面')) return;
                    setIsDataManagementDirty(false);
                    setCurrentView(view);
                    setIsMobileNavOpen(false);
                }}
                isReadOnly={isReadOnly}
                isCollapsed={isSidebarCollapsed}
                toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                isMobileOpen={isMobileNavOpen}
                onCloseMobile={() => setIsMobileNavOpen(false)}
                workspaceClients={workspace ? Object.entries(workspace.clients).map(([id, c]) => ({ id, name: c.name })) : undefined}
                currentClientId={workspace?.currentClientId}
                currentClientName={workspace ? currentClientName : undefined}
                isClientSwitching={isClientSwitching}
                onChangeClient={workspace && !isReadOnly && fbUser ? (clientId) => {
                    if (!workspace.clients?.[clientId]) return;
                    if (!confirmDiscardIfDirty('切換客戶')) return;

                    const nextWorkspace: WorkspaceUserDataV2 = { ...workspace, currentClientId: clientId };
                    startClientSwitchTransition(() => {
                        setWorkspace(nextWorkspace);
                        const clientUserData = nextWorkspace.clients?.[clientId]?.userData;
                        const sanitized =
                            sanitizeAndValidateData(clientUserData) ||
                            createEmptyUserData(nextWorkspace.clients?.[clientId]?.name || '');
                        setAllUserData(sanitized);
                    });

                    setIsDataManagementDirty(false);

                    setIsMobileNavOpen(false);

                    void KVStore.setUserData(fbUser.uid, nextWorkspace);
                } : undefined}
                onAddClient={workspace && !isReadOnly && fbUser ? async (name) => {
                    const trimmed = name.trim();
                    if (!trimmed) return;
                    if (!confirmDiscardIfDirty('切換客戶')) return;

                    const newClientId = `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
                    const newClientUserData = createEmptyUserData(trimmed);

                    const nextWorkspace: WorkspaceUserDataV2 = {
                        ...workspace,
                        currentClientId: newClientId,
                        clients: {
                            ...workspace.clients,
                            [newClientId]: { name: trimmed, userData: newClientUserData },
                        },
                    };

                    startClientSwitchTransition(() => {
                        setWorkspace(nextWorkspace);
                        setAllUserData(newClientUserData);
                    });

                    setIsDataManagementDirty(false);
                    void KVStore.setUserData(fbUser.uid, nextWorkspace);
                } : undefined}
                onRenameClient={workspace && !isReadOnly && fbUser ? renameWorkspaceClient : undefined}
                onDeleteClient={workspace && !isReadOnly && fbUser ? async (clientId) => {
                    if (!confirmDiscardIfDirty('操作客戶')) return;
                    setIsDataManagementDirty(false);
                    await deleteWorkspaceClient(clientId);
                } : undefined}
            />
            
            <main 
                className={`flex-1 min-h-[100dvh] flex flex-col transition-all duration-300 ease-in-out px-4 sm:px-6 py-6 sm:py-8 ml-0 ${
                    isSidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[260px]'
                }`}
            >
                <div className="max-w-[1200px] mx-auto w-full flex-1 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* Top Bar / Breadcrumb context could go here */}
                    <div className="flex justify-between items-end mb-2">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                className="md:hidden p-2 -ml-2 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                                onClick={() => setIsMobileNavOpen(true)}
                                aria-label="開啟選單"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                            <div>
                                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                                    {currentView === 'dashboard' ? '儀表板總覽' : '資料集管理'}
                                </h2>
                                <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1 flex flex-wrap items-center gap-x-2">
                                    <span>{currentView === 'dashboard' ? '檢視您的社群成效與分析洞察' : '管理您的上傳檔案與基本設定'}</span>
                                    {(() => {
                                        const brand = (workspace ? currentClientName : (companyProfile.companyName || '')).trim();
                                        return brand ? <span>｜品牌：{brand}</span> : null;
                                    })()}
                                    {companyProfile?.facebookUrl?.trim() ? (
                                        <a
                                            href={companyProfile.facebookUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                                        >
                                            ｜FB
                                        </a>
                                    ) : null}
                                    {companyProfile?.instagramUrl?.trim() ? (
                                        <a
                                            href={companyProfile.instagramUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                                        >
                                            ｜IG
                                        </a>
                                    ) : null}
                                </p>
                            </div>
                        </div>
                    </div>

                    {currentView === 'dashboard' ? (
                        dataSets.length === 0 && !isReadOnly ? (
                            <div className="min-h-[60vh] flex flex-col justify-center items-center p-4">
                                <FileUpload onFilesProcessed={handleFilesProcessed} />
                                <div className="max-w-2xl mx-auto w-full mt-8">
                                    <LocalDataManager 
                                        onExportData={handleExportData}
                                        onImportData={handleImportData}
                                        onClearAllData={handleClearAllData}
                                        onClearDataByRange={handleClearDataByRange}
                                    />
                                </div>
                            </div>
                        ) : (
                            <Dashboard 
                                posts={enabledPosts}
                                allMonthlyFollowerData={allMonthlyFollowerData}
                                baseFollowerData={baseFollowerData}
                                isReadOnly={isReadOnly}
                                readOnlyViewState={readOnlyViewState}
                                readOnlyAnalysis={readOnlyAnalysis}
                                onDateRangeLabelChange={setDateRangeLabel}
                                allAnalyses={allAnalyses}
                                onSaveAnalysis={persistAnalysis}
                                onShareRequest={isReadOnly ? undefined : handleShareRequest}
                                clientId={currentClientId}
                            />
                        )
                    ) : (
                        <DataManagementPage 
                            dataSets={dataSets}
                            selectionState={selectionState}
                            onSelectionChange={(newState) => updateStateAndPersist({ selectionState: newState })}
                            onAddMoreFiles={handleFilesProcessed}
                            onClearAllData={handleClearAllData}
                            onClearDataByRange={handleClearDataByRange}
                            onDeleteDataSet={handleDeleteDataSet}
                            allMonthlyFollowerData={allMonthlyFollowerData}
                            onMonthlyFollowerDataUpdate={(newData) => updateStateAndPersist({ allMonthlyFollowerData: newData })}
                            baseFollowerData={baseFollowerData}
                            onBaseFollowerDataUpdate={(newData) => updateStateAndPersist({ baseFollowerData: newData })}
                            companyProfile={companyProfile}
                            onCompanyProfileUpdate={(newProfile) => updateStateAndPersist({ companyProfile: newProfile })}
                            onExportData={handleExportData}
                            onImportData={handleImportData}
                            onBackupRequest={getAllDataForBackup}
                            onRestoreRequest={restoreAllData}
                            clientId={currentClientId}
                            onDirtyChange={setIsDataManagementDirty}
                        />
                    )}
                </div>

                <div className="-mx-4 sm:-mx-6 mt-8">
                    <Footer />
                </div>
            </main>
        </div>
    );
};

export default App;

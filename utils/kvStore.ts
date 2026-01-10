import type { AnalysisData, UserData, WorkspaceUserDataV2 } from '../types';

export type KVUserData = UserData | WorkspaceUserDataV2;

import {
    loadDataSets,
    saveDataSets,
    loadSelectionState,
    saveSelectionState,
    loadAllMonthlyFollowerData,
    saveAllMonthlyFollowerData,
    loadBaseFollowerData,
    saveBaseFollowerData,
    loadCompanyProfile,
    saveCompanyProfile,
    loadAllAnalyses,
    saveAnalysis as saveAnalysisLS,
} from './localStorage';

const fetchJson = async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await fetch(input, init);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error((data as any)?.error || `Request failed (${res.status})`);
    }
    return data as any;
};

export const onUserDataSnapshot = (userId: string, callback: (data: KVUserData | null) => void) => {
    if (userId === 'local-guest-user') {
        const data: UserData = {
            dataSets: loadDataSets(),
            selectionState: loadSelectionState() || { enabledDataSetIds: {}, enabledPostPermalinks: {} },
            allMonthlyFollowerData: loadAllMonthlyFollowerData(),
            baseFollowerData: loadBaseFollowerData(),
            companyProfile: loadCompanyProfile(),
        };
        setTimeout(() => callback(data), 0);
        return () => {};
    }

    let cancelled = false;
    const poll = async () => {
        try {
            const data = await fetchJson('/api/state', { credentials: 'include' });
            if (cancelled) return;
            callback((data?.userData as KVUserData) ?? null);
        } catch {
            if (cancelled) return;
            callback(null);
        }
    };

    poll();
    const id = window.setInterval(poll, 5000);
    return () => {
        cancelled = true;
        window.clearInterval(id);
    };
};

export const updateUserData = async (userId: string, data: Partial<UserData>) => {
    if (userId === 'local-guest-user') {
        if (data.dataSets) saveDataSets(data.dataSets);
        if (data.selectionState) saveSelectionState(data.selectionState);
        if (data.allMonthlyFollowerData) saveAllMonthlyFollowerData(data.allMonthlyFollowerData);
        if (data.baseFollowerData) saveBaseFollowerData(data.baseFollowerData);
        if (data.companyProfile) saveCompanyProfile(data.companyProfile);
        return;
    }

    const current = await fetchJson('/api/state', { credentials: 'include' });
    const nextUserData = { ...(current?.userData ?? {}), ...(data as any) };

    await fetchJson('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userData: nextUserData }),
    });
};

export const setUserData = async (userId: string, userData: KVUserData) => {
    if (userId === 'local-guest-user') {
        // Local guest mode only supports the legacy single-client shape.
        const data = userData as Partial<UserData>;
        if (data.dataSets) saveDataSets(data.dataSets);
        if (data.selectionState) saveSelectionState(data.selectionState);
        if (data.allMonthlyFollowerData) saveAllMonthlyFollowerData(data.allMonthlyFollowerData);
        if (data.baseFollowerData) saveBaseFollowerData(data.baseFollowerData);
        if (data.companyProfile) saveCompanyProfile(data.companyProfile);
        return;
    }

    await fetchJson('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userData }),
    });
};

export const setAnalyses = async (userId: string, analyses: Record<string, AnalysisData>) => {
    if (userId === 'local-guest-user') {
        // Local guest analyses are already stored per-key; leave as-is.
        Object.entries(analyses || {}).forEach(([k, v]) => saveAnalysisLS(k, v));
        return;
    }

    await fetchJson('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ analyses }),
    });
};

export const clearAllUserDataForUser = async (userId: string) => {
    if (userId === 'local-guest-user') {
        saveDataSets([]);
        saveSelectionState({ enabledDataSetIds: {}, enabledPostPermalinks: {} });
        saveAllMonthlyFollowerData({});
        saveBaseFollowerData({ fbBase: '', igBase: '' });
        saveCompanyProfile({ companyName: '', instagramUrl: '', facebookUrl: '', logo: '' });
        return;
    }

    await fetchJson('/api/state', { method: 'DELETE', credentials: 'include' });
};

export const onAnalysesSnapshot = (userId: string, callback: (data: Record<string, AnalysisData>) => void) => {
    if (userId === 'local-guest-user') {
        const analyses = loadAllAnalyses();
        setTimeout(() => callback(analyses), 0);
        return () => {};
    }

    let cancelled = false;
    const poll = async () => {
        try {
            const data = await fetchJson('/api/state', { credentials: 'include' });
            if (cancelled) return;
            callback((data?.analyses as Record<string, AnalysisData>) ?? {});
        } catch {
            if (cancelled) return;
            callback({});
        }
    };

    poll();
    const id = window.setInterval(poll, 5000);
    return () => {
        cancelled = true;
        window.clearInterval(id);
    };
};

export const saveAnalysis = async (userId: string, key: string, data: AnalysisData) => {
    if (!key) return;
    if (userId === 'local-guest-user') {
        saveAnalysisLS(key, data);
        return;
    }

    await fetchJson('/api/analysis', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ key, data }),
    });
};

export const saveSharedView = async (data: string): Promise<string> => {
    const res = await fetchJson('/api/shared-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
    });
    return String(res.id);
};

export const getSharedView = async (id: string): Promise<string | null> => {
    try {
        const res = await fetch(`/api/shared-view?id=${encodeURIComponent(id)}`);
        if (res.status === 404) return null;
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return null;
        return typeof (data as any)?.data === 'string' ? (data as any).data : null;
    } catch {
        return null;
    }
};

export type SharedViewIndexItem = {
    id: string;
    label: string;
    clientId?: string;
    clientName?: string;
    createdAt: string;
    expiresAt: string;
};

export const recordSharedView = async (payload: { id: string; label?: string; clientId?: string; clientName?: string; }) => {
    await fetchJson('/api/shared-views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
    });
};

export const listSharedViews = async (): Promise<SharedViewIndexItem[]> => {
    const res = await fetchJson('/api/shared-views', { credentials: 'include' });
    return Array.isArray((res as any)?.items) ? ((res as any).items as SharedViewIndexItem[]) : [];
};

export const updateSharedViewLabel = async (id: string, label: string) => {
    await fetchJson('/api/shared-views', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, label }),
    });
};

export const deleteSharedView = async (id: string) => {
    await fetchJson(`/api/shared-views?id=${encodeURIComponent(id)}` as any, {
        method: 'DELETE',
        credentials: 'include',
    });
};

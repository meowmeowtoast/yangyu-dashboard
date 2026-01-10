import type { SharedData } from '../types';
import { saveSharedView } from './kvStore';

declare const LZString: any;

/**
 * Generates a long, self-contained fallback URL by compressing data into the hash.
 * This is used when short link generation via KV-backed short link storage fails.
 * @param data The data to be compressed into the URL.
 * @returns A full URL with data in the hash (e.g., .../#/readonly/...).
 */
export const generateLongLink = (data: SharedData): string => {
    if (typeof LZString === 'undefined') {
        throw new Error('lz-string library is not loaded.');
    }
    const jsonString = JSON.stringify(data);
    const compressed = LZString.compressToEncodedURIComponent(jsonString);
    const url = new URL(window.location.origin);
    url.hash = `/readonly/${compressed}`;
    return url.toString();
};

/**
 * Attempts to generate a short link by saving compressed data to KV.
 * This function will throw an error on failure, which should be caught to trigger fallback logic.
 * @param data The data to be saved and shared.
 * @returns A promise that resolves with the short URL (e.g., .../?view=...).
 */
export const generateShortLink = async (data: SharedData): Promise<{ url: string; id: string }> => {
    if (typeof LZString === 'undefined') {
        throw new Error('lz-string library is not loaded.');
    }

    const jsonString = JSON.stringify(data);
    const compressed = LZString.compressToEncodedURIComponent(jsonString);
    
    // Let the caller handle errors to implement fallback logic.
    const viewId = await saveSharedView(compressed);
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('view', viewId);
    return { url: url.toString(), id: viewId };
};

export const getViewIdFromUrl = (): string | null => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('view');
};

export const decompressViewData = (compressedData: string): SharedData | null => {
    try {
        if (typeof LZString === 'undefined') {
            throw new Error('lz-string library is not loaded.');
        }
        const jsonString = LZString.decompressFromEncodedURIComponent(compressedData);
        if (!jsonString) {
            throw new Error("Decompression failed or resulted in an empty string.");
        }
        const data = JSON.parse(jsonString) as SharedData;
         // Basic validation
        if (data && data.allData && data.viewState) {
            return data;
        }
        throw new Error("Parsed data is missing required fields.");
    } catch (error) {
        console.error("Failed to parse data from compressed string", error);
        return null;
    }
};
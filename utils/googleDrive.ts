import type { GoogleFile } from '../types';

// Google Drive / OAuth support intentionally removed.
// This project uses password login (HttpOnly JWT cookie) and Vercel KV for storage.

export const areGoogleServicesConfigured = (): boolean => false;

export const loadGapiAndGis = async (): Promise<{ gapi: never; google: never }> => {
    throw new Error('Google services are disabled');
};

export const initGapiClient = async (): Promise<never> => {
    throw new Error('Google services are disabled');
};

export const initGisClient = async (): Promise<never> => {
    throw new Error('Google services are disabled');
};

export const handleSignIn = (): never => {
    throw new Error('Google services are disabled');
};

export const handleSignOut = (): never => {
    throw new Error('Google services are disabled');
};

export const listBackupFiles = async (): Promise<GoogleFile[]> => {
    throw new Error('Google services are disabled');
};

export const uploadBackupFile = async (): Promise<never> => {
    throw new Error('Google services are disabled');
};

export const getBackupFileContent = async (): Promise<string> => {
    throw new Error('Google services are disabled');
};
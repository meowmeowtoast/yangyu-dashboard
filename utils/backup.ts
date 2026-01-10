
import type { UserData, AnalysisData } from '../types';

/**
 * Exports all application data as a JSON file for local backup.
 * @param data The complete application state to be backed up.
 */
export const exportDataAsJson = (data: UserData & { analyses: Record<string, AnalysisData> }) => {
    try {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `yangyu_dashboard_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Failed to export data", error);
        alert("匯出資料時發生錯誤。");
    }
};

/**
 * Imports application data from a local JSON file.
 * @param file The JSON file selected by the user.
 * @returns A promise that resolves with the parsed data object.
 */
export const importDataFromFile = (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const json = event.target?.result;
            if (typeof json !== 'string') {
                reject(new Error('檔案內容無法讀取或不是文字格式。'));
                return;
            }
            console.log(`Read file ${file.name}, size: ${json.length} chars.`);
            try {
                // Attempt to parse JSON
                const parsedData = JSON.parse(json);
                resolve(parsedData);
            } catch (error) {
                console.error("JSON Parse Error:", error);
                reject(new Error('無效的 JSON 備份檔案格式。請確認檔案未損毀。'));
            }
        };
        reader.onerror = (error) => {
            console.error("File Read Error:", error);
            reject(new Error('讀取檔案時發生系統錯誤。'));
        };
        reader.readAsText(file);
    });
};

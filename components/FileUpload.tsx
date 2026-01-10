import React, { useState, useCallback } from 'react';
import { processFiles } from '../utils/csvParser';
import type { NormalizedPost, DataSet } from '../types';

interface FileUploadProps {
    onFilesProcessed: (processedFiles: { filename: string; posts: NormalizedPost[] }[]) => void;
    isAddingMore?: boolean;
    existingDataSets?: DataSet[];
}

const FileUpload: React.FC<FileUploadProps> = ({ onFilesProcessed, isAddingMore = false, existingDataSets }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileProcessing = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        if (existingDataSets && existingDataSets.length > 0) {
            const allUploadedFilenames = new Set(existingDataSets.flatMap(ds => ds.filenames));
            const newFiles = Array.from(files);
            const duplicateFiles = newFiles.filter(f => allUploadedFilenames.has(f.name));

            if (duplicateFiles.length > 0) {
                const confirmation = window.confirm(
                    `偵測到以下檔案已有相同檔名，再次上傳可能會造成資料重複：\n\n- ${duplicateFiles.map(f => f.name).join('\n- ')}\n\n您確定要繼續嗎？`
                );
                if (!confirmation) {
                    return; 
                }
            }
        }

        setIsLoading(true);
        setError(null);
        const { processedFiles, errors } = await processFiles(Array.from(files));

        if (errors.length > 0) {
            setError(errors.join('\n'));
        }

        if (processedFiles.length > 0) {
            onFilesProcessed(processedFiles);
        }
        setIsLoading(false);
    }, [onFilesProcessed, existingDataSets]);

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        handleFileProcessing(e.dataTransfer.files);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFileProcessing(e.target.files);
    };

    const containerClasses = isAddingMore
        ? `border-2 border-dashed rounded-lg p-4 text-center transition-colors duration-300 ${
              isDragging ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/50' : 'border-gray-300 dark:border-slate-600 hover:border-emerald-400 dark:hover:border-emerald-500'
          }`
        : `bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border-4 border-dashed transition-colors duration-300 ${
              isDragging ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/50' : 'border-gray-200 dark:border-slate-700'
          }`;
          
    const welcomeContent = !isAddingMore && (
      <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">歡迎使用 秧語 Yangyu Studio</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2 max-w-xl mx-auto">
                    請上傳從 Facebook 或 Instagram 匯出的 CSV 格式成效報表，即可開始分析您的社群表現。
        </p>
      </div>
    );


    return (
        <div className={isAddingMore ? '' : 'max-w-3xl mx-auto mt-10'}>
            {welcomeContent}
            <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={containerClasses}
            >
                <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    multiple
                    accept=".csv"
                    onChange={handleFileSelect}
                />
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-48">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-emerald-500"></div>
                        <p className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-300">正在處理檔案...</p>
                    </div>
                ) : (
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center space-y-4 h-full p-6">
                        <UploadIcon />
                        <h2 className={`font-bold ${isAddingMore ? 'text-lg' : 'text-2xl'} text-slate-700 dark:text-slate-200`}>
                            {isAddingMore ? '點擊或拖放檔案以新增' : '拖放您的 CSV 檔案至此'}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400">{isAddingMore ? '您可以一次上傳多個檔案' : '或點擊此處選擇檔案'}</p>
                        {!isAddingMore && <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">支援 Facebook & Instagram 原生匯出報表</p>}
                    </label>
                )}
            </div>
            {error && <div className="mt-4 p-4 bg-red-100 text-red-700 border border-red-300 rounded-lg whitespace-pre-line dark:bg-red-900/50 dark:text-red-300 dark:border-red-700/50">{error}</div>}
        </div>
    );
};

const UploadIcon: React.FC = () => (
    <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
);

export default FileUpload;
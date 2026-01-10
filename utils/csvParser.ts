import type { NormalizedPost } from '../types';
import { parse as parseDate } from 'date-fns/parse';

declare const Papa: any;

const isFacebookCSV = (headers: string[]): boolean => {
    // Facebook exports reliably include page-specific columns.
    // IMPORTANT: Do NOT use '帳號名稱' for Facebook detection because Instagram exports also include it.
    const hasPageIdentity = headers.includes('粉絲專頁名稱') || headers.includes('粉絲專頁編號');
    const hasFbEngagementCols = headers.includes('心情數') || headers.includes('心情') || headers.includes('心情、留言和分享次數');
    return headers.includes('永久連結') && (hasPageIdentity || hasFbEngagementCols);
};

const isInstagramCSV = (headers: string[]): boolean => {
    return headers.includes('帳號用戶名稱') && headers.includes('按讚數');
};

const inferPlatformFromPermalink = (rows: any[]): 'Facebook' | 'Instagram' | null => {
    const firstLink = rows
        .map(r => String(r?.['永久連結'] || '').trim())
        .find(v => v.length > 0);

    if (!firstLink) return null;
    if (firstLink.includes('instagram.com')) return 'Instagram';
    if (firstLink.includes('facebook.com')) return 'Facebook';
    return null;
};

const parseMetaPublishTime = (raw: any): Date => {
    const value = String(raw ?? '').trim();
    if (!value) return new Date('');

    // 1) Try native parsing first (handles ISO strings).
    const native = new Date(value);
    if (!isNaN(native.getTime())) return native;

    // 2) Meta exports commonly look like: 12/05/2025 06:48 (MM/dd/yyyy HH:mm)
    // Be liberal with single-digit month/day/hour.
    const candidates = [
        'MM/dd/yyyy HH:mm',
        'M/d/yyyy H:mm',
        'MM/dd/yyyy H:mm',
        'M/d/yyyy HH:mm',
    ];
    for (const fmt of candidates) {
        const d = parseDate(value, fmt, new Date());
        if (!isNaN(d.getTime())) return d;
    }

    return new Date('');
};

const parseAndNormalize = (file: File): Promise<NormalizedPost[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results: any) => {
                const headers = results.meta.fields;
                if (!headers || headers.length === 0) {
                    return reject(new Error(`檔案 ${file.name} 沒有標頭或內容.`));
                }

                let platform: 'Facebook' | 'Instagram' | null = null;
                // Prefer Instagram detection first because IG exports can include ambiguous columns
                // (e.g., '帳號名稱' + '永久連結') that previously caused misclassification.
                if (isInstagramCSV(headers)) {
                    platform = 'Instagram';
                } else if (isFacebookCSV(headers)) {
                    platform = 'Facebook';
                } else {
                    platform = inferPlatformFromPermalink(results.data || []);
                }

                if (!platform) {
                    return reject(new Error(`無法識別檔案 ${file.name} 的平台類型. 請確認是否為 Facebook 或 Instagram 原生報表.`));
                }

                const normalizedData: NormalizedPost[] = results.data.map((row: any): NormalizedPost | null => {
                    try {
                        let likes = 0, comments = 0, shares = 0, saves = 0, impressions = 0, content = '';

                        if (platform === 'Facebook') {
                            // FIX: To support new unified Meta report formats, check for both old and new column names.
                            // Old format used '心情', '觀看次數'.
                            // New format uses '心情數', '按讚數', '瀏覽次數'.
                            // Correctly parse '心情數' (Reactions Count) as the primary source for likes.
                            likes = parseInt(row['心情數'], 10) || parseInt(row['心情'], 10) || parseInt(row['按讚數'], 10) || 0;
                            // Added '資料留言' as a fallback for comment counts.
                            comments = parseInt(row['留言'], 10) || parseInt(row['留言數'], 10) || parseInt(row['資料留言'], 10) || 0;
                            shares = parseInt(row['分享'], 10) || 0;
                            impressions = parseInt(row['觀看次數'], 10) || parseInt(row['瀏覽次數'], 10) || 0;
                            // New reports might unify columns, so check for 'saves' on FB too.
                            saves = parseInt(row['儲存次數'], 10) || 0;
                            content = row['說明'] || row['標題'] || '';
                        } else if (platform === 'Instagram') {
                            likes = parseInt(row['按讚數'], 10) || 0;
                            // IG story exports often use '回覆次數' instead of '留言數'.
                            comments = parseInt(row['留言數'], 10) || parseInt(row['回覆次數'], 10) || 0;
                            shares = parseInt(row['分享'], 10) || 0;
                            saves = parseInt(row['儲存次數'], 10) || 0;
                            impressions = parseInt(row['瀏覽次數'], 10) || 0;
                            // Stories frequently have empty description; fall back to post type for readability.
                            content = row['說明'] || row['標題'] || row['貼文類型'] || '';
                        }

                        const totalEngagement = likes + comments + shares + saves;
                        
                        const post: NormalizedPost = {
                            platform,
                            content: content,
                            publishTime: parseMetaPublishTime(row['發佈時間']),
                            reach: parseInt(row['觸及人數'], 10) || 0,
                            impressions: impressions,
                            likes: likes,
                            comments: comments,
                            shares: shares,
                            saves: saves,
                            postType: row['貼文類型'] || 'N/A',
                            permalink: row['永久連結'] || `unknown-${Date.now()}-${Math.random()}`,
                            totalEngagement: totalEngagement
                        };
                        
                        if (isNaN(post.publishTime.getTime()) || !post.permalink.startsWith('http')) {
                            // Skip rows that are not valid posts (e.g., summary rows or malformed data)
                            return null;
                        }
                        
                        return post;
                    } catch (e) {
                        console.error("Error processing row:", row, e);
                        return null;
                    }
                }).filter((p: NormalizedPost | null): p is NormalizedPost => p !== null);

                resolve(normalizedData);
            },
            error: (error: any) => {
                reject(new Error(`解析檔案 ${file.name} 時發生錯誤: ${error.message}`));
            }
        });
    });
};

export const processFiles = async (files: File[]): Promise<{ processedFiles: { filename: string; posts: NormalizedPost[] }[], errors: string[] }> => {
    const processedFiles: { filename: string; posts: NormalizedPost[] }[] = [];
    const errors: string[] = [];

    for (const file of files) {
        try {
            const posts = await parseAndNormalize(file);
             if (posts.length > 0) {
                processedFiles.push({ filename: file.name, posts });
            }
        } catch (error: any) {
            errors.push(error.message);
        }
    }

    return { processedFiles, errors };
};
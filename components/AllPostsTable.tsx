import React, { useState, useMemo } from 'react';
import type { NormalizedPost } from '../types';
import { format } from 'date-fns/format';

const daysOfWeek = ['日', '一', '二', '三', '四', '五', '六'];
const hoursOfDay = Array.from({ length: 24 }, (_, i) => i);

const PlatformIcon: React.FC<{ platform: 'Facebook' | 'Instagram' }> = ({ platform }) => {
    return platform === 'Facebook' ? (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 1024 1024"><path d="M880 112H144c-17.7 0-32 14.3-32 32v736c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V144c0-17.7-14.3-32-32-32zm-92.4 233.5h-63.9c-50.1 0-59.8 23.8-59.8 58.8v77.1h119.8l-15.6 122.7H648.3V912H514.9V604.6H422.3V481.9h92.6v-90.1c0-91.8 56.1-141.7 137.9-141.7 39.2 0 72.9 2.9 82.7 4.2v104.3z" fill="#0866FF"/></svg>
    ) : (
         <svg className="w-5 h-5 text-pink-500" fill="currentColor" viewBox="0 0 24 24">
             <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0 3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919 4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4s1.791-4 4-4 4 1.79 4 4-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44 1.441-.645 1.441-1.44c0-.795-.645-1.44-1.441-1.44z"/>
        </svg>
    );
};

const AllPostsTable: React.FC<{ data: NormalizedPost[]; onPostSelect: (post: NormalizedPost) => void; }> = ({ data, onPostSelect }) => {
    type PlatformFilter = 'All' | 'Facebook' | 'Instagram';
    const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('All');

    const filteredPosts = useMemo(() => {
        if (platformFilter === 'All') {
            return data;
        }
        return data.filter(post => post.platform === platformFilter);
    }, [data, platformFilter]);

    const platforms: PlatformFilter[] = ['All', 'Facebook', 'Instagram'];

    return (
        <div>
            <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4">
                {platforms.map((platform) => (
                    <button
                        key={platform}
                        onClick={() => setPlatformFilter(platform)}
                        className={`px-4 py-2 -mb-px text-sm font-semibold border-b-2 transition-colors duration-200 ${
                            platformFilter === platform
                                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-500 dark:border-emerald-500'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-500'
                        }`}
                    >
                        {platform === 'All' ? '全部平台' : platform}
                    </button>
                ))}
            </div>
            <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300 sticky top-0">
                        <tr>
                            <th scope="col" className="px-2 py-3 w-12">平台</th>
                            <th scope="col" className="px-2 py-3 w-32">發佈時間</th>
                            <th scope="col" className="px-2 py-3">內容</th>
                            <th scope="col" className="px-2 py-3 w-12 text-center">連結</th>
                            <th scope="col" className="px-2 py-3 text-right whitespace-nowrap">曝光</th>
                            <th scope="col" className="px-2 py-3 text-right whitespace-nowrap">觸及</th>
                            <th scope="col" className="px-2 py-3 text-right whitespace-nowrap">心情</th>
                            <th scope="col" className="px-2 py-3 text-right whitespace-nowrap">留言</th>
                            <th scope="col" className="px-2 py-3 text-right whitespace-nowrap">分享</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPosts.length > 0 ? filteredPosts.map((post) => (
                            <tr key={post.permalink} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td className="px-2 py-2 align-top"><PlatformIcon platform={post.platform} /></td>
                                <td className="px-2 py-2 align-top whitespace-nowrap">{format(post.publishTime, 'yyyy/MM/dd HH:mm')}</td>
                                <td 
                                    className="px-2 py-2 text-slate-800 dark:text-slate-200 cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-500 max-w-[15ch] sm:max-w-sm lg:max-w-lg xl:max-w-xl truncate" 
                                    title="點擊查看完整內容"
                                    onClick={() => onPostSelect(post)}
                                >
                                    {post.content}
                                </td>
                                <td className="px-2 py-2 text-center align-top">
                                    <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-700">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mx-auto" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                                        </svg>
                                    </a>
                                </td>
                                <td className="px-2 py-2 text-right align-top whitespace-nowrap">{post.impressions.toLocaleString()}</td>
                                <td className="px-2 py-2 text-right align-top whitespace-nowrap">{post.reach.toLocaleString()}</td>
                                <td className="px-2 py-2 text-right align-top whitespace-nowrap">{post.likes.toLocaleString()}</td>
                                <td className="px-2 py-2 text-right align-top whitespace-nowrap">{post.comments.toLocaleString()}</td>
                                <td className="px-2 py-2 text-right align-top whitespace-nowrap">{post.shares.toLocaleString()}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={9} className="text-center py-8 text-slate-500 dark:text-slate-400">沒有可顯示的貼文</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AllPostsTable;
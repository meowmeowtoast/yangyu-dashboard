import React, { useMemo, useState } from 'react';
import type { NormalizedPost } from '../types';
import { format } from 'date-fns/format';

type SortByKey = 'totalEngagement' | 'reach' | 'impressions' | 'likes' | 'comments' | 'shares';

const sortOptions: Record<SortByKey, string> = {
    totalEngagement: '互動數',
    reach: '觸及數',
    impressions: '曝光數',
    likes: '心情',
    comments: '留言',
    shares: '分享',
};

interface TopPostsTableProps {
    data: NormalizedPost[];
    onPostSelect: (post: NormalizedPost) => void;
}


const TopPostsTable: React.FC<TopPostsTableProps> = ({ data, onPostSelect }) => {
    const [sortBy, setSortBy] = useState<SortByKey>('totalEngagement');
    
    const { topFbPosts, topIgPosts } = useMemo(() => {
        const sortedData = [...data].sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));
        
        const topFbPosts = sortedData
            .filter(post => post.platform === 'Facebook')
            .slice(0, 3);
            
        const topIgPosts = sortedData
            .filter(post => post.platform === 'Instagram')
            .slice(0, 3);
            
        return { topFbPosts, topIgPosts };
    }, [data, sortBy]);

    const PlatformIcon: React.FC<{ platform: 'Facebook' | 'Instagram' }> = ({ platform }) => {
        return platform === 'Facebook' ? (
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06c0 5.06 3.66 9.21 8.44 9.94v-7.03H7.9v-2.91h2.54V9.82c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.91h-2.33v7.03c4.78-.73 8.44-4.88 8.44-9.94C22 6.53 17.5 2.04 12 2.04z" />
            </svg>
        ) : (
             <svg className="w-5 h-5 text-pink-500" fill="currentColor" viewBox="0 0 24 24">
                 <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0 3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919 4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4s1.791-4 4-4 4 1.79 4 4-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44 1.441-.645 1.441-1.44c0-.795-.645-1.44-1.441-1.44z"/>
            </svg>
        );
    };

    const PostsList: React.FC<{posts: NormalizedPost[]}> = ({ posts }) => (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
                 <tbody>
                    {posts.map((post) => (
                        <tr key={post.permalink} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer" onClick={() => onPostSelect(post)}>
                            <td className="px-2 py-2 w-8"><PlatformIcon platform={post.platform} /></td>
                            <td className="px-2 py-2">
                                <span className="text-gray-800 dark:text-slate-200" title={post.content}>
                                    {post.content.substring(0, 50)}{post.content.length > 50 && '...'}
                                </span>
                                <div className="text-xs text-gray-400 dark:text-slate-500">{format(post.publishTime, 'yyyy/MM/dd HH:mm')}</div>
                            </td>
                            <td className="px-2 py-2 font-bold text-gray-900 dark:text-slate-100 text-right w-24">{(post[sortBy] || 0).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div>
             <div className="flex items-center justify-end mb-4">
                 <div className="flex items-center text-sm">
                    <label htmlFor="sort-by-select" className="text-gray-600 dark:text-slate-400 font-medium mr-2">排行依據:</label>
                    <select
                        id="sort-by-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortByKey)}
                        className="block pl-3 pr-8 py-1.5 text-base border-gray-300 bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                        {Object.entries(sortOptions).map(([key, value]) => (
                            <option key={key} value={key}>{value}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="space-y-6">
                <div>
                    <h4 className="text-md font-semibold text-gray-700 dark:text-slate-300 mb-2">Facebook 熱門貼文 Top 3</h4>
                    {topFbPosts.length > 0 ? (
                        <PostsList posts={topFbPosts} />
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-slate-400 px-2 py-4">沒有可顯示的 Facebook 貼文</p>
                    )}
                </div>
                <div>
                    <h4 className="text-md font-semibold text-gray-700 dark:text-slate-300 mb-2">Instagram 熱門貼文 Top 3</h4>
                     {topIgPosts.length > 0 ? (
                        <PostsList posts={topIgPosts} />
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-slate-400 px-2 py-4">沒有可顯示的 Instagram 貼文</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TopPostsTable;
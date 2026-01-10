
import React from 'react';
import type { CompanyProfile } from '../types';

type View = 'dashboard' | 'dataManagement';

interface HeaderProps {
    currentView: View;
    setView: (view: View) => void;
    profile: CompanyProfile;
    isReadOnly: boolean;
    dateRangeLabel: string;
}

const SocialLink: React.FC<{ platform: 'Facebook' | 'Instagram'; url: string }> = ({ platform, url }) => {
    if (!url) return null;
    
    const Icon = platform === 'Facebook' ? (
        <svg className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06c0 5.06 3.66 9.21 8.44 9.94v-7.03H7.9v-2.91h2.54V9.82c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.91h-2.33v7.03c4.78-.73 8.44-4.88 8.44-9.94C22 6.53 17.5 2.04 12 2.04z" />
        </svg>
    ) : (
         <svg className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-pink-500" fill="currentColor" viewBox="0 0 24 24">
             <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0 3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919 4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4s1.791-4 4-4 4 1.79 4 4-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44 1.441-.645 1.441-1.44c0-.795-.645-1.44-1.441-1.44z"/>
        </svg>
    );

    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    
    return (
        <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 group transition-colors">
            {Icon}
        </a>
    );
};

const Header: React.FC<HeaderProps> = ({ currentView, setView, profile, isReadOnly, dateRangeLabel }) => {
    const NavButton: React.FC<{ view: View; title: string; isDisabled?: boolean; onClick?: () => void; }> = ({ view, title, isDisabled = false, onClick }) => {
        const effectiveOnClick = onClick || (() => setView(view));

        return (
            <button
                onClick={effectiveOnClick}
                disabled={isDisabled}
                className={`px-4 py-2 font-semibold text-sm rounded-md transition-colors duration-200 ${
                    isDisabled
                        ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed'
                        : currentView === view
                            ? 'bg-emerald-100 text-emerald-700 shadow-inner dark:bg-emerald-900/50 dark:text-emerald-400'
                            : 'text-slate-600 hover:bg-emerald-50 dark:text-slate-300 dark:hover:bg-emerald-900/30'
                }`}
            >
                {title}
            </button>
        );
    };

    const handleDataManagementClick = () => {
        if (isReadOnly) {
            alert('唯讀模式下無法存取資料管理功能。');
        } else {
            setView('dataManagement');
        }
    };
    
    return (
        <header className="bg-white dark:bg-slate-900 shadow-sm dark:border-b dark:border-slate-800 sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row justify-between items-center py-4 gap-y-4 gap-x-4">
                    <div className="flex items-center justify-center sm:justify-start space-x-3 w-full sm:w-auto sm:flex-1 min-w-0">
                        {profile.logo ? (
                            <img src={profile.logo} alt="Custom Logo" className="h-9 w-auto flex-shrink-0" />
                        ) : (
                             <span className="text-2xl font-bold text-emerald-600 tracking-wider flex-shrink-0">YANGYU</span>
                        )}
                       
                        <div className="flex items-center space-x-2 border-l border-slate-200 dark:border-slate-700 pl-3 min-w-0">
                             <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-200 break-words" title={profile.companyName || '秧語社群儀表板'}>{profile.companyName || '秧語社群儀表板'}</h1>
                             <div className="hidden sm:flex items-center">
                                 <SocialLink platform="Facebook" url={profile.facebookUrl} />
                                 <SocialLink platform="Instagram" url={profile.instagramUrl} />
                             </div>
                        </div>
                    </div>
                    <div className="flex items-center flex-wrap justify-center sm:justify-end gap-2 w-full sm:w-auto">
                        <nav className="flex items-center flex-wrap justify-end gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 flex-shrink-0">
                             {isReadOnly && dateRangeLabel && (
                                <div className="flex items-center gap-2 pl-3 pr-1 py-1 bg-sky-100 dark:bg-sky-900/50 rounded-full text-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-sky-600 dark:text-sky-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                    </svg>
                                    <span className="font-semibold text-sky-800 dark:text-sky-300 hidden sm:inline">檢視模式</span>
                                    <span className="text-sky-700 dark:text-sky-300 font-medium bg-white/60 dark:bg-slate-900/50 rounded-full px-2 py-0.5">{dateRangeLabel}</span>
                                </div>
                            )}
                            <NavButton view="dashboard" title="儀表板" />
                            <NavButton 
                                view="dataManagement" 
                                title="資料管理" 
                                isDisabled={isReadOnly}
                                onClick={handleDataManagementClick}
                            />
                        </nav>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;

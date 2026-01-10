
import React, { useEffect } from 'react';
import App from '../App';
import ReportPage from './ReportPage';
import { AuthProvider } from './AuthContext';
import { getViewIdFromUrl } from '../utils/sharing';
import LoginPage from './LoginPage';
import { useAuth } from './AuthContext';

const GuardInner: React.FC = () => {
    const isDevMode = sessionStorage.getItem('devMode') === 'true';
    const { isApiReady, isSignedIn } = useAuth();

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toUpperCase() === 'D') {
                event.preventDefault();
                const isCurrentlyDev = sessionStorage.getItem('devMode') === 'true';
                
                if (isCurrentlyDev) {
                    sessionStorage.removeItem('devMode');
                    alert('開發者模式已關閉。頁面將會重新整理。');
                } else {
                    sessionStorage.setItem('devMode', 'true');
                    alert('開發者模式已啟用。頁面將會重新整理。');
                }
                window.location.reload();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const renderContent = () => {
        const hash = window.location.hash;
        const viewId = getViewIdFromUrl();
        const hasLongLink = hash.startsWith('#/readonly/');

        // Read-only shared views should remain accessible without login.
        if (viewId || hasLongLink) return <App />;

        // 報表頁面也需要登入（避免公開曝露）
        if (hash === '#report') {
            if (!isApiReady) return <div className="p-8">載入中…</div>;
            return isSignedIn ? <ReportPage /> : <LoginPage />;
        }

        if (!isApiReady) return <div className="p-8">載入中…</div>;
        return isSignedIn ? <App /> : <LoginPage />;
    };

    return (
        <>{renderContent()}</>
    );
};

const AuthGuard: React.FC = () => {
    return (
        <AuthProvider>
            <GuardInner />
        </AuthProvider>
    );
};

export default AuthGuard;

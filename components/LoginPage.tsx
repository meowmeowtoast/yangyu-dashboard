import React, { useState, useEffect } from 'react';
import App from '../App';
import Footer from './Footer';
import { useAuth } from './AuthContext';

type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated' | 'unauthorized' | 'error';

const LoginPage: React.FC = () => {
    const { isApiReady, isSignedIn, error: authError, signIn } = useAuth();
    const [status, setStatus] = useState<AuthStatus>('loading');
    const [error, setError] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isApiReady) {
            setStatus('loading');
            return;
        }

        if (authError) {
            setStatus('error');
            setError(`登入服務發生錯誤: ${authError}`);
            return;
        }
        
        if (isSignedIn) {
            setStatus('authenticated');
        } else {
            setStatus('unauthenticated');
        }

    }, [isSignedIn, isApiReady, authError]);

    const handleLogin = async () => {
        if (!password.trim()) {
            setError('請輸入密碼');
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            await signIn(password.trim());
        } catch (err: any) {
            setError(err?.message || '登入失敗');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (status === 'authenticated') {
        return <App />;
    }
    
    return (
        <div className="flex flex-col min-h-[100dvh] bg-slate-100 dark:bg-slate-900">
            <main className="flex-grow flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg text-center">
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">秧語社群儀表板</h1>
                    <p className="text-slate-600 dark:text-slate-400">請登入以繼續</p>
                    
                    {status === 'loading' && (
                        <div className="flex justify-center items-center py-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
                            <span className="ml-4 text-slate-500 dark:text-slate-400">
                                正在載入...
                            </span>
                        </div>
                    )}
                    
                    {status === 'unauthenticated' && (
                        <div className="space-y-3">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleLogin();
                                }}
                                placeholder="輸入密碼"
                                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <button
                                onClick={handleLogin}
                                disabled={isSubmitting}
                                className="w-full px-4 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSubmitting ? '登入中…' : '登入'}
                            </button>
                        </div>
                    )}

                    {(status === 'unauthorized' || status === 'error') && (
                        <div className="p-4 bg-red-100 text-red-700 border border-red-200 rounded-lg dark:bg-red-900/50 dark:text-red-300 dark:border-red-700/50">
                            <h3 className="font-bold">{status === 'unauthorized' ? '權限不足' : '發生錯誤'}</h3>
                            <p className="text-sm">{error || '發生未知錯誤'}</p>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default LoginPage;
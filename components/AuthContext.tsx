import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';

interface UserProfile {
    uid: string;
    name: string;
    email: string;
    imageUrl: string;
}

interface AuthContextType {
    isApiReady: boolean;
    isSignedIn: boolean;
    userProfile: UserProfile | null;
    error: string | null;
    signIn: (password: string) => Promise<void>;
    signOut: () => Promise<void>;
    fbUser: any | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isApiReady, setIsApiReady] = useState(false);
    const [status, setStatus] = useState<AuthStatus>('loading');
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [fbUser, setFbUser] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const check = async () => {
            try {
                const res = await fetch('/api/auth/me', { credentials: 'include' });
                const data = await res.json().catch(() => ({}));
                if (!mounted) return;

                if (res.ok && data?.authenticated) {
                    setStatus('authenticated');
                    setUserProfile({ uid: 'user', name: 'Yangyu', email: '—', imageUrl: '' });
                    setFbUser({ uid: 'user' });
                } else {
                    setStatus('unauthenticated');
                    setUserProfile(null);
                    setFbUser(null);
                }
            } catch (err: any) {
                if (!mounted) return;
                setStatus('unauthenticated');
                setUserProfile(null);
                setFbUser(null);
            } finally {
                if (!mounted) return;
                setIsApiReady(true);
            }
        };

        check();
        return () => {
            mounted = false;
        };
    }, []);

    const signIn = async (password: string) => {
        setError(null);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ password }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.error || '登入失敗');
            }

            setStatus('authenticated');
            setUserProfile({ uid: 'user', name: 'Yangyu', email: '—', imageUrl: '' });
            setFbUser({ uid: 'user' });
        } catch (err: any) {
            setStatus('unauthenticated');
            setUserProfile(null);
            setFbUser(null);
            setError(err?.message || '登入失敗');
            throw err;
        }
    };

    const signOut = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        } finally {
            setStatus('unauthenticated');
            setUserProfile(null);
            setFbUser(null);
        }
    };

    const value = {
        isApiReady,
        isSignedIn: status === 'authenticated',
        userProfile,
        error,
        signIn,
        signOut,
        fbUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

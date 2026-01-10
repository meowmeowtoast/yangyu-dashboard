import React from 'react';
import ReactDOM from 'react-dom/client';
import AuthGuard from './components/AuthGuard';

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null, errorInfo: null };
  declare props: Readonly<ErrorBoundaryProps>;

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      const showDebug = typeof window !== 'undefined' && window.location.search.includes('debug=1');
      return (
        <div className="p-8 text-center min-h-screen flex flex-col items-center justify-center bg-red-50 dark:bg-slate-900">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg max-w-lg w-full text-left">
            <h1 className="text-2xl font-bold text-red-600 mb-2 text-center">發生錯誤</h1>
            <p className="text-slate-600 dark:text-slate-300 mb-4 text-center">應用程式發生未預期的錯誤。</p>
            <pre className="text-xs bg-slate-100 dark:bg-slate-900 dark:text-slate-300 p-4 rounded overflow-auto mb-6 border border-red-200">
              {this.state.error?.message}
            </pre>
            {showDebug && this.state.errorInfo?.componentStack && (
              <pre className="text-[10px] bg-slate-100 dark:bg-slate-900 dark:text-slate-300 p-4 rounded overflow-auto mb-6 border border-slate-200 dark:border-slate-700">
                {this.state.errorInfo.componentStack}
              </pre>
            )}
            <div className="flex justify-center">
                <button 
                    onClick={() => window.location.reload()} 
                    className="px-6 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                >
                    重新整理頁面
                </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

const handleEmergencyReset = async () => {
    if (!window.confirm("警告：此操作將會清除您所有的雲端資料，且無法復原。這只應在應用程式完全無法載入時使用。您確定要繼續嗎？")) {
        return;
    }
    try {
    await fetch('/api/state', { method: 'DELETE', credentials: 'include' });
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        window.location.href = window.location.origin;
    } catch (error) {
        console.error("Emergency reset failed:", error);
        alert("重置失敗，請手動清除瀏覽器快取後再試。");
    }
};

const renderErrorFallback = (error: Error) => {
    root.render(
      <div className="p-8 text-center bg-red-50 dark:bg-slate-900 text-red-700 dark:text-red-300 min-h-screen flex flex-col items-center justify-center">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg border border-red-200 dark:border-red-800">
            <h1 className="text-2xl font-bold">應用程式初始化失敗</h1>
            <p className="mt-2">無法連接至後端服務或載入資料時發生嚴重錯誤。</p>
            <pre className="text-xs mt-4 p-2 bg-slate-100 dark:bg-slate-700 rounded text-left">{error.message}</pre>
            <div className="mt-6">
                <p className="text-sm text-slate-600 dark:text-slate-400">如果問題持續發生，可能是您的雲端資料已損毀。您可以嘗試清除所有雲端資料並重新開始。</p>
                <button 
                    onClick={handleEmergencyReset}
                    className="mt-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                >
                    清除我的雲端資料並重試
                </button>
            </div>
        </div>
      </div>
    );
};

root.render(
  <React.StrictMode>
    <ErrorBoundary>
        <AuthGuard />
    </ErrorBoundary>
  </React.StrictMode>
);
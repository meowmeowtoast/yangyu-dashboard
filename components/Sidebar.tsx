
import React, { useState } from 'react';

type View = 'dashboard' | 'dataManagement';

interface SidebarProps {
    currentView: View;
    setView: (view: View) => void;
    isReadOnly: boolean;
    isCollapsed: boolean;
    toggleCollapse: () => void;

    workspaceClients?: Array<{ id: string; name: string }>;
    currentClientId?: string;
    currentClientName?: string;
    onChangeClient?: (clientId: string) => void | Promise<void>;
    onAddClient?: (name: string) => void | Promise<void>;
    onRenameClient?: (clientId: string, name: string) => void | Promise<void>;
    onDeleteClient?: (clientId: string) => void | Promise<void>;
    isClientSwitching?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
    currentView, 
    setView, 
    isReadOnly, 
    isCollapsed, 
    toggleCollapse,
    workspaceClients,
    currentClientId,
    currentClientName,
    onChangeClient,
    onAddClient,
    onRenameClient,
    onDeleteClient,
    isClientSwitching,
}) => {
    const [isAddingClient, setIsAddingClient] = useState(false);
    const [newClientName, setNewClientName] = useState('');
    const [editingClientId, setEditingClientId] = useState<string | null>(null);
    const [editingClientName, setEditingClientName] = useState('');

    const activeItemClass = 'text-zinc-900 bg-zinc-200/50 dark:bg-zinc-800 dark:text-zinc-100';

    const hoverItemClass = 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200';

    const MenuItem: React.FC<{ 
        view: View; 
        label: string; 
        icon: React.ReactNode; 
        disabled?: boolean;
    }> = ({ view, label, icon, disabled }) => (
        <button
            onClick={() => !disabled && setView(view)}
            disabled={disabled}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                disabled ? 'opacity-50 cursor-not-allowed text-zinc-400' :
                currentView === view ? activeItemClass : hoverItemClass
            }`}
            title={isCollapsed ? label : undefined}
        >
            <span className="flex-shrink-0">{icon}</span>
            {!isCollapsed && <span className="truncate">{label}</span>}
        </button>
    );

    return (
        <aside 
            className={`flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur-xl h-screen transition-all duration-300 ease-in-out fixed left-0 top-0 z-50 ${
                isCollapsed ? 'w-[72px]' : 'w-[260px]'
            }`}
        >
            {/* Header / Brand */}
            <div className={`flex items-center h-14 px-4 border-b border-zinc-200/50 dark:border-zinc-800/50 ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
                <div className={`flex items-center gap-2 overflow-hidden transition-all ${isCollapsed ? 'w-8' : 'w-full'}`}>
                    <div className="w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center text-xs font-bold text-white bg-zinc-600">
                        Y
                    </div>
                    {!isCollapsed && (
                        <span className="font-semibold text-zinc-800 dark:text-zinc-100 truncate text-sm">
                            Yangyu 社群儀表板
                        </span>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <nav className="p-3 space-y-1">
                    <MenuItem 
                        view="dashboard" 
                        label="儀表板" 
                        icon={
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                        } 
                    />
                    <MenuItem 
                        view="dataManagement" 
                        label="資料管理" 
                        disabled={isReadOnly}
                        icon={
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                            </svg>
                        } 
                    />
                </nav>

                {workspaceClients && workspaceClients.length > 0 && (
                    <div className="flex-1 overflow-hidden border-t border-zinc-200/50 dark:border-zinc-800/50">
                        <div className="p-3 pb-2 flex items-center justify-between">
                            {!isCollapsed ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">客戶</span>
                                    {isClientSwitching && (
                                        <span className="text-xs text-zinc-400 dark:text-zinc-500">載入中...</span>
                                    )}
                                </div>
                            ) : (
                                <div className="w-full flex justify-center">
                                    <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400" title="客戶">客</span>
                                </div>
                            )}

                            {!isCollapsed && !isReadOnly && !isAddingClient && onAddClient && (
                                <button
                                    type="button"
                                    onClick={() => setIsAddingClient(true)}
                                    className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                                >
                                    新增客戶
                                </button>
                            )}
                        </div>

                        {!isCollapsed && isAddingClient && onAddClient && !isReadOnly && (
                            <div className="px-3 pb-3">
                                <form
                                    className="space-y-2"
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        const trimmed = newClientName.trim();
                                        if (!trimmed) return;
                                        await onAddClient(trimmed);
                                        setNewClientName('');
                                        setIsAddingClient(false);
                                    }}
                                >
                                    <input
                                        value={newClientName}
                                        onChange={(e) => setNewClientName(e.target.value)}
                                        placeholder="輸入客戶名稱"
                                        className="w-full px-3 py-2 rounded-lg text-sm bg-white border border-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/30 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            type="submit"
                                            className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                                        >
                                            建立
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsAddingClient(false);
                                                setNewClientName('');
                                            }}
                                            className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-transparent border border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                        >
                                            取消
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="px-2 pb-2 overflow-y-auto" style={{ maxHeight: '100%' }}>
                            <div className="space-y-1">
                                {workspaceClients.map((c) => {
                                    const isActive = c.id === currentClientId;
                                    const disabled = isReadOnly || !onChangeClient || isClientSwitching;
                                    const isEditing = editingClientId === c.id;
                                    const baseClass = 'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium';
                                    const activeClass = 'text-zinc-900 bg-zinc-200/50 dark:bg-zinc-800 dark:text-zinc-100';
                                    const hoverClass = 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200';

                                    return (
                                        <div key={c.id} className={`group relative ${disabled ? 'opacity-50' : ''}`}>
                                            <button
                                                type="button"
                                                onClick={() => !disabled && !isEditing && onChangeClient?.(c.id)}
                                                disabled={disabled}
                                                className={`${baseClass} pr-2 ${disabled ? 'cursor-not-allowed' : ''} ${isActive ? activeClass : hoverClass}`}
                                                title={isCollapsed ? c.name : undefined}
                                            >
                                                <span className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                                                    {c.name?.trim()?.slice(0, 1) || 'C'}
                                                </span>

                                                {!isCollapsed && !isEditing && (
                                                    <span className="truncate flex-1">{c.name}</span>
                                                )}

                                                {!isCollapsed && isEditing && (
                                                    <form
                                                        className="flex-1 flex items-center gap-2"
                                                        onSubmit={async (e) => {
                                                            e.preventDefault();
                                                            const trimmed = editingClientName.trim();
                                                            if (!trimmed) return;
                                                            await onRenameClient?.(c.id, trimmed);
                                                            setEditingClientId(null);
                                                            setEditingClientName('');
                                                        }}
                                                    >
                                                        <input
                                                            value={editingClientName}
                                                            onChange={(e) => setEditingClientName(e.target.value)}
                                                            className="w-full px-2 py-1 rounded-md text-sm bg-white border border-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/30 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
                                                            autoFocus
                                                        />
                                                        <button
                                                            type="submit"
                                                            className="px-2 py-1 rounded-md text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                                                        >
                                                            儲存
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingClientId(null);
                                                                setEditingClientName('');
                                                            }}
                                                            className="px-2 py-1 rounded-md text-xs font-medium bg-transparent border border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                                        >
                                                            取消
                                                        </button>
                                                    </form>
                                                )}

                                                {!isCollapsed && !isEditing && !isReadOnly && (
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setEditingClientId(c.id);
                                                                setEditingClientName(c.name);
                                                            }}
                                                            className="px-2 py-1 rounded-md text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800"
                                                            disabled={Boolean(isClientSwitching) || !onRenameClient}
                                                            title="編輯名稱"
                                                        >
                                                            編輯
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                onDeleteClient?.(c.id);
                                                            }}
                                                            className="px-2 py-1 rounded-md text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                                            disabled={Boolean(isClientSwitching) || !onDeleteClient}
                                                            title="刪除客戶"
                                                        >
                                                            刪除
                                                        </button>
                                                    </div>
                                                )}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="h-14 px-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center">
                <button
                    type="button"
                    onClick={toggleCollapse}
                    className="w-full h-10 rounded-lg flex items-center justify-center gap-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                >
                    {isCollapsed ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        </svg>
                    )}
                    {!isCollapsed && <span className="text-sm font-medium">收合</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;

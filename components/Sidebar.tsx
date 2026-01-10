
import React, { useMemo, useState } from 'react';
import type { ClientThemeColor } from '../types';

type View = 'dashboard' | 'dataManagement';

interface SidebarProps {
    currentView: View;
    setView: (view: View) => void;
    isReadOnly: boolean;
    isCollapsed: boolean;
    toggleCollapse: () => void;

    isMobileOpen?: boolean;
    onCloseMobile?: () => void;

    workspaceClients?: Array<{ id: string; name: string; color?: ClientThemeColor }>;
    currentClientId?: string;
    currentClientName?: string;
    onChangeClient?: (clientId: string) => void | Promise<void>;
    onAddClient?: (params: { name: string; color?: ClientThemeColor }) => void | Promise<void>;
    onRenameClient?: (clientId: string, params: { name: string; color?: ClientThemeColor }) => void | Promise<void>;
    onDeleteClient?: (clientId: string) => void | Promise<void>;
    isClientSwitching?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
    currentView, 
    setView, 
    isReadOnly, 
    isCollapsed, 
    toggleCollapse,
    isMobileOpen = false,
    onCloseMobile,
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
    const [newClientColor, setNewClientColor] = useState<ClientThemeColor>('stone');
    const [editingClientId, setEditingClientId] = useState<string | null>(null);
    const [editingClientName, setEditingClientName] = useState('');
    const [editingClientColor, setEditingClientColor] = useState<ClientThemeColor>('stone');

    const clientColorOptions = useMemo(() => {
        return [
            { value: 'zinc' as const, swatch: 'bg-zinc-500', label: '岩灰' },
            { value: 'stone' as const, swatch: 'bg-stone-500', label: '大地棕' },
            { value: 'amber' as const, swatch: 'bg-amber-400', label: '沙金' },
            { value: 'orange' as const, swatch: 'bg-orange-400', label: '杏橘' },
            { value: 'slate' as const, swatch: 'bg-slate-600', label: '墨藍灰' },
            { value: 'rose' as const, swatch: 'bg-rose-500', label: '莓紅' },
            { value: 'emerald' as const, swatch: 'bg-emerald-500', label: '森林綠' },
            { value: 'blue' as const, swatch: 'bg-blue-600', label: '海藍' },
            { value: 'indigo' as const, swatch: 'bg-indigo-600', label: '靛藍' },
            { value: 'neutral' as const, swatch: 'bg-neutral-600', label: '石墨黑' },
        ];
    }, []);

    const getSwatchClass = (color?: ClientThemeColor) => {
        const found = clientColorOptions.find((o) => o.value === color);
        return found?.swatch || 'bg-stone-500';
    };

    const ColorPicker: React.FC<{ value: ClientThemeColor; onChange: (v: ClientThemeColor) => void; label: string; }> = ({ value, onChange, label }) => (
        <div className="space-y-2">
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</div>
            <div className="flex items-center gap-2 flex-wrap">
                {clientColorOptions.map((opt) => {
                    const selected = opt.value === value;
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => onChange(opt.value)}
                            className={`relative w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${
                                selected
                                    ? 'border-zinc-400 dark:border-zinc-500 ring-2 ring-zinc-500 ring-offset-2 ring-offset-zinc-50 dark:ring-offset-zinc-900'
                                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                            }`}
                            aria-label={opt.label}
                            aria-pressed={selected}
                            title={opt.label}
                        >
                            <span className={`w-6 h-6 rounded-full ${opt.swatch}`} />
                            {selected && (
                                <span className="absolute inset-0 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white drop-shadow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 6L9 17l-5-5" />
                                    </svg>
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );

    const activeItemClass = 'text-zinc-900 bg-zinc-200/50 dark:bg-zinc-800 dark:text-zinc-100';

    const hoverItemClass = 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200';

    const MenuItem: React.FC<{ 
        view: View; 
        label: string; 
        icon: React.ReactNode; 
        disabled?: boolean;
    }> = ({ view, label, icon, disabled }) => (
        <button
            onClick={() => {
                if (disabled) return;
                setView(view);
                onCloseMobile?.();
            }}
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
            className={`flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/95 dark:bg-zinc-900/95 backdrop-blur-xl h-[100dvh] transition-all duration-300 ease-in-out fixed left-0 top-0 z-50 w-[260px] ${
                isCollapsed ? 'md:w-[72px]' : 'md:w-[260px]'
            } ${
                isMobileOpen ? 'translate-x-0' : '-translate-x-full'
            } md:translate-x-0`}
        >
            {/* Header / Brand */}
            <div className="flex items-center h-14 px-4 border-b border-zinc-200/50 dark:border-zinc-800/50">
                <div className="flex items-center w-full min-w-0">
                    <div className={`min-w-0 ${isCollapsed ? 'w-full flex justify-center md:justify-center' : ''}`}>
                        {/* Mobile: always show full title */}
                        <div className="md:hidden min-w-0">
                            <div className="text-lg font-bold text-emerald-600 tracking-wider leading-none truncate">YANGYU</div>
                            <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 leading-none mt-0.5 truncate">社群儀表板</div>
                        </div>

                        {/* Desktop: collapse shows only Y */}
                        <div className="hidden md:block min-w-0">
                            {isCollapsed ? (
                                <div className="text-lg font-bold text-emerald-600 tracking-wider leading-none text-center">Y</div>
                            ) : (
                                <>
                                    <div className="text-lg font-bold text-emerald-600 tracking-wider leading-none truncate">YANGYU</div>
                                    <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 leading-none mt-0.5 truncate">社群儀表板</div>
                                </>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => onCloseMobile?.()}
                        className="ml-auto md:hidden p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                        aria-label="關閉選單"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
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
                                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">品牌列表</span>
                                    {isClientSwitching && (
                                        <span className="text-xs text-zinc-400 dark:text-zinc-500">載入中...</span>
                                    )}
                                </div>
                            ) : (
                                <div className="w-full" />
                            )}

                            {!isCollapsed && !isReadOnly && !isAddingClient && onAddClient && (
                                <button
                                    type="button"
                                    onClick={() => setIsAddingClient(true)}
                                    className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-zinc-800"
                                    aria-label="新增客戶"
                                    title="新增客戶"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 5v14" />
                                        <path d="M5 12h14" />
                                    </svg>
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
                                        setIsAddingClient(false);
                                        setNewClientName('');
                                        try {
                                            await onAddClient({ name: trimmed, color: newClientColor });
                                        } catch {
                                            // ignore
                                        }
                                    }}
                                >
                                    <input
                                        value={newClientName}
                                        onChange={(e) => setNewClientName(e.target.value)}
                                        placeholder="輸入客戶名稱"
                                        className="w-full px-3 py-2 rounded-lg text-sm bg-white border border-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/30 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
                                    />
                                    <ColorPicker
                                        value={newClientColor}
                                        onChange={setNewClientColor}
                                        label="品牌主題色"
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
                                    const swatchClass = getSwatchClass(c.color);
                                    const baseClass = 'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium';
                                    const activeClass = 'text-zinc-900 bg-white border border-zinc-200 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100';
                                    const hoverClass = 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200';

                                    return (
                                        <div key={c.id} className={`group relative ${disabled ? 'opacity-50' : ''}`}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (disabled || isEditing) return;
                                                    onChangeClient?.(c.id);
                                                    onCloseMobile?.();
                                                }}
                                                disabled={disabled}
                                                className={`${baseClass} pr-2 text-left ${disabled ? 'cursor-not-allowed' : ''} ${isActive ? activeClass : hoverClass}`}
                                                title={isCollapsed ? c.name : undefined}
                                            >
                                                {!isCollapsed && isActive && (
                                                    <span className="text-zinc-300 dark:text-zinc-700" aria-hidden>
                                                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                                            <circle cx="6" cy="6" r="1.2" />
                                                            <circle cx="10" cy="6" r="1.2" />
                                                            <circle cx="14" cy="6" r="1.2" />
                                                            <circle cx="6" cy="10" r="1.2" />
                                                            <circle cx="10" cy="10" r="1.2" />
                                                            <circle cx="14" cy="10" r="1.2" />
                                                        </svg>
                                                    </span>
                                                )}

                                                <span className={`flex-shrink-0 w-3.5 h-3.5 rounded-full ${swatchClass}`} aria-hidden />

                                                {!isCollapsed && !isEditing && (
                                                    <span className="truncate flex-1">{c.name}</span>
                                                )}

                                                {!isCollapsed && isEditing && (
                                                    <form
                                                        className="flex-1 space-y-2"
                                                        onSubmit={async (e) => {
                                                            e.preventDefault();
                                                            const trimmed = editingClientName.trim();
                                                            if (!trimmed) return;
                                                            setEditingClientId(null);
                                                            setEditingClientName('');
                                                            try {
                                                                await onRenameClient?.(c.id, { name: trimmed, color: editingClientColor });
                                                            } catch {
                                                                // ignore
                                                            }
                                                        }}
                                                    >
                                                        <input
                                                            value={editingClientName}
                                                            onChange={(e) => setEditingClientName(e.target.value)}
                                                            className="w-full px-2 py-1 rounded-md text-sm bg-white border border-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/30 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
                                                            autoFocus
                                                        />
                                                        <ColorPicker
                                                            value={editingClientColor}
                                                            onChange={setEditingClientColor}
                                                            label="品牌主題色"
                                                        />
                                                        <div className="flex gap-2">
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
                                                        </div>
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
                                                                setEditingClientColor(c.color || 'stone');
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

            {/* Footer (Desktop only: collapse control) */}
            <div className="hidden md:flex h-14 px-3 border-t border-zinc-200 dark:border-zinc-800 items-center">
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

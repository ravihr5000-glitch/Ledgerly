import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Receipt,
  Repeat,
  CreditCard,
  PieChart,
  Target,
  FileText,
  Sliders,
  Settings,
  Share2,
  ShieldCheck,
  User,
  Pencil,
  Check,
  X,
  Download,
  Eye,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { DownloadAppModal } from '../common/DownloadAppModal';

export type PageId =
  | 'dashboard'
  | 'transactions'
  | 'recurring'
  | 'budgets'
  | 'goals'
  | 'documents'
  | 'rules'
  | 'settings'
  | 'share';

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
}

export const NAV_ITEMS: { id: PageId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: Receipt },
  { id: 'recurring', label: 'Recurring', icon: Repeat },
  { id: 'budgets', label: 'Budgets', icon: PieChart },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'rules', label: 'Rules', icon: Sliders },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'share', label: 'Share', icon: Share2 },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onSelectPage }) => {
  const { appName, updateAppName, profile, setIsProfileModalOpen, isViewOnly } = useFinance();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(appName);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // In view-only mode, hide Settings and Share options from guest viewer
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (isViewOnly && (item.id === 'settings' || item.id === 'share' || item.id === 'rules' || item.id === 'documents')) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    setNameInput(appName);
  }, [appName]);

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  const handleSaveName = () => {
    if (nameInput.trim()) {
      updateAppName(nameInput.trim());
    } else {
      setNameInput(appName);
    }
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveName();
    } else if (e.key === 'Escape') {
      setNameInput(appName);
      setIsEditingName(false);
    }
  };

  return (
    <aside className="w-[238px] shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen select-none transition-colors">
      {/* Brand Header */}
      <div className="h-[76px] px-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-[#6558D3] flex items-center justify-center text-white shadow-sm shadow-[#6558D3]/30 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            {isEditingName ? (
              <div className="flex items-center gap-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleSaveName}
                  className="w-full text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 border border-[#6558D3] rounded px-1.5 py-0.5 focus:outline-none"
                  maxLength={25}
                />
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSaveName();
                  }}
                  className="p-0.5 text-emerald-600 hover:text-emerald-700 cursor-pointer shrink-0"
                  title="Save name"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 group/brand">
                <span
                  className={`font-bold text-base text-slate-900 dark:text-white tracking-tight truncate ${
                    !isViewOnly
                      ? 'cursor-pointer hover:text-[#6558D3] dark:hover:text-[#8174f7] transition-colors'
                      : ''
                  }`}
                  onClick={!isViewOnly ? () => setIsEditingName(true) : undefined}
                  title={!isViewOnly ? 'Click to change name' : undefined}
                >
                  {appName}
                </span>
                {!isViewOnly && (
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="p-1 text-slate-400 hover:text-[#6558D3] dark:hover:text-[#8174f7] rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                    title="Change name"
                    aria-label="Change name"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
            <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Personal Vault
            </span>
          </div>
        </div>
      </div>

      {/* Navigation List - Fixed order 1 to 9 */}
      <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">
          Navigation
        </div>
        {visibleNavItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left group cursor-pointer ${
                isActive
                  ? 'bg-[#6558D3] text-white shadow-sm shadow-[#6558D3]/25'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Icon
                className={`w-4 h-4 transition-colors ${
                  isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                }`}
              />
              <span className="flex-1 truncate">{item.label}</span>
              <span
                className={`text-[10px] font-sans tabular-nums px-1.5 py-0.5 rounded ${
                  isActive ? 'bg-white/20 text-white' : 'text-slate-300 dark:text-slate-600'
                }`}
              >
                {index + 1}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile Download Button */}
      <div className="px-3 pb-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
        <button
          type="button"
          onClick={() => setShowDownloadModal(true)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200/80 dark:border-indigo-800/60 text-xs font-semibold text-[#6558D3] dark:text-[#8174f7] transition cursor-pointer shadow-xs active:scale-[0.98]"
        >
          <div className="flex items-center gap-2">
            <Download className="w-3.5 h-3.5" />
            <span>Mobile App</span>
          </div>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#6558D3] text-white">
            Install
          </span>
        </button>
      </div>

      {/* User Account & Profile Footer / View-Only Footer */}
      {isViewOnly ? (
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-amber-50/70 dark:bg-amber-950/40">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              <Eye className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-amber-900 dark:text-amber-200 truncate">
                View-Only Mode
              </p>
              <p className="text-[10px] text-amber-700 dark:text-amber-400 truncate">
                Read-only guest session
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-750 transition cursor-pointer group"
            title="Click to edit profile picture or email"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden bg-[#6558D3] text-white flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-slate-200 dark:ring-slate-700 shadow-xs">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name || 'User Profile'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{(profile.name || 'R')[0]?.toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-[#6558D3] dark:group-hover:text-[#8174f7] transition-colors">
                  {profile.name || 'Owner'}
                </p>
                <Pencil className="w-3 h-3 text-slate-400 group-hover:text-[#6558D3] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate" title={profile.email}>
                {profile.email}
              </p>
            </div>
          </div>
        </div>
      )}

      <DownloadAppModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
      />
    </aside>
  );
};

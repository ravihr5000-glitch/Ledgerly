import React, { useState, useRef, useEffect } from 'react';
import { X, ShieldCheck, User, Lightbulb, Download, Pencil, Check } from 'lucide-react';
import { PageId, NAV_ITEMS } from './Sidebar';
import { useTheme } from '../../context/ThemeContext';
import { useFinance } from '../../context/FinanceContext';
import { DownloadAppModal } from '../common/DownloadAppModal';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  isOpen,
  onClose,
  currentPage,
  onSelectPage,
}) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { appName, updateAppName, profile, setIsProfileModalOpen, isViewOnly } = useFinance();
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(appName);
  const inputRef = useRef<HTMLInputElement>(null);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-72 max-w-[85%] bg-white dark:bg-slate-900 h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
        <div className="h-[76px] px-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-[#6558D3] flex items-center justify-center text-white shadow-sm shrink-0">
              <ShieldCheck className="w-4 h-4" />
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
                <div className="flex items-center gap-1">
                  <span
                    className={`font-bold text-base text-slate-900 dark:text-white truncate ${
                      !isViewOnly ? 'cursor-pointer' : ''
                    }`}
                    onClick={!isViewOnly ? () => setIsEditingName(true) : undefined}
                  >
                    {appName}
                  </span>
                  {!isViewOnly && (
                    <button
                      type="button"
                      onClick={() => setIsEditingName(true)}
                      className="p-1 text-slate-400 hover:text-[#6558D3] dark:hover:text-[#8174f7] rounded cursor-pointer shrink-0"
                      title="Change name"
                      aria-label="Change name"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
              <span className="block text-[10px] text-slate-400 dark:text-slate-500">Personal Vault</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
          <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">
            Navigation
          </div>
          {visibleNavItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectPage(item.id);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-[#6558D3] text-white shadow-sm shadow-[#6558D3]/25'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="flex-1">{item.label}</span>
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

        {/* Theme Toggle, Install App & Owner Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2.5">
          {/* Download & Install Button */}
          <button
            type="button"
            onClick={() => setShowDownloadModal(true)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/60 text-xs font-semibold text-[#6558D3] dark:text-[#8174f7] cursor-pointer shadow-xs active:scale-[0.99] transition"
          >
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-[#6558D3] dark:text-[#8174f7]" />
              <span>Download & Install App</span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#6558D3] text-white">
              Install
            </span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-2">
              <Lightbulb
                className={`w-4 h-4 ${
                  isDarkMode ? 'text-amber-400 fill-amber-400' : 'text-slate-400'
                }`}
              />
              <span>Theme</span>
            </div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {isDarkMode ? 'Dark Mode' : 'Light Mode'}
            </span>
          </button>

          {isViewOnly ? (
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-900/60 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                👁️
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200 truncate">
                  View-Only Mode
                </p>
                <p className="text-[10px] text-amber-700 dark:text-amber-400 truncate">
                  Read-only guest session
                </p>
              </div>
            </div>
          ) : (
            <div
              onClick={() => {
                onClose();
                setIsProfileModalOpen(true);
              }}
              className="flex items-center gap-2.5 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750 transition"
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
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {profile.name || 'Owner'}
                  </p>
                  <span className="text-[10px] text-[#6558D3] dark:text-[#8174f7] font-semibold">
                    Edit
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {profile.email}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <DownloadAppModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
      />
    </div>
  );
};

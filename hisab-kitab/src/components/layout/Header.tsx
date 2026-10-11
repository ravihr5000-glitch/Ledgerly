import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Cloud,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Menu,
  CheckCircle2,
  Lightbulb,
  ChevronDown,
  Eye,
  Check,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useTheme } from '../../context/ThemeContext';
import { PageId, NAV_ITEMS } from './Sidebar';
import { FinanceCalendarPicker } from '../common/FinanceCalendarPicker';
import { MoneyBundle3D } from '../common/MoneyBundle3D';
import { User } from 'lucide-react';

interface HeaderProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  onOpenMobileNav: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentPage, onOpenMobileNav }) => {
  const {
    modes,
    activeModeId,
    activeMode,
    switchMode,
    selectedPeriod,
    setSelectedPeriod,
    setIsAddModalOpen,
    setIsImportModalOpen,
    syncDrive,
    driveStatus,
    appName,
    profile,
    setIsProfileModalOpen,
    isViewOnly,
    realtimeStatus,
    connectedDevices,
  } = useFinance();

  const { isDarkMode, toggleTheme } = useTheme();

  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const activeNav = NAV_ITEMS.find((n) => n.id === currentPage);

  const handleSyncDrive = async () => {
    try {
      setSyncing(true);
      await syncDrive();
      setSyncFeedback('Inbox synchronized');
      setTimeout(() => setSyncFeedback(null), 3000);
    } catch (err: any) {
      setSyncFeedback('Sync error');
      setTimeout(() => setSyncFeedback(null), 3500);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      {/* ============================================================
          DESKTOP HEADER (>= 768px) - Baseline layout strictly preserved
          ============================================================ */}
      <header className="hidden md:flex h-[76px] shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 items-center justify-between z-10 transition-colors">
        {/* Left: Page Title & 3D Floating Money Bundle */}
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            {activeNav?.label || 'Dashboard'}
          </h1>
          {currentPage === 'dashboard' && (
            <div className="ml-3.5 flex items-center shrink-0">
              <MoneyBundle3D />
            </div>
          )}
        </div>

        {/* Right: Global Actions (Bulb Dark Toggle, PWA Install, Drive Sync, Import, Add Entry, Period Selector) */}
        <div className="flex items-center gap-2.5">
          {/* Bulb Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-xs cursor-pointer"
            title={isDarkMode ? 'Turn off dark theme' : 'Turn on dark theme'}
            aria-label="Toggle dark theme"
          >
            <Lightbulb
              className={`w-3.5 h-3.5 transition-all ${
                isDarkMode
                  ? 'text-amber-400 fill-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                  : 'text-slate-500 hover:text-amber-500'
              }`}
            />
            <span className="hidden xl:inline">{isDarkMode ? 'Dark' : 'Light'}</span>
          </button>

          {/* Actions & Profile (Hidden or replaced when View-Only) */}
          {isViewOnly ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-xs font-semibold text-amber-800 dark:text-amber-300">
              <Eye className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>View-Only Mode</span>
            </div>
          ) : (
            <>
              {/* User Profile Quick Access Button */}
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="inline-flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-xs cursor-pointer group"
                title={`Account: ${profile.email}. Click to edit email or profile picture.`}
              >
                <div className="w-6 h-6 rounded-full overflow-hidden bg-[#6558D3] text-white flex items-center justify-center shrink-0 text-[11px] font-bold shadow-xs">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.name || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{(profile.name || 'R')[0]?.toUpperCase()}</span>
                  )}
                </div>
                <span className="hidden lg:inline font-medium max-w-[120px] truncate">
                  {profile.name || 'Profile'}
                </span>
              </button>

              {/* Real-time Multi-device Live Sync Indicator */}
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                title={`Real-Time Device Sync: ${realtimeStatus === 'connected' ? 'Active' : 'Connecting'}. Logged in as ${profile.email}. Devices in sync: ${connectedDevices}.`}
              >
                <span className={`w-2 h-2 rounded-full ${
                  realtimeStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`} />
                <span>
                  {realtimeStatus === 'connected'
                    ? connectedDevices > 1
                      ? `${connectedDevices} devices synced`
                      : 'Live sync'
                    : 'Syncing...'}
                </span>
              </button>

              {/* Drive Sync Button */}
              <button
                onClick={handleSyncDrive}
                disabled={syncing}
                className="relative inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-xs disabled:opacity-60 cursor-pointer"
                title={`Google Drive: ${appName} Financial Inbox. Last sync: ${
                  driveStatus?.lastSyncTimestamp
                    ? new Date(driveStatus.lastSyncTimestamp).toLocaleTimeString()
                    : 'Never'
                }`}
              >
                {syncing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#6558D3]" />
                ) : syncFeedback ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Cloud className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                )}
                <span className="hidden lg:inline">{syncFeedback || 'Drive Sync'}</span>
              </button>

              {/* CSV Import Button */}
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-xs cursor-pointer"
                title="Import CSV Statement"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Import</span>
              </button>

              {/* Add Entry Button */}
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl transition-all shadow-sm shadow-[#6558D3]/30 cursor-pointer"
                title="Add Financial Entry"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Add Entry</span>
              </button>
            </>
          )}

          {/* Calendar Picker (with built-in quick filters) */}
          <FinanceCalendarPicker align="right" />
        </div>
      </header>

      {/* ============================================================
          MOBILE HEADER (< 768px) - Clean header matching reference image
          ============================================================ */}
      <header className="md:hidden shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-4 py-3 flex items-center justify-between z-10 transition-colors">
        {/* Left: Page Title */}
        <div className="min-w-0 pr-2 flex items-center">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight truncate">
            {activeNav?.label || 'Dashboard'}
          </h1>
        </div>

        {/* Right: Profile Avatar + Calendar Date Filter + Bulb Toggle */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 ml-auto">
          {/* User Profile Avatar */}
          {!isViewOnly ? (
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className="relative w-8 h-8 rounded-full bg-[#6558D3] text-white flex items-center justify-center text-xs font-bold ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm cursor-pointer shrink-0 active:scale-95 transition-transform"
              title={`Account: ${profile.email}. Real-time sync: ${realtimeStatus}. Tap to edit.`}
              aria-label="Account profile"
            >
              <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.name || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{(profile.name || 'R')[0]?.toUpperCase()}</span>
                )}
              </div>
              {/* Real-time sync status dot */}
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                  realtimeStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                title={`Sync: ${realtimeStatus}`}
              />
            </button>
          ) : (
            <div
              className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm"
              title="View-Only Mode"
            >
              👁️
            </div>
          )}

          {/* Calendar Picker */}
          <FinanceCalendarPicker align="right" />

          {/* Bulb Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              isDarkMode
                ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
            }`}
            title={isDarkMode ? 'Dark theme active. Tap to turn on light theme' : 'Tap to turn on dark theme'}
            aria-label="Toggle dark theme"
          >
            <Lightbulb
              className={`w-4 h-4 transition-transform active:scale-125 ${
                isDarkMode
                  ? 'fill-amber-400 text-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]'
                  : 'text-slate-600'
              }`}
            />
          </button>
        </div>
      </header>
    </>
  );
};

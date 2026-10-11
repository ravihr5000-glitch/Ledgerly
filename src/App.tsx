import React, { useState } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar, PageId } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MobileNav } from './components/layout/MobileNav';

import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { RecurringPage } from './pages/RecurringPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { GoalsPage } from './pages/GoalsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { RulesPage } from './pages/RulesPage';
import { SettingsPage } from './pages/SettingsPage';
import { SharePage } from './pages/SharePage';

import { AddTransactionModal } from './components/modals/AddTransactionModal';
import { ImportCSVModal } from './components/modals/ImportCSVModal';
import { TagModal } from './components/modals/TagModal';
import { CreateModeModal } from './components/modals/CreateModeModal';
import { EditProfileModal } from './components/modals/EditProfileModal';
import { PinLockScreen } from './components/auth/PinLockScreen';
import { ShieldCheck, RefreshCw, LayoutDashboard, Receipt, Repeat, PieChart, Menu, Eye, Plus } from 'lucide-react';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const {
    loading,
    error,
    isAddModalOpen,
    setIsAddModalOpen,
    isImportModalOpen,
    setIsImportModalOpen,
    isTagModalOpen,
    setIsTagModalOpen,
    isProfileModalOpen,
    setIsProfileModalOpen,
    appName,
    isViewOnly,
    exitViewOnly,
    isPinLocked,
  } = useFinance();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-[#6558D3] flex items-center justify-center text-white shadow-lg shadow-[#6558D3]/30 mb-4 animate-pulse">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">{appName}</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#6558D3]" />
          Loading personal financial vault...
        </p>
      </div>
    );
  }

  // Owner PIN Protection Guard: View-only shared users NEVER see or enter PIN
  if (!isViewOnly && isPinLocked) {
    return <PinLockScreen />;
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentPage} />;
      case 'transactions':
        return <TransactionsPage />;
      case 'recurring':
        return <RecurringPage />;
      case 'budgets':
        return <BudgetsPage />;
      case 'goals':
        return <GoalsPage />;
      case 'documents':
        return isViewOnly ? <DashboardPage onNavigate={setCurrentPage} /> : <DocumentsPage />;
      case 'rules':
        return isViewOnly ? <DashboardPage onNavigate={setCurrentPage} /> : <RulesPage />;
      case 'settings':
        return isViewOnly ? <DashboardPage onNavigate={setCurrentPage} /> : <SettingsPage />;
      case 'share':
        return isViewOnly ? <DashboardPage onNavigate={setCurrentPage} /> : <SharePage />;
      default:
        return <DashboardPage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#F8F9FA] dark:bg-slate-950 text-slate-800 dark:text-slate-100 antialiased overflow-hidden font-sans">
      {/* Desktop Sidebar (w-[238px]) - Unchanged for desktop */}
      <div className="hidden md:block">
        <Sidebar currentPage={currentPage} onSelectPage={setCurrentPage} />
      </div>

      {/* Mobile Drawer */}
      <MobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        currentPage={currentPage}
        onSelectPage={setCurrentPage}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Desktop & Mobile Header */}
        <Header
          currentPage={currentPage}
          onSelectPage={setCurrentPage}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        {/* View-Only Mode Banner */}
        {isViewOnly && (
          <div className="bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200/90 dark:border-amber-900/60 px-4 sm:px-8 py-2 flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 z-10 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="min-w-0">
                <span className="font-bold">View-Only Mode: </span>
                <span className="text-[11px] text-amber-700 dark:text-amber-300 hidden sm:inline">
                  You have read-only access. Financial modification controls and account management are disabled.
                </span>
                <span className="text-[11px] text-amber-700 dark:text-amber-300 sm:hidden">
                  Read-only access.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200">
                Read-Only
              </span>
              <button
                type="button"
                onClick={exitViewOnly}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-amber-200/90 hover:bg-amber-300 dark:bg-amber-900 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-100 transition cursor-pointer"
                title="Exit View-Only mode and return to Owner mode"
              >
                Exit View-Only
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
          {error && (
            <div className="mb-4 p-3 text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-center justify-between">
              <span>{error}</span>
            </div>
          )}

          {renderCurrentPage()}
        </main>

        {/* Mobile Fixed Bottom Navigation Bar (< 768px) matching reference design */}
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 px-3 flex items-center justify-around z-40 shadow-lg"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {/* 1. Overview */}
          <button
            onClick={() => setCurrentPage('dashboard')}
            className={`flex-1 h-full min-h-[44px] flex flex-col items-center justify-center relative transition-all active:scale-95 cursor-pointer ${
              currentPage === 'dashboard'
                ? 'text-[#6558D3] dark:text-[#8174f7]'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">Overview</span>
            {currentPage === 'dashboard' && (
              <span className="w-6 h-0.5 bg-[#6558D3] dark:bg-[#8174f7] rounded-full absolute bottom-1.5" />
            )}
          </button>

          {/* 2. Transactions (Active indicator as in reference design) */}
          <button
            onClick={() => setCurrentPage('transactions')}
            className={`flex-1 h-full min-h-[44px] flex flex-col items-center justify-center relative transition-all active:scale-95 cursor-pointer ${
              currentPage === 'transactions'
                ? 'text-[#6558D3] dark:text-[#8174f7]'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Receipt className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">Transactions</span>
            {currentPage === 'transactions' && (
              <span className="w-8 h-0.5 bg-[#6558D3] dark:bg-[#8174f7] rounded-full absolute bottom-1.5" />
            )}
          </button>

          {/* 3. Center: Add Entry Circular Purple Button with white plus icon */}
          <div className="flex-1 flex items-center justify-center">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#6558D3] hover:bg-[#5749c4] text-white flex items-center justify-center shadow-lg shadow-[#6558D3]/40 active:scale-90 transition-all cursor-pointer ring-4 ring-white dark:ring-slate-900"
              title="Add Entry"
              aria-label="Add Financial Entry"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* 4. Budgets */}
          <button
            onClick={() => setCurrentPage('budgets')}
            className={`flex-1 h-full min-h-[44px] flex flex-col items-center justify-center relative transition-all active:scale-95 cursor-pointer ${
              currentPage === 'budgets'
                ? 'text-[#6558D3] dark:text-[#8174f7]'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <PieChart className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">Budgets</span>
            {currentPage === 'budgets' && (
              <span className="w-6 h-0.5 bg-[#6558D3] dark:bg-[#8174f7] rounded-full absolute bottom-1.5" />
            )}
          </button>

          {/* 5. More */}
          <button
            onClick={() => setMobileNavOpen(true)}
            className="flex-1 h-full min-h-[44px] flex flex-col items-center justify-center relative text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all active:scale-95 cursor-pointer"
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">More</span>
          </button>
        </nav>
      </div>

      {/* Global Modals */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
      <ImportCSVModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
      <TagModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
      />
      <CreateModeModal />
      <EditProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <FinanceProvider>
        <AppContent />
      </FinanceProvider>
    </ThemeProvider>
  );
}

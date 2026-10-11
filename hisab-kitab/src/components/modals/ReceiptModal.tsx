import React, { useState } from 'react';
import { Transaction } from '../../types/finance';
import { generateSingleReceiptPdf } from '../../utils/receiptGenerator';
import { useFinance } from '../../context/FinanceContext';
import { useTheme } from '../../context/ThemeContext';
import { getShareToken } from '../../services/api';
import {
  X,
  Download,
  Check,
  User,
  Calendar,
  IndianRupee,
  CreditCard,
  CheckCircle2,
  FileText,
  Printer,
  Shield,
  Loader2,
  Paperclip,
  ExternalLink,
  Image as ImageIcon,
  Sun,
  Moon,
} from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  modeName?: string;
  userName?: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  transaction,
  modeName = 'General',
  userName,
}) => {
  const { documents } = useFinance();
  const { isDarkMode } = useTheme();
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState<'official' | 'attached'>('official');
  const [imageError, setImageError] = useState(false);
  const [useFallbackUrl, setUseFallbackUrl] = useState(false);

  // Sync receipt theme with current app theme by default
  const [receiptTheme, setReceiptTheme] = useState<'light' | 'dark'>(() => (isDarkMode ? 'dark' : 'light'));

  React.useEffect(() => {
    if (isOpen) {
      setReceiptTheme(isDarkMode ? 'dark' : 'light');
    }
  }, [isOpen, isDarkMode]);

  // Resolve matching vault document by document ID or filename
  const matchedDoc = transaction
    ? documents.find((d) =>
        (transaction.receiptDocumentId && d.id === transaction.receiptDocumentId) ||
        (transaction.receiptName &&
          (d.originalName.toLowerCase() === transaction.receiptName.toLowerCase() ||
            d.filename.toLowerCase() === transaction.receiptName.toLowerCase()))
      )
    : undefined;
  const resolvedDocId = transaction?.receiptDocumentId || matchedDoc?.id;
  const hasAttachedFile = Boolean(
    transaction?.receiptAttached ||
    resolvedDocId ||
    transaction?.receiptDataUrl ||
    matchedDoc?.dataUrl
  );

  React.useEffect(() => {
    if (isOpen && transaction) {
      if (hasAttachedFile) {
        setActiveTab('attached');
      } else {
        setActiveTab('official');
      }
      setImageError(false);
      setUseFallbackUrl(false);
    }
  }, [isOpen, transaction?.id, hasAttachedFile]);

  if (!isOpen || !transaction) return null;

  const shareToken = getShareToken();
  const querySuffix = shareToken ? `?share=${encodeURIComponent(shareToken)}` : '';
  const directApiUrl = resolvedDocId ? `/api/documents/${resolvedDocId}/view${querySuffix}` : '';
  const fallbackDataUrl = transaction.receiptDataUrl || matchedDoc?.dataUrl || '';
  const displayImgUrl = useFallbackUrl
    ? (directApiUrl || fallbackDataUrl)
    : (fallbackDataUrl || directApiUrl);
  const attachedDownloadUrl = resolvedDocId
    ? `/api/documents/${resolvedDocId}/download${querySuffix}`
    : (fallbackDataUrl || directApiUrl);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await generateSingleReceiptPdf(transaction, modeName, {
        name: transaction.merchant || userName || 'Recipient',
        isDark: receiptTheme === 'dark',
        theme: receiptTheme,
      });
    } catch (err) {
      console.error('Failed to generate receipt PDF:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Format date nicely (e.g., "6 Oct 2026")
  const formatDisplayDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const day = d.getDate();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${day} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(transaction.amount);

  const paymentMethod = transaction.paymentMode || transaction.account || 'UPI';
  const recipientName = transaction.merchant || userName || 'Recipient';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-[490px] w-full overflow-hidden border border-slate-200/90 dark:border-slate-800 z-10 my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Top Control Bar with Tabs & Theme Toggle */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-1.5">
            {hasAttachedFile ? (
              <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('official')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    activeTab === 'official'
                      ? 'bg-white dark:bg-slate-700 text-[#3F32A3] dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Official Receipt
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('attached')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    activeTab === 'attached'
                      ? 'bg-white dark:bg-slate-700 text-[#3F32A3] dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Paperclip className="w-3 h-3" />
                  <span>Attached Photo</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#3F32A3] dark:text-[#8174f7]" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Receipt Preview</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Theme selector chip: automatically matches app theme with optional instant toggle */}
            <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-xl text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setReceiptTheme('light')}
                className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  receiptTheme === 'light'
                    ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Light mode receipt"
              >
                <Sun className="w-3 h-3" />
                <span className="hidden sm:inline">Light</span>
              </button>
              <button
                type="button"
                onClick={() => setReceiptTheme('dark')}
                className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  receiptTheme === 'dark'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Dark mode receipt"
              >
                <Moon className="w-3 h-3" />
                <span className="hidden sm:inline">Dark</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab 1: The Official Receipt Card */}
        {activeTab === 'official' && (
          <div className={`p-4 sm:p-6 ${receiptTheme === 'dark' ? 'bg-slate-950/60' : 'bg-slate-50/60'}`}>
            <div className={`rounded-2xl border shadow-md overflow-hidden transition-colors ${
              receiptTheme === 'dark'
                ? 'bg-[#0F172A] border-slate-800 text-slate-100'
                : 'bg-white border-slate-200/90 text-slate-800'
            }`}>
              {/* 1. Royal Purple Gradient Header Banner */}
              <div className={`relative px-6 py-5 text-white overflow-hidden ${
                receiptTheme === 'dark'
                  ? 'bg-gradient-to-r from-[#261B72] via-[#2E2088] to-[#18104E]'
                  : 'bg-gradient-to-r from-[#3F32A3] via-[#4135B2] to-[#2E2282]'
              }`}>
                <div className="absolute right-0 bottom-0 w-44 h-32 bg-indigo-950/40 rounded-tl-full pointer-events-none" />
                <div className="absolute right-0 bottom-0 w-28 h-20 bg-indigo-900/30 rounded-tl-full pointer-events-none" />

                <div className="relative z-10 flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center shrink-0 shadow-sm">
                    <div className="relative flex items-center justify-center">
                      <Shield className="w-7 h-7 text-white stroke-[2.2]" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full border border-white" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h1 className="text-xl sm:text-2xl font-black tracking-wide text-white font-sans">
                      LEDGERLY
                    </h1>
                    <p className="text-[11px] sm:text-xs text-indigo-200 font-medium">
                      Your Personal Finance Companion
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Receipt Title & Thank You */}
              <div className="pt-6 pb-4 px-6 text-center">
                <div className="inline-flex items-center justify-center gap-2 mb-1.5">
                  <FileText className={`w-6 h-6 stroke-[2.5] ${receiptTheme === 'dark' ? 'text-[#8174f7]' : 'text-[#3F32A3]'}`} />
                  <h2 className={`text-xl sm:text-2xl font-black font-sans ${receiptTheme === 'dark' ? 'text-white' : 'text-[#1E1B4B]'}`}>
                    Payment Receipt
                  </h2>
                </div>
                <p className={`text-xs ${receiptTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Thank you for using Ledgerly
                </p>

                {/* 3. Status Pill */}
                <div className="mt-4 flex justify-center">
                  <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs sm:text-sm font-bold shadow-xs ${
                    receiptTheme === 'dark'
                      ? 'bg-[#064E3B] border border-[#059669] text-[#34D399]'
                      : 'bg-[#E6FBF2] border border-[#A7F3D0] text-[#059669]'
                  }`}>
                    <span className="w-5 h-5 rounded-full bg-[#10B981] flex items-center justify-center text-white shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                    <span>Successful</span>
                  </div>
                </div>
              </div>

              {/* 4. Details Table Card with 5 Defined Rows */}
              <div className="px-5 sm:px-6 pb-6">
                <div className={`rounded-xl border overflow-hidden divide-y ${
                  receiptTheme === 'dark'
                    ? 'bg-[#1E293B] border-slate-700 divide-slate-700'
                    : 'bg-white border-slate-200/90 divide-slate-100'
                }`}>
                  {/* Row 1: Name */}
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div className={`flex items-center gap-3 ${receiptTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      <User className="w-4 h-4 stroke-[2]" />
                      <span className="text-xs sm:text-sm font-medium">Name</span>
                    </div>
                    <span className={`text-xs sm:text-sm font-bold ${receiptTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {recipientName}
                    </span>
                  </div>

                  {/* Row 2: Date */}
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div className={`flex items-center gap-3 ${receiptTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      <Calendar className="w-4 h-4 stroke-[2]" />
                      <span className="text-xs sm:text-sm font-medium">Date</span>
                    </div>
                    <span className={`text-xs sm:text-sm font-bold ${receiptTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {formatDisplayDate(transaction.date)}
                    </span>
                  </div>

                  {/* Row 3: Amount */}
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div className={`flex items-center gap-3 ${receiptTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      <IndianRupee className="w-4 h-4 stroke-[2]" />
                      <span className="text-xs sm:text-sm font-medium">Amount</span>
                    </div>
                    <span className={`text-xs sm:text-sm font-bold font-sans tabular-nums ${receiptTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      ₹ {formattedAmount}
                    </span>
                  </div>

                  {/* Row 4: Payment Method */}
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div className={`flex items-center gap-3 ${receiptTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      <CreditCard className="w-4 h-4 stroke-[2]" />
                      <span className="text-xs sm:text-sm font-medium">Payment Method</span>
                    </div>
                    <span className={`text-xs sm:text-sm font-bold ${receiptTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {paymentMethod}
                    </span>
                  </div>

                  {/* Row 5: Status */}
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div className={`flex items-center gap-3 ${receiptTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      <CheckCircle2 className="w-4 h-4 stroke-[2]" />
                      <span className="text-xs sm:text-sm font-medium">Status</span>
                    </div>
                    <span className={`text-xs sm:text-sm font-bold ${receiptTheme === 'dark' ? 'text-[#34D399]' : 'text-[#059669]'}`}>
                      Successful
                    </span>
                  </div>
                </div>

                {/* 5. Bottom System Disclaimer */}
                <div className={`mt-6 pt-5 border-t text-center space-y-1 ${
                  receiptTheme === 'dark' ? 'border-slate-800 text-slate-400' : 'border-slate-200/90 text-slate-500'
                }`}>
                  <p className="text-[11px]">
                    This is a system generated receipt from Ledgerly
                  </p>
                  <p className="text-[11px]">
                    and does not require a signature.
                  </p>
                </div>

                {/* 6. Footer Branding with Divider Lines */}
                <div className="mt-5 flex items-center justify-center gap-3">
                  <div className={`h-px w-16 sm:w-20 ${receiptTheme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`} />
                  <div className={`flex items-center gap-1.5 ${receiptTheme === 'dark' ? 'text-[#8174f7]' : 'text-[#3F32A3]'}`}>
                    <Shield className="w-4 h-4 stroke-[2.5]" />
                    <span className="text-xs font-black tracking-wider uppercase">LEDGERLY</span>
                  </div>
                  <div className={`h-px w-16 sm:w-20 ${receiptTheme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: The Uploaded Receipt Photo / Document */}
        {activeTab === 'attached' && (
          <div className="p-4 sm:p-6 bg-slate-50/60 dark:bg-slate-950/40 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 min-w-0">
                  <Paperclip className="w-4 h-4 text-[#3F32A3] dark:text-[#8174f7] shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {transaction.receiptName || 'Attached Receipt Document'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-sans tabular-nums">
                      {transaction.date} • {recipientName}
                    </p>
                  </div>
                </div>

                {attachedDownloadUrl && (
                  <a
                    href={attachedDownloadUrl}
                    download
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3F32A3] dark:text-indigo-400 hover:underline shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                )}
              </div>

              {/* Photo Display */}
              {displayImgUrl && !imageError ? (
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 max-h-[380px] flex items-center justify-center">
                  <img
                    src={displayImgUrl}
                    alt={transaction.receiptName || 'Receipt'}
                    onError={() => {
                      if (!useFallbackUrl && (directApiUrl || fallbackDataUrl)) {
                        setUseFallbackUrl(true);
                      } else {
                        setImageError(true);
                      }
                    }}
                    className="max-h-[380px] w-auto max-w-full object-contain mx-auto"
                  />
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <ImageIcon className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {transaction.receiptName || 'Receipt Attached to Record'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                    The document is linked in the financial vault and archived with this transaction.
                  </p>
                  {attachedDownloadUrl && (
                    <a
                      href={attachedDownloadUrl}
                      download
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3F32A3] text-white text-xs font-semibold shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download File</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Action Buttons Footer */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition cursor-pointer disabled:opacity-60 ${
                receiptTheme === 'dark'
                  ? 'bg-[#2E2088] hover:bg-[#251970]'
                  : 'bg-[#3F32A3] hover:bg-[#34278e]'
              }`}
            >
              {downloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating {receiptTheme === 'dark' ? 'Dark' : 'Light'} PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download {receiptTheme === 'dark' ? 'Dark' : 'Light'} PDF Receipt</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

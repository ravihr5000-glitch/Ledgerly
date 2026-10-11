import React, { useState } from 'react';
import {
  X,
  Download,
  Smartphone,
  Laptop,
  Share2,
  PlusSquare,
  Check,
  Copy,
  ExternalLink,
  Sparkles,
  QrCode,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useFinance } from '../../context/FinanceContext';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { appName, profile } = useFinance();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'android' | 'ios' | 'desktop'>('all');
  const [selectedUrlType, setSelectedUrlType] = useState<'dev' | 'pre'>('dev');

  if (!isOpen) return null;

  const devUrl = 'https://ais-dev-mtxntjdqlifpytdzkvo4yu-661762865895.asia-southeast1.run.app';
  const preUrl = 'https://ais-pre-mtxntjdqlifpytdzkvo4yu-661762865895.asia-southeast1.run.app';

  const currentUrl = selectedUrlType === 'dev' ? devUrl : preUrl;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    currentUrl
  )}&bgcolor=ffffff&color=1e1b4b&margin=6`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleDirectInstall = async () => {
    const success = await install();
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 z-10 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#6558D3] to-indigo-600 flex items-center justify-center text-white shadow-md shadow-[#6558D3]/30">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Download {appName} on Mobile
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Install as a full standalone app on your Android or iPhone
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-4">
          {/* Status banner */}
          {isInstalled ? (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
              <Check className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div className="text-xs">
                <span className="font-semibold block">Already Installed!</span>
                {appName} is running in standalone app mode on this device.
              </div>
            </div>
          ) : isInstallable ? (
            <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#6558D3]" />
                    Instant 1-Click Install Ready
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    Your browser supports direct installation to your home screen or dock.
                  </p>
                </div>
                <button
                  onClick={handleDirectInstall}
                  className="px-4 py-2 bg-[#6558D3] hover:bg-[#5749c4] text-white text-xs font-semibold rounded-xl shadow-sm transition active:scale-95 shrink-0 cursor-pointer"
                >
                  Install Now
                </button>
              </div>
            </div>
          ) : null}

          {/* QR Code & Mobile Link */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
            {/* Link Selector Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-700/60 rounded-xl">
              <button
                type="button"
                onClick={() => setSelectedUrlType('dev')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer text-center ${
                  selectedUrlType === 'dev'
                    ? 'bg-white dark:bg-slate-800 text-[#6558D3] dark:text-[#8174f7] shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                ⚡ Live Dev Link (Works Now)
              </button>
              <button
                type="button"
                onClick={() => setSelectedUrlType('pre')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer text-center ${
                  selectedUrlType === 'pre'
                    ? 'bg-white dark:bg-slate-800 text-[#6558D3] dark:text-[#8174f7] shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                🌐 Public Shared Link
              </button>
            </div>

            {/* Information Notice for the selected URL */}
            {selectedUrlType === 'dev' ? (
              <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-indigo-50/60 dark:bg-indigo-950/30 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                <span className="font-semibold text-[#6558D3] dark:text-indigo-400">✅ Recommended: </span>
                This link is live and running right now. When Chrome opens on your phone, log in with your Google account (<strong>{profile.email || 'ravihr5000@gmail.com'}</strong>).
              </div>
            ) : (
              <div className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200/80 dark:border-amber-900/50">
                <span className="font-semibold">⚠️ Notice: </span>
                If this link shows <em>"Page not found"</em>, click the <strong>Share</strong> button in the top-right corner of Google AI Studio to publish it publicly!
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
              {/* QR Code */}
              <div className="bg-white p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs shrink-0 text-center">
                <img
                  src={qrCodeUrl}
                  alt={`QR Code to install ${appName}`}
                  className="w-28 h-28 mx-auto rounded-lg object-contain"
                  loading="lazy"
                />
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-1 block">
                  Scan with Camera
                </span>
              </div>

              {/* Link input & copy */}
              <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-[#6558D3]" />
                    {selectedUrlType === 'dev' ? 'Live Mobile URL' : 'Public Shared URL'}
                  </h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Copy and paste directly into Chrome or Safari on your phone:
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={currentUrl}
                    className="flex-1 text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 font-mono select-all truncate"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3 py-1.5 bg-[#6558D3] hover:bg-[#5749c4] text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-xs"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Device Tabs */}
          <div>
            <div className="flex border-b border-slate-100 dark:border-slate-800 gap-1 pb-1">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  activeTab === 'all'
                    ? 'bg-[#6558D3] text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                All Devices
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('android')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  activeTab === 'android'
                    ? 'bg-[#6558D3] text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Android
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ios')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  activeTab === 'ios'
                    ? 'bg-[#6558D3] text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                iPhone / iPad
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('desktop')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  activeTab === 'desktop'
                    ? 'bg-[#6558D3] text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Desktop
              </button>
            </div>

            {/* Step Guides */}
            <div className="mt-3 space-y-3">
              {/* Android Guide */}
              {(activeTab === 'all' || activeTab === 'android') && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/70 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Android (Chrome / Samsung Internet)
                    </h5>
                  </div>
                  <ol className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5 list-decimal pl-4">
                    <li>
                      Open the app URL in <strong>Chrome</strong> on your Android phone.
                    </li>
                    <li>
                      Tap the three dots menu (<strong>⋮</strong>) in the top-right corner.
                    </li>
                    <li>
                      Tap <strong>Install app</strong> (or <strong>Add to Home screen</strong>).
                    </li>
                    <li>
                      Confirm by tapping <strong>Install</strong>. {appName} will install as a native icon in your app drawer and home screen.
                    </li>
                  </ol>
                </div>
              )}

              {/* iOS Guide */}
              {(activeTab === 'all' || activeTab === 'ios') && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/70 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="w-4 h-4 text-[#6558D3]" />
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      iPhone / iPad (Safari)
                    </h5>
                  </div>
                  <ol className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5 list-decimal pl-4">
                    <li>
                      Open the app URL in <strong>Safari</strong> on your iPhone or iPad.
                    </li>
                    <li className="flex items-center gap-1.5">
                      Tap the <strong>Share</strong> button{' '}
                      <Share2 className="w-3.5 h-3.5 inline text-blue-500" /> at the bottom of the screen.
                    </li>
                    <li className="flex items-center gap-1.5">
                      Scroll down and tap <strong>Add to Home Screen</strong>{' '}
                      <PlusSquare className="w-3.5 h-3.5 inline text-slate-700 dark:text-slate-300" />.
                    </li>
                    <li>
                      Tap <strong>Add</strong> in the top-right corner. {appName} will appear on your home screen without browser bars!
                    </li>
                  </ol>
                </div>
              )}

              {/* Desktop Guide */}
              {(activeTab === 'all' || activeTab === 'desktop') && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/70 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Laptop className="w-4 h-4 text-blue-600" />
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      PC / Mac (Chrome, Edge, Brave)
                    </h5>
                  </div>
                  <ol className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5 list-decimal pl-4">
                    <li>
                      Look at the right side of the browser's address (URL) bar at the top.
                    </li>
                    <li>
                      Click the <strong>Install</strong> icon (computer monitor with downward arrow).
                    </li>
                    <li>
                      Click <strong>Install</strong> in the prompt. {appName} will launch in its own dedicated distraction-free window!
                    </li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
};

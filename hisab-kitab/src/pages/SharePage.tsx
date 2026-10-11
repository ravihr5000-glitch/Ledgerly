import React, { useState, useEffect } from 'react';
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Eye,
  Ban,
  RefreshCw,
  QrCode,
  Lock,
  AlertTriangle,
  Sparkles,
  Smartphone,
  Monitor,
  Download,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

export const SharePage: React.FC = () => {
  const {
    isViewOnly,
    shareConfig,
    enableShareLink,
    revokeShareLink,
    refreshShareConfig,
    exitViewOnly,
  } = useFinance();

  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [targetType, setTargetType] = useState<'desktop' | 'mobile'>('desktop');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [qrLoaded, setQrLoaded] = useState(true);

  // Refresh latest active share configuration on mount
  useEffect(() => {
    refreshShareConfig();
  }, []);

  const isEnabled = shareConfig?.enabled && Boolean(shareConfig?.token);

  // Determine working base origin - always use the live accessible origin so links never 404
  const getActiveOrigin = (): string => {
    if (typeof window !== 'undefined' && window.location.origin) {
      return window.location.origin.replace(/\/+$/, '');
    }
    if (shareConfig?.publicBaseUrl) {
      return shareConfig.publicBaseUrl.replace(/\/+$/, '');
    }
    return '';
  };

  const getShareUrl = (_type?: 'desktop' | 'mobile') => {
    if (!shareConfig?.token) return '';
    const origin = getActiveOrigin();
    if (!origin) return '';
    return `${origin}/?share=${encodeURIComponent(shareConfig.token)}`;
  };

  const shareUrl = getShareUrl(targetType);

  const qrCodeUrl = shareUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
        shareUrl
      )}&bgcolor=ffffff&color=1e1b4b&margin=6`
    : '';

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement('input');
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleEnableOrRegenerate = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const conf = await enableShareLink();
      setSuccessMsg(`New shareable link generated successfully! (Token: ${conf.token.slice(0, 18)}...)`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate share link');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      await revokeShareLink();
      setSuccessMsg('Shared link revoked. Shared viewers can no longer access your data.');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to revoke share link');
    } finally {
      setLoading(false);
    }
  };

  if (isViewOnly) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Owner-Only Section
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          You are currently accessing Ledgerly in View-Only mode. Sharing settings and administrative controls can only be managed by the account owner.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={exitViewOnly}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#6558D3] hover:bg-[#5749c4] text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-xs"
          >
            <span>Exit View-Only & Return to Owner</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Share2 className="w-5 h-5 text-[#6558D3] dark:text-[#8174f7]" />
          <span>Share — View-Only Access</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Generate a secure, read-only link so another person can view your financial dashboard and transactions without editing or administrative permissions.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="font-semibold underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {/* Main Share Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-6 space-y-6 transition-colors">
        {/* Status Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                isEnabled
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  View-Only Shareable Link
                </h3>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    isEnabled
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {isEnabled ? '● Active' : '○ Disabled'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isEnabled
                  ? `Active token: ${shareConfig.token} (created ${new Date(shareConfig.createdAt).toLocaleDateString()})`
                  : 'No active share link. Generate one below to share read-only access.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEnabled ? (
              <>
                <button
                  type="button"
                  onClick={handleEnableOrRegenerate}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer disabled:opacity-50"
                  title="Generate a brand new link and update active token"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Regenerate Link</span>
                </button>
                <button
                  type="button"
                  onClick={handleRevoke}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Revoke Link</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleEnableOrRegenerate}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Create Share Link</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Link Box & QR Code */}
        {isEnabled ? (
          <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* QR Code */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 text-center flex flex-col items-center">
                {qrLoaded ? (
                  <img
                    src={qrCodeUrl}
                    alt="QR Code for View-Only Share Link"
                    className="w-32 h-32 rounded-xl object-contain bg-white"
                    onError={() => setQrLoaded(false)}
                  />
                ) : (
                  <div className="w-32 h-32 flex flex-col items-center justify-center bg-slate-50 text-slate-400 rounded-xl p-2 text-center">
                    <QrCode className="w-8 h-8 mb-1" />
                    <span className="text-[10px]">QR Code Ready</span>
                  </div>
                )}
                <div className="mt-1.5 flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-800">
                  <Smartphone className="w-3 h-3 text-[#6558D3]" />
                  <span>Scan on Mobile</span>
                </div>
              </div>

              {/* Link text & actions */}
              <div className="flex-1 min-w-0 space-y-3 text-center sm:text-left w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-1.5">
                      <Share2 className="w-3.5 h-3.5 text-[#6558D3] dark:text-[#8174f7]" />
                      <span>Active View-Only Share URL</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {targetType === 'desktop'
                        ? 'Direct access link — open in a new tab or send to partners:'
                        : 'Mobile-friendly link and QR code for phones and tablets:'}
                    </p>
                  </div>

                  {/* Device tab toggle */}
                  <div className="flex items-center justify-center sm:justify-start gap-1 p-0.5 bg-slate-200/70 dark:bg-slate-700/70 rounded-xl text-[11px] self-center sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setTargetType('desktop')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
                        targetType === 'desktop'
                          ? 'bg-white dark:bg-slate-900 text-[#6558D3] dark:text-[#8174f7] shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Monitor className="w-3 h-3" />
                      <span>Desktop Tab</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetType('mobile')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
                        targetType === 'mobile'
                          ? 'bg-white dark:bg-slate-900 text-[#6558D3] dark:text-[#8174f7] shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Smartphone className="w-3 h-3" />
                      <span>Mobile & QR</span>
                    </button>
                  </div>
                </div>

                {/* Input with Copy and Preview actions */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 font-mono select-all truncate focus:outline-none"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#6558D3] hover:bg-[#5749c4] text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-xs shrink-0"
                    title="Copy share link to clipboard"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer shrink-0"
                    title="Preview view-only access in a new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#6558D3] dark:text-[#8174f7]" />
                    <span className="hidden sm:inline">Preview</span>
                  </a>
                </div>

                {/* Status info bar */}
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center sm:justify-start gap-1.5 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    Secured by temporary cryptographic token. Viewers can browse records and transactions without editing permissions.
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 px-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
            <Share2 className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              No Active Share Link
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Click <strong>"Create Share Link"</strong> above to generate a unique link that you can send to financial advisors, family members, or partners.
            </p>
          </div>
        )}

        {/* Security & Permissions Matrix Card */}
        <div className="pt-2 space-y-3">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            View-Only Permission Rules
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 space-y-2">
              <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                Permitted for Shared Viewers
              </span>
              <ul className="text-[11px] text-emerald-700 dark:text-emerald-400 space-y-1 list-disc pl-4">
                <li>View financial overview, net cash flow & metrics</li>
                <li>Browse and search transaction records</li>
                <li>Filter by financial modes (Personal, Business, etc.)</li>
                <li>Download transaction receipts and summary PDFs</li>
                <li>View monthly budgets and financial goals</li>
              </ul>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 space-y-2">
              <span className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                <Ban className="w-3.5 h-3.5" />
                Strictly Blocked & Protected
              </span>
              <ul className="text-[11px] text-rose-700 dark:text-rose-400 space-y-1 list-disc pl-4">
                <li>Cannot add, edit, or delete any transactions</li>
                <li>Cannot import CSVs, sync Drive, or upload vault files</li>
                <li>Cannot modify, create, or remove financial modes</li>
                <li>Settings & Profile management are completely hidden</li>
                <li>Owner email and credentials are never exposed</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

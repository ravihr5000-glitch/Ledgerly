import React, { useState } from 'react';
import {
  Mail,
  ShieldCheck,
  Check,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Lock,
  Smartphone,
  Laptop,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

export function isValidGmail(email: string): { valid: boolean; error?: string } {
  if (!email || !email.trim()) {
    return { valid: false, error: 'Gmail address is required.' };
  }

  const clean = email.trim().toLowerCase();

  // Basic check for @ symbol
  if (!clean.includes('@')) {
    return {
      valid: false,
      error: 'Please enter a complete Gmail address ending in @gmail.com.',
    };
  }

  const parts = clean.split('@');
  if (parts.length !== 2) {
    return { valid: false, error: 'Please enter a valid Gmail address format.' };
  }

  const [username, domain] = parts;

  if (!username || username.trim().length === 0) {
    return { valid: false, error: 'Please enter your username before @gmail.com.' };
  }

  if (username.length < 3) {
    return { valid: false, error: 'Gmail username must be at least 3 characters long.' };
  }

  // Domain check: must be gmail.com or googlemail.com
  if (domain !== 'gmail.com' && domain !== 'googlemail.com') {
    return {
      valid: false,
      error: 'Please provide a valid Gmail address ending with @gmail.com.',
    };
  }

  // Username valid characters (letters, numbers, dots, dashes, plus)
  const usernameRegex = /^[a-z0-9](\.?[a-z0-9_\-+])*$/i;
  if (!usernameRegex.test(username)) {
    return {
      valid: false,
      error: 'Gmail username contains invalid characters.',
    };
  }

  return { valid: true };
}

interface GmailRequiredModalProps {
  onSuccess?: () => void;
}

export const GmailRequiredModal: React.FC<GmailRequiredModalProps> = ({ onSuccess }) => {
  const { saveUserGmail, appName } = useFinance();
  const [emailInput, setEmailInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleAppendDomain = () => {
    const trimmed = emailInput.trim();
    if (!trimmed.includes('@')) {
      setEmailInput(`${trimmed}@gmail.com`);
      setErrorMsg(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmed = emailInput.trim();
    const validation = isValidGmail(trimmed);

    if (!validation.valid) {
      setErrorMsg(validation.error || 'Please enter a valid Gmail address.');
      return;
    }

    try {
      setIsSubmitting(true);
      await saveUserGmail(trimmed.toLowerCase());
      setIsSuccess(true);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize account. Please try again.');
      setIsSubmitting(false);
    }
  };

  const showAppendChip = emailInput.trim().length >= 2 && !emailInput.includes('@');

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gmail-modal-title"
    >
      <div className="relative w-full max-w-md sm:max-w-lg bg-white dark:bg-[#070e24] border border-slate-200/90 dark:border-indigo-500/30 rounded-2xl sm:rounded-3xl shadow-2xl dark:shadow-indigo-950/40 p-5 sm:p-8 text-slate-800 dark:text-slate-100 my-auto flex flex-col transition-all">
        {/* Top Header Badge & Branding */}
        <div className="flex flex-col items-center text-center mb-5 sm:mb-6">
          <div className="relative mb-3">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-[#6558D3] via-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-xl shadow-[#6558D3]/35">
              <Mail className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md ring-2 ring-white dark:ring-[#070e24]">
              <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          </div>

          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-[#6558D3] dark:text-indigo-400 mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#6558D3] dark:text-indigo-400" />
            Personal Financial Vault
          </span>

          <h2
            id="gmail-modal-title"
            className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight"
          >
            Welcome to {appName}
          </h2>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm leading-relaxed">
            Please enter your correct Gmail address before accessing the app. Your data and vault will be isolated and saved to your account.
          </p>
        </div>

        {/* Features Highlight */}
        <div className="grid grid-cols-3 gap-2 py-3 px-3 sm:px-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-indigo-900/40 mb-5">
          <div className="flex flex-col items-center text-center">
            <Lock className="w-4 h-4 text-[#6558D3] dark:text-indigo-400 mb-1" />
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Private</span>
            <span className="text-[9px] text-slate-400 leading-tight">Isolated vault</span>
          </div>
          <div className="flex flex-col items-center text-center border-x border-slate-200/60 dark:border-indigo-900/40 px-1">
            <Smartphone className="w-4 h-4 text-emerald-500 mb-1" />
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Multi-Device</span>
            <span className="text-[9px] text-slate-400 leading-tight">Syncs everywhere</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <Check className="w-4 h-4 text-blue-500 mb-1" />
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">One-Time</span>
            <span className="text-[9px] text-slate-400 leading-tight">Saved locally</span>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="gmail-input"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
              >
                Your Gmail Address <span className="text-rose-500">*</span>
              </label>

              {showAppendChip && (
                <button
                  type="button"
                  onClick={handleAppendDomain}
                  className="text-[11px] font-semibold text-[#6558D3] dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                  title="Click to automatically append @gmail.com"
                >
                  <span>+ @gmail.com</span>
                </button>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Mail className="w-4 h-4" />
              </div>

              <input
                id="gmail-input"
                type="email"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="yourname@gmail.com"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                disabled={isSubmitting || isSuccess}
                className="w-full pl-10 pr-3.5 py-3 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-indigo-500/40 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6558D3] dark:focus:ring-indigo-400 transition-all font-medium disabled:opacity-60"
              />
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
              Enter your Google email (e.g. <span className="font-medium text-slate-600 dark:text-slate-300">alex@gmail.com</span>). Once submitted, you won't be prompted again.
            </p>
          </div>

          {/* Validation Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || isSuccess || !emailInput.trim()}
            className="w-full py-3 sm:py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-[#6558D3] hover:bg-[#5749c9] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#6558D3]/25 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Initializing Your Vault...</span>
              </>
            ) : isSuccess ? (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Vault Ready! Accessing...</span>
              </>
            ) : (
              <>
                <span>Access Financial Vault</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Assurance */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Mandatory setup · Secure persistent local storage</span>
        </div>
      </div>
    </div>
  );
};

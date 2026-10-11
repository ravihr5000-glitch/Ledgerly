import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  Eye,
  EyeOff,
  Copy,
  Check,
  Delete,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

export const PinLockScreen: React.FC = () => {
  const {
    appName,
    verifyOwnerPin,
    verifyRecoveryCode,
    resetPinWithRecovery,
    unlockApp,
  } = useFinance();

  // Mode: 'enter_pin' | 'recovery_code' | 'create_new_pin' | 'show_recovery_code'
  const [viewMode, setViewMode] = useState<
    'enter_pin' | 'recovery_code' | 'create_new_pin' | 'show_recovery_code'
  >('enter_pin');

  // Enter PIN state
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinNotice, setPinNotice] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('ledgerly_pin_notice') || null;
    } catch (e) {
      return null;
    }
  });
  const [isShaking, setIsShaking] = useState<boolean>(false);

  // Recovery Code verification state
  const [recoveryCodeInput, setRecoveryCodeInput] = useState<string>('');
  const [isVerifyingRecovery, setIsVerifyingRecovery] = useState<boolean>(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [verifiedToken, setVerifiedToken] = useState<string>('');
  const [verifiedCode, setVerifiedCode] = useState<string>('');

  // Create new PIN state
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [showNewPin, setShowNewPin] = useState<boolean>(false);
  const [isSubmittingNewPin, setIsSubmittingNewPin] = useState<boolean>(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Newly generated recovery code state (displayed once)
  const [generatedRecoveryCode, setGeneratedRecoveryCode] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Handle keyboard typing for PIN
  useEffect(() => {
    if (viewMode !== 'enter_pin') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        setPinError(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, enteredPin, isVerifying]);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 600);
  };

  const handleDigitPress = (digit: string) => {
    if (isVerifying || enteredPin.length >= 4) return;
    setPinError(null);
    const updated = enteredPin + digit;
    setEnteredPin(updated);

    if (updated.length === 4) {
      submitPin(updated);
    }
  };

  const handleBackspace = () => {
    if (isVerifying || enteredPin.length === 0) return;
    setPinError(null);
    setEnteredPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (isVerifying) return;
    setPinError(null);
    setEnteredPin('');
  };

  const submitPin = async (pinToVerify: string) => {
    setIsVerifying(true);
    setPinError(null);

    try {
      const res = await verifyOwnerPin(pinToVerify);
      if (res.success) {
        try {
          sessionStorage.removeItem('ledgerly_pin_notice');
        } catch (e) {}
        setPinNotice(null);
      } else {
        triggerShake();
        setPinError(res.message || 'Incorrect 4-digit PIN. Please try again.');
        setEnteredPin('');
      }
    } catch (err: any) {
      triggerShake();
      setPinError(err.message || 'Incorrect PIN. Please try again.');
      setEnteredPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  // --- Recovery Code Flow ---
  const handleOpenRecovery = () => {
    setEnteredPin('');
    setPinError(null);
    setRecoveryError(null);
    setRecoveryCodeInput('');
    setNewPin('');
    setConfirmPin('');
    setViewMode('recovery_code');
  };

  const handleVerifyRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = recoveryCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setRecoveryError('Please enter your recovery code.');
      return;
    }

    setIsVerifyingRecovery(true);
    setRecoveryError(null);

    try {
      const res = await verifyRecoveryCode(cleanCode);
      if (res.success) {
        setVerifiedCode(cleanCode);
        setVerifiedToken(res.resetToken || '');
        setViewMode('create_new_pin');
      } else {
        setRecoveryError(res.message || 'Invalid recovery code.');
      }
    } catch (err: any) {
      setRecoveryError(err.message || 'Invalid recovery code. Please check and try again.');
    } finally {
      setIsVerifyingRecovery(false);
    }
  };

  const handleSubmitNewPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    const cleanPin = newPin.trim();
    const cleanConfirm = confirmPin.trim();

    if (!cleanPin || !/^\d{4}$/.test(cleanPin)) {
      setResetError('New PIN must be exactly 4 numeric digits.');
      return;
    }

    if (cleanPin !== cleanConfirm) {
      setResetError('The confirmation PIN does not match the new PIN.');
      return;
    }

    setIsSubmittingNewPin(true);
    try {
      const res = await resetPinWithRecovery(cleanPin, verifiedCode, verifiedToken);
      if (res.recoveryCode) {
        setGeneratedRecoveryCode(res.recoveryCode);
        setViewMode('show_recovery_code');
      } else {
        unlockApp();
      }
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset PIN. Invalid or expired recovery code.');
    } finally {
      setIsSubmittingNewPin(false);
    }
  };

  const handleCopyRecoveryCode = async () => {
    if (!generatedRecoveryCode) return;
    try {
      await navigator.clipboard.writeText(generatedRecoveryCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch (e) {
      // Fallback
    }
  };

  const handleFinishRecovery = () => {
    unlockApp();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md px-4 py-8 overflow-y-auto selection:bg-[#6558D3] selection:text-white">
      {/* Background glow ornamentation */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#6558D3]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-br from-[#6558D3] to-[#4e40b3] p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-inner mb-3">
            {viewMode === 'enter_pin' ? (
              <Lock className="w-7 h-7" />
            ) : viewMode === 'recovery_code' ? (
              <KeyRound className="w-7 h-7" />
            ) : viewMode === 'create_new_pin' ? (
              <Lock className="w-7 h-7" />
            ) : (
              <ShieldCheck className="w-7 h-7" />
            )}
          </div>
          <h1 className="text-xl font-bold tracking-tight">{appName || 'Ledgerly'}</h1>
          <p className="text-xs text-indigo-100/90 mt-1 font-medium">
            {viewMode === 'enter_pin' && 'Owner PIN Protection'}
            {viewMode === 'recovery_code' && 'Account Recovery'}
            {viewMode === 'create_new_pin' && 'Set New 4-Digit PIN'}
            {viewMode === 'show_recovery_code' && 'Unique Recovery Code'}
          </p>
        </div>

        {/* --- VIEW MODE 1: ENTER PIN --- */}
        {viewMode === 'enter_pin' && (
          <div className="p-6 sm:p-8 space-y-6">
            {/* Success / Status Notice banner */}
            {pinNotice && (
              <div className="p-3 text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-center justify-center gap-2 text-center shadow-xs animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="font-medium">{pinNotice}</span>
              </div>
            )}

            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Enter your 4-digit PIN
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Type using keyboard or tap the keypad below
              </p>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 text-[10px] text-slate-500 dark:text-slate-400 mt-1 select-none">
                <Lock className="w-2.5 h-2.5 text-[#6558D3]" />
                <span>Auto-locks on app switch &amp; 5s away</span>
              </div>
            </div>

            {/* PIN Dots Indicator */}
            <div
              className={`flex items-center justify-center gap-4 py-3 transition-transform ${
                isShaking ? 'animate-bounce' : ''
              }`}
            >
              {[0, 1, 2, 3].map((index) => {
                const isFilled = enteredPin.length > index;
                return (
                  <div
                    key={index}
                    className={`w-4 h-4 rounded-full transition-all duration-200 ${
                      isFilled
                        ? 'bg-[#6558D3] scale-125 shadow-md shadow-[#6558D3]/40'
                        : 'border-2 border-slate-300 dark:border-slate-600 bg-transparent'
                    }`}
                  />
                );
              })}
            </div>

            {/* Error Message */}
            {pinError && (
              <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-center justify-center gap-2 text-center animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            {/* Verifying Indicator */}
            {isVerifying && (
              <div className="flex items-center justify-center gap-2 text-xs text-[#6558D3] dark:text-[#8174f7] font-medium py-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Verifying PIN...</span>
              </div>
            )}

            {/* Number Pad */}
            <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto pt-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleDigitPress(num.toString())}
                  disabled={isVerifying}
                  className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-slate-100 text-xl font-bold transition flex items-center justify-center shadow-xs cursor-pointer select-none"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                disabled={isVerifying || enteredPin.length === 0}
                className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider transition flex items-center justify-center cursor-pointer select-none disabled:opacity-40"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleDigitPress('0')}
                disabled={isVerifying}
                className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-slate-100 text-xl font-bold transition flex items-center justify-center shadow-xs cursor-pointer select-none"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                disabled={isVerifying || enteredPin.length === 0}
                className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 text-slate-600 dark:text-slate-300 transition flex items-center justify-center cursor-pointer select-none disabled:opacity-40"
                aria-label="Backspace"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Bottom Action: Forgot PIN */}
            <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                onClick={handleOpenRecovery}
                className="text-xs font-medium text-[#6558D3] hover:text-[#4e40b3] dark:text-[#8174f7] dark:hover:text-[#a095ff] hover:underline cursor-pointer"
              >
                Forgot PIN?
              </button>
            </div>
          </div>
        )}

        {/* --- VIEW MODE 2: RECOVERY CODE VERIFICATION --- */}
        {viewMode === 'recovery_code' && (
          <form onSubmit={handleVerifyRecoveryCode} className="p-6 sm:p-8 space-y-5">
            <button
              type="button"
              onClick={() => {
                setViewMode('enter_pin');
                setRecoveryError(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to PIN Login</span>
            </button>

            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Enter Recovery Code
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Enter the unique recovery code that was provided when you set up your PIN.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Recovery Code
              </label>
              <input
                type="text"
                value={recoveryCodeInput}
                onChange={(e) => setRecoveryCodeInput(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                autoFocus
                className="w-full text-center tracking-widest text-base font-mono uppercase px-3.5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6558D3]"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 text-center">
                Hyphens and casing are formatted automatically.
              </p>
            </div>

            {recoveryError && (
              <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{recoveryError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifyingRecovery || !recoveryCodeInput.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-[#6558D3] hover:bg-[#5245c0] text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isVerifyingRecovery ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying Recovery Code...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Verify Recovery Code</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* --- VIEW MODE 3: CREATE NEW PIN --- */}
        {viewMode === 'create_new_pin' && (
          <form onSubmit={handleSubmitNewPin} className="p-6 sm:p-8 space-y-5">
            <button
              type="button"
              onClick={() => {
                setViewMode('recovery_code');
                setResetError(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Recovery Code</span>
            </button>

            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Reset Your 4-Digit PIN
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Set a new 4-digit code to protect your financial ledger.
              </p>
            </div>

            {resetError && (
              <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New 4-Digit PIN
                </label>
                <div className="relative">
                  <input
                    type={showNewPin ? 'text' : 'password'}
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    autoFocus
                    className="w-full text-center tracking-widest text-lg font-mono px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6558D3]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New 4-Digit PIN
                </label>
                <input
                  type={showNewPin ? 'text' : 'password'}
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="w-full text-center tracking-widest text-lg font-mono px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6558D3]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmittingNewPin || newPin.length !== 4 || confirmPin.length !== 4}
              className="w-full py-2.5 px-4 rounded-xl bg-[#6558D3] hover:bg-[#5245c0] text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isSubmittingNewPin ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving New PIN...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save New PIN & Continue</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* --- VIEW MODE 4: DISPLAY NEW RECOVERY CODE ONCE --- */}
        {viewMode === 'show_recovery_code' && (
          <div className="p-6 sm:p-8 space-y-5 animate-in fade-in">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                New Recovery Code Generated
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your new 4-digit PIN is saved. Here is your unique recovery code.
              </p>
            </div>

            {/* Recovery Code Box */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-2">
              <span className="text-[10px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                Your Unique Recovery Code
              </span>
              <div className="text-base sm:text-lg font-mono font-bold tracking-widest text-[#6558D3] dark:text-[#8174f7] select-all py-1">
                {generatedRecoveryCode}
              </div>
              <button
                type="button"
                onClick={handleCopyRecoveryCode}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition cursor-pointer shadow-2xs"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Recovery Code</span>
                  </>
                )}
              </button>
            </div>

            {/* Warning Callout */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Save this code now
              </p>
              <p className="text-amber-700/90 dark:text-amber-400/90 leading-relaxed">
                This code is displayed only once. If you ever forget your PIN in the future, this code is the only way to recover access.
              </p>
            </div>

            <button
              type="button"
              onClick={handleFinishRecovery}
              className="w-full py-2.5 px-4 rounded-xl bg-[#6558D3] hover:bg-[#5245c0] text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              <span>I Have Saved My Code — Continue to Ledgerly</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

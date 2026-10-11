import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Settings,
  Wallet,
  Layers,
  CreditCard,
  Cloud,
  Repeat,
  AlertOctagon,
  Trash2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Edit2,
  Briefcase,
  User,
  Mail,
  Camera,
  Upload,
  ShieldCheck,
  Check,
  X,
  Search,
  Lock,
  KeyRound,
  Copy,
  Info,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { getIconComponent } from '../components/modals/CreateModeModal';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
];

export const SettingsPage: React.FC = () => {
  const {
    profile,
    updateProfile,
    uploadAvatar,
    removeAvatar,
    preferences,
    modes,
    activeModeId,
    switchMode,
    openCreateModeModal,
    openEditModeModal,
    categories,
    transactions,
    accounts,
    driveStatus,
    recurringData,
    saveNetWorth,
    addCategory,
    updateCategory,
    deleteCategory,
    addAccount,
    deleteAccount,
    restoreIgnoredPatterns,
    eraseAllData,
    pinStatus,
    setupOwnerPin,
    changeOwnerPin,
    removeOwnerPin,
    lockApp,
  } = useFinance();

  // PIN Security & Authentication State
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [isRemovingPin, setIsRemovingPin] = useState(false);
  const [pinChangeError, setPinChangeError] = useState<string | null>(null);
  const [pinChangeSuccess, setPinChangeSuccess] = useState<string | null>(null);
  const [newRecoveryCodeDisplayed, setNewRecoveryCodeDisplayed] = useState<string | null>(null);
  const [copiedRecoveryCode, setCopiedRecoveryCode] = useState(false);

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeError(null);
    setPinChangeSuccess(null);

    const cleanCurrent = currentPinInput.trim();
    const cleanNew = newPinInput.trim();
    const cleanConfirm = confirmPinInput.trim();

    if (pinStatus?.pinEnabled && !cleanCurrent) {
      setPinChangeError('Current 4-digit PIN is required.');
      return;
    }

    if (!cleanNew || !/^\d{4}$/.test(cleanNew)) {
      setPinChangeError('New PIN must be exactly 4 numeric digits.');
      return;
    }

    if (cleanNew !== cleanConfirm) {
      setPinChangeError('Confirm PIN does not match the new PIN.');
      return;
    }

    setIsChangingPin(true);
    try {
      const res = pinStatus?.pinEnabled
        ? await changeOwnerPin(cleanCurrent, cleanNew)
        : await setupOwnerPin(cleanNew);

      if (res.recoveryCode) {
        setNewRecoveryCodeDisplayed(res.recoveryCode);
      } else {
        setPinChangeSuccess(res.message || 'PIN saved successfully!');
        setTimeout(() => {
          setIsPinModalOpen(false);
          setPinChangeSuccess(null);
        }, 1500);
      }
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
    } catch (err: any) {
      setPinChangeError(err.message || 'Failed to update PIN. Please verify your current PIN.');
    } finally {
      setIsChangingPin(false);
    }
  };

  const handleRemovePin = async () => {
    try {
      setIsRemovingPin(true);
      setPinChangeError(null);
      await removeOwnerPin();
      setPinChangeSuccess('PIN removed successfully.');
      setTimeout(() => setPinChangeSuccess(null), 3000);
    } catch (err: any) {
      setPinChangeError(err.message || 'Failed to remove PIN.');
    } finally {
      setIsRemovingPin(false);
    }
  };

  const handleCopyNewRecoveryCode = async () => {
    if (!newRecoveryCodeDisplayed) return;
    try {
      await navigator.clipboard.writeText(newRecoveryCodeDisplayed);
      setCopiedRecoveryCode(true);
      setTimeout(() => setCopiedRecoveryCode(false), 2500);
    } catch (e) {}
  };

  // Profile Form state
  const [profileNameInput, setProfileNameInput] = useState(profile.name || '');
  const [profileEmailInput, setProfileEmailInput] = useState(profile.email || '');
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileUploading, setProfileUploading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const profileFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProfileNameInput(profile.name || '');
    setProfileEmailInput(profile.email || '');
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = profileEmailInput.trim();
    const cleanName = profileNameInput.trim();

    if (!cleanEmail) {
      setProfileError('Email address cannot be empty.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setProfileError('Please enter a valid email address (e.g., yourname@gmail.com).');
      return;
    }

    try {
      setProfileError(null);
      await updateProfile({
        name: cleanName || 'Owner',
        email: cleanEmail,
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile');
    }
  };

  const handleProfileFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    try {
      setProfileUploading(true);
      setProfileError(null);
      await uploadAvatar(file);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to upload image');
    } finally {
      setProfileUploading(false);
      if (profileFileInputRef.current) profileFileInputRef.current.value = '';
    }
  };

  const handleSelectPresetAvatar = async (url: string) => {
    try {
      setProfileUploading(true);
      setProfileError(null);
      await updateProfile({ avatarUrl: url });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to select preset avatar');
    } finally {
      setProfileUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setProfileUploading(true);
      setProfileError(null);
      await removeAvatar();
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to remove avatar');
    } finally {
      setProfileUploading(false);
    }
  };

  // Net worth form state
  const [assetsInput, setAssetsInput] = useState(
    preferences.netWorthConfigured ? preferences.totalAssets.toString() : ''
  );
  const [liabilitiesInput, setLiabilitiesInput] = useState(
    preferences.netWorthConfigured ? preferences.totalLiabilities.toString() : ''
  );
  const [netWorthSaved, setNetWorthSaved] = useState(false);

  // Categories & Accounts adding
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newAccountName, setNewAccountName] = useState('');

  // Category inline editing and status feedback
  const [editingCatName, setEditingCatName] = useState<string | null>(null);
  const [editingCatInput, setEditingCatInput] = useState('');
  const [savingCat, setSavingCat] = useState(false);
  const [catSuccessMsg, setCatSuccessMsg] = useState<string | null>(null);
  const [catSearchQuery, setCatSearchQuery] = useState('');

  const displayedCategories = useMemo(() => {
    if (!catSearchQuery.trim()) return categories;
    const q = catSearchQuery.toLowerCase().trim();
    return categories.filter((c) => c.toLowerCase().includes(q));
  }, [categories, catSearchQuery]);

  // Computed count of transactions utilizing each category
  const categoryTxCounts = useMemo(() => {
    const map: Record<string, number> = {};
    (transactions || []).forEach((t) => {
      if (t.category && typeof t.category === 'string') {
        const lower = t.category.trim().toLowerCase();
        map[lower] = (map[lower] || 0) + 1;
      }
    });
    return map;
  }, [transactions]);

  // Erase All Data modal
  const [isEraseModalOpen, setIsEraseModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [eraseLoading, setEraseLoading] = useState(false);
  const [eraseSuccess, setEraseSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    const numPart = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(absVal);
    return isNegative ? `-₹ ${numPart}` : `₹ ${numPart}`;
  };

  // Live preview of assets minus liabilities
  const previewAssets = parseFloat(assetsInput || '0') || 0;
  const previewLiabilities = parseFloat(liabilitiesInput || '0') || 0;
  const liveNetWorthPreview = previewAssets - previewLiabilities;

  const handleSaveNetWorth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveNetWorth(previewAssets, previewLiabilities);
      setNetWorthSaved(true);
      setTimeout(() => setNetWorthSaved(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save current balance values');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCategoryName.trim();
    if (!clean) return;
    try {
      setErrorMessage(null);
      await addCategory(clean);
      setNewCategoryName('');
      setCatSuccessMsg(`Added new category "${clean}" across all modes and transaction pickers!`);
      setTimeout(() => setCatSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add category');
    }
  };

  const handleStartEditCat = (c: string) => {
    setEditingCatName(c);
    setEditingCatInput(c);
  };

  const handleCancelEditCat = () => {
    setEditingCatName(null);
    setEditingCatInput('');
  };

  const handleSaveEditCat = async (oldName: string) => {
    const cleanNew = editingCatInput.trim();
    if (!cleanNew) {
      setErrorMessage('Category name cannot be empty');
      return;
    }
    if (cleanNew.toLowerCase() === oldName.toLowerCase()) {
      setEditingCatName(null);
      return;
    }
    try {
      setSavingCat(true);
      setErrorMessage(null);
      await updateCategory(oldName, cleanNew);
      const affectedCount = categoryTxCounts[oldName.toLowerCase()] || 0;
      setEditingCatName(null);
      setCatSuccessMsg(
        `Category renamed from "${oldName}" to "${cleanNew}"! Updated across ${affectedCount} transaction(s) and modes.`
      );
      setTimeout(() => setCatSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update category');
    } finally {
      setSavingCat(false);
    }
  };

  const handleDeleteCat = async (c: string) => {
    try {
      setErrorMessage(null);
      const affectedCount = categoryTxCounts[c.toLowerCase()] || 0;
      await deleteCategory(c, 'Expense');
      setCatSuccessMsg(
        `Category "${c}" removed.${affectedCount > 0 ? ` Reassigned ${affectedCount} transaction(s) to "Expense".` : ''}`
      );
      setTimeout(() => setCatSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete category');
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newAccountName.trim();
    if (!clean) return;
    try {
      await addAccount(clean);
      setNewAccountName('');
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleRestoreIgnored = async () => {
    try {
      await restoreIgnoredPatterns();
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleExecuteErase = async () => {
    if (deleteConfirmationText !== 'DELETE') {
      return;
    }

    try {
      setEraseLoading(true);
      setErrorMessage(null);
      await eraseAllData('DELETE ALL LEDGERLY DATA');
      setEraseSuccess(true);
      setIsEraseModalOpen(false);
      setDeleteConfirmationText('');
      setTimeout(() => setEraseSuccess(false), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to erase data');
    } finally {
      setEraseLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#6558D3] dark:text-[#8174f7]" />
          <span>System & Finance Settings</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure financial modes, opening balances, category dictionaries, and sync rules
        </p>
      </div>

      {errorMessage && (
        <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="font-semibold underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {eraseSuccess && (
        <div className="p-4 text-xs bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>
            All data was completely erased and reset to clean initial state.
          </span>
        </div>
      )}

      {/* 0. Profile & Account Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-[#6558D3] dark:text-[#8174f7] flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Account & Profile</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update your registered Gmail address & profile picture for Ledgerly
              </p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Active Account
          </span>
        </div>

        {profileError && (
          <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-center justify-between">
            <span>{profileError}</span>
            <button
              onClick={() => setProfileError(null)}
              className="font-semibold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {profileSaved && (
          <div className="p-3.5 text-xs bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">
              Profile updated successfully! Your new email and profile picture are saved persistently.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Avatar manager (Left 4 cols) */}
          <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-50/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200/70 dark:border-slate-700 text-center">
            <div className="relative group mb-3">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-tr from-[#6558D3] to-indigo-500 text-white flex items-center justify-center text-2xl font-bold ring-4 ring-white dark:ring-slate-700 shadow-md">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.name || 'User Profile'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{(profileNameInput.trim() || profile.name || 'R')[0]?.toUpperCase()}</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => profileFileInputRef.current?.click()}
                disabled={profileUploading}
                className="absolute bottom-0 right-0 p-2 bg-[#6558D3] hover:bg-[#5749c4] text-white rounded-full shadow-md transition cursor-pointer active:scale-95"
                title="Upload custom photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <input
              ref={profileFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfileFileChange}
              className="hidden"
            />

            <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate max-w-[200px]">
              {profile.name || 'Owner'}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px] mb-3" title={profile.email}>
              {profile.email}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => profileFileInputRef.current?.click()}
                disabled={profileUploading}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3 h-3 text-[#6558D3] dark:text-[#8174f7]" />
                <span>{profileUploading ? 'Uploading...' : 'Upload Photo'}</span>
              </button>

              {profile.avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={profileUploading}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                  title="Reset to initial avatar"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove</span>
                </button>
              )}
            </div>

            {/* Presets */}
            <div className="w-full mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">
                Preset Avatars
              </span>
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {AVATAR_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPresetAvatar(preset)}
                    className={`w-7 h-7 rounded-full overflow-hidden transition-all border-2 cursor-pointer hover:scale-110 ${
                      profile.avatarUrl === preset
                        ? 'border-[#6558D3] dark:border-[#8174f7] scale-105 ring-2 ring-[#6558D3]/30'
                        : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={preset}
                      alt={`Avatar ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Form details (Right 8 cols) */}
          <form onSubmit={handleSaveProfile} className="md:col-span-8 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Display Name
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={profileNameInput}
                  onChange={(e) => setProfileNameInput(e.target.value)}
                  placeholder="e.g. Ravi"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Gmail / Email Address
                </label>
                <span className="text-[10px] font-semibold text-[#6558D3] dark:text-[#8174f7]">
                  Editable & Persistent
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  value={profileEmailInput}
                  onChange={(e) => setProfileEmailInput(e.target.value)}
                  placeholder="e.g. yourname@gmail.com"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Update this email address whenever you want to access Ledgerly using a different Gmail/email account. All financial modes, transactions, and settings remain permanently connected.
              </p>
            </div>

            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#6558D3] dark:text-[#8174f7] shrink-0 mt-0.5" />
              <div className="text-[11px] text-indigo-900 dark:text-indigo-200 leading-relaxed">
                <strong className="font-semibold">Persistent Vault Sync: </strong>
                Your profile settings are saved in the persistent backend database. Both the email address and profile picture will stay updated across sessions.
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={profileUploading}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {profileSaved ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Save Profile Changes</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 0.5. PIN Security & Owner Authentication */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-[#6558D3] dark:text-[#8174f7] flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">PIN Security & Authentication</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                4-digit PIN protection for owner access with unique recovery code verification
              </p>
            </div>
          </div>
          {pinStatus?.pinEnabled ? (
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              PIN Protection Active
            </span>
          ) : (
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              No PIN Lock (Unlocked)
            </span>
          )}
        </div>

        {/* Grid layout for PIN and Recovery details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: 4-Digit PIN Access */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-[#6558D3]" />
                Owner Access PIN
              </span>
              {pinStatus?.pinEnabled ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  {pinStatus?.isCustomPin ? 'Custom PIN Applied' : '4-Digit PIN Active'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  Unlocked
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {pinStatus?.pinEnabled
                ? 'Your 4-digit PIN secures owner data. Automatically locks when leaving the app for 5 seconds, switching apps or files, or removing from Recent Apps. Never stays unlocked in the background.'
                : 'No PIN lock is currently active. The vault opens immediately without prompting for a PIN.'}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {pinStatus?.pinEnabled ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setPinChangeError(null);
                      setPinChangeSuccess(null);
                      setNewRecoveryCodeDisplayed(null);
                      setCurrentPinInput('');
                      setNewPinInput('');
                      setConfirmPinInput('');
                      setIsPinModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl shadow-xs transition cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Change PIN</span>
                  </button>
                  <button
                    type="button"
                    disabled={isRemovingPin}
                    onClick={handleRemovePin}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition cursor-pointer disabled:opacity-50"
                    title="Remove PIN lock completely"
                  >
                    {isRemovingPin ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5 text-rose-500" />}
                    <span>Remove PIN</span>
                  </button>
                  <button
                    type="button"
                    onClick={lockApp}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
                    title="Lock session now to test PIN screen"
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Lock App Now</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setPinChangeError(null);
                    setPinChangeSuccess(null);
                    setNewRecoveryCodeDisplayed(null);
                    setCurrentPinInput('');
                    setNewPinInput('');
                    setConfirmPinInput('');
                    setIsPinModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl shadow-xs transition cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Set Up PIN</span>
                </button>
              )}
            </div>
          </div>

          {/* Card 2: Security & Recovery */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#6558D3]" />
                Recovery & Security Status
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                {pinStatus?.pinEnabled ? 'Recovery Protected' : 'Ready to Configure'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {pinStatus?.pinEnabled
                ? 'A unique recovery code protects your financial ledger. When you change your PIN, a new recovery code is generated.'
                : 'You can enable 4-digit PIN protection at any time to secure your financial vault against unauthorized access.'}
            </p>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                <Info className="w-3.5 h-3.5 text-[#6558D3] shrink-0" />
                <span>PIN protection is optional and can be toggled on or removed at any time.</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Change / Set Up PIN Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-[#6558D3] dark:text-[#8174f7] flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {newRecoveryCodeDisplayed
                      ? 'New Recovery Code'
                      : pinStatus?.pinEnabled
                      ? 'Change 4-Digit PIN'
                      : 'Set Up 4-Digit PIN'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {newRecoveryCodeDisplayed
                      ? 'Save your unique recovery code'
                      : pinStatus?.pinEnabled
                      ? 'Enter current PIN followed by your new 4-digit PIN'
                      : 'Choose a 4-digit PIN to secure your financial ledger'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPinModalOpen(false);
                  setNewRecoveryCodeDisplayed(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {pinChangeError && (
              <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pinChangeError}</span>
              </div>
            )}

            {pinChangeSuccess && !newRecoveryCodeDisplayed && (
              <div className="p-3 text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{pinChangeSuccess}</span>
              </div>
            )}

            {newRecoveryCodeDisplayed ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-2">
                  <span className="text-[10px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                    Your New Unique Recovery Code
                  </span>
                  <div className="text-base sm:text-lg font-mono font-bold tracking-widest text-[#6558D3] dark:text-[#8174f7] select-all py-1">
                    {newRecoveryCodeDisplayed}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyNewRecoveryCode}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition cursor-pointer shadow-2xs"
                  >
                    {copiedRecoveryCode ? (
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

                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Important Notice
                  </p>
                  <p className="text-amber-700/90 dark:text-amber-400/90 leading-relaxed">
                    This recovery code is only displayed once. Please save it in a safe place. If you ever forget your new PIN, this code is the only way to reset it.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsPinModalOpen(false);
                    setNewRecoveryCodeDisplayed(null);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#6558D3] hover:bg-[#5245c0] text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>I Have Saved My Code — Done</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleSavePin} className="space-y-4">
                {/* Step 1: Current PIN (only if PIN is currently enabled) */}
                {pinStatus?.pinEnabled && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Current 4-Digit PIN <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPin ? 'text' : 'password'}
                        maxLength={4}
                        value={currentPinInput}
                        onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="••••"
                        className="w-full text-center tracking-widest text-lg font-mono px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6558D3]"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPin(!showCurrentPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {showCurrentPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-1.5 text-[11px]">
                      <span className="text-slate-400 dark:text-slate-500">
                        Enter your current 4-digit PIN
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsPinModalOpen(false);
                          lockApp();
                        }}
                        className="text-[#6558D3] hover:text-[#5749c4] dark:text-[#8174f7] font-medium underline cursor-pointer"
                      >
                        Forgot Current PIN?
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: New PIN */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    New 4-Digit PIN <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPin ? 'text' : 'password'}
                      maxLength={4}
                      value={newPinInput}
                      onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="••••"
                      className="w-full text-center tracking-widest text-lg font-mono px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6558D3]"
                      autoFocus={!pinStatus?.pinEnabled}
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

                {/* Step 3: Confirm New PIN */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm New 4-Digit PIN <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type={showNewPin ? 'text' : 'password'}
                    maxLength={4}
                    value={confirmPinInput}
                    onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    className="w-full text-center tracking-widest text-lg font-mono px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6558D3]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsPinModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isChangingPin ||
                      (pinStatus?.pinEnabled && currentPinInput.length !== 4) ||
                      newPinInput.length !== 4 ||
                      confirmPinInput.length !== 4
                    }
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {isChangingPin ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving PIN...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Save & Apply PIN</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 1. Custom Finance Modes Manager */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-[#6558D3] dark:text-[#8174f7] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Finance Modes ({modes.length})</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Independent financial dashboards with dedicated starting balances & category rules
              </p>
            </div>
          </div>
          <button
            onClick={openCreateModeModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Mode</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {modes.map((mode) => {
            const IconComp = getIconComponent(mode.icon);
            const isCurrent = activeModeId === mode.id;

            return (
              <div
                key={mode.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isCurrent
                    ? 'border-slate-900 dark:border-slate-700 bg-slate-900 dark:bg-slate-800 text-white shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-800 dark:text-slate-100'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                        style={{ backgroundColor: mode.color || '#6558D3' }}
                      >
                        <IconComp className="w-4 h-4" />
                      </span>
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{mode.name}</span>
                    </div>
                    {mode.isCustom && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                          isCurrent
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        Custom
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-[11px] line-clamp-2 mb-3 ${
                      isCurrent ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {mode.description || 'Dedicated financial profile'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/40 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <div>
                    <span
                      className={`text-[10px] uppercase font-semibold block ${
                        isCurrent ? 'text-slate-400' : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      Opening Balance
                    </span>
                    <span className="font-sans tabular-nums font-bold text-slate-900 dark:text-white">
                      {formatCurrency(mode.startingBalance || 0)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {mode.id !== 'combined' && (
                      <button
                        onClick={() => openEditModeModal(mode)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isCurrent
                            ? 'text-slate-300 hover:text-white hover:bg-white/10'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                        title="Edit mode opening balance or categories"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {!isCurrent && (
                      <button
                        onClick={() => switchMode(mode.id)}
                        className="px-2 py-1 text-[11px] font-semibold bg-[#6558D3] text-white rounded-lg hover:bg-[#5749c4] transition-all cursor-pointer"
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Current Balance Sheet Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Current Balance Sheet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Total Assets − Total Liabilities. Cash flow does not automatically shift current balance.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveNetWorth} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Total Assets (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={assetsInput}
                onChange={(e) => setAssetsInput(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Savings, investments, real estate, cash
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Total Liabilities (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={liabilitiesInput}
                onChange={(e) => setLiabilitiesInput(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Loans, mortgages, credit card balances
              </p>
            </div>
          </div>

          {/* Live Current Balance Preview */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase text-slate-400 dark:text-slate-500">
                Live Current Balance Preview
              </span>
              <div className="text-xl font-bold text-slate-900 dark:text-white font-sans tabular-nums tracking-tight mt-0.5">
                {formatCurrency(liveNetWorthPreview)}
              </div>
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl shadow-xs cursor-pointer"
            >
              {netWorthSaved ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Current Balance</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 3. Categories Management */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#6558D3] dark:text-[#8174f7]" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Category Dictionary ({categories.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Synchronized across all finance modes & transactions
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Adding, renaming, or removing a category in Settings instantly updates all associated historical transactions, budgets, rules, and finance modes.
        </p>

        {catSuccessMsg && (
          <div className="p-3 text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center gap-2 transition-all">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-medium">{catSuccessMsg}</span>
          </div>
        )}

        {/* Add Category Form & Search Filter */}
        <div className="flex flex-col sm:flex-row gap-2">
          <form onSubmit={handleAddCategory} className="flex-1 flex gap-2">
            <input
              type="text"
              placeholder="Enter new category name (e.g. Groceries, Consulting)..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1 px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3] transition"
            />
            <button
              type="submit"
              disabled={!newCategoryName.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl disabled:opacity-50 transition cursor-pointer shadow-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Category</span>
            </button>
          </form>

          {categories.length > 5 && (
            <input
              type="text"
              placeholder="Search categories..."
              value={catSearchQuery}
              onChange={(e) => setCatSearchQuery(e.target.value)}
              className="sm:w-48 px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3] transition"
            />
          )}
        </div>

        {/* Categories List with inline editing */}
        <div className="max-h-72 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
          {displayedCategories.map((c) => {
            const isEditing = editingCatName === c;
            const txCount = categoryTxCounts[c.toLowerCase()] || 0;
            const isExpenseProtected = c.toLowerCase() === 'expense';

            return (
              <div
                key={c}
                className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                  isEditing
                    ? 'border-[#6558D3] dark:border-[#8174f7] bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-[#6558D3]/20'
                    : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
                }`}
              >
                {isEditing ? (
                  <div className="flex items-center gap-1.5 w-full">
                    <input
                      type="text"
                      autoFocus
                      value={editingCatInput}
                      onChange={(e) => setEditingCatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEditCat(c);
                        if (e.key === 'Escape') handleCancelEditCat();
                      }}
                      className="flex-1 px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-[#6558D3]"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEditCat(c)}
                      disabled={savingCat}
                      className="p-1.5 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg transition cursor-pointer"
                      title="Save and update all transactions"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEditCat}
                      disabled={savingCat}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition cursor-pointer"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate" title={c}>
                        {c}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                          txCount > 0
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-[#6558D3] dark:text-[#8174f7]'
                            : 'bg-slate-200/60 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                        title={`${txCount} transaction(s) using this category`}
                      >
                        {txCount > 0 ? `${txCount} txs` : '0'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEditCat(c)}
                        className="p-1 text-slate-400 hover:text-[#6558D3] dark:hover:text-[#8174f7] hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-md transition cursor-pointer"
                        title="Edit / Rename category across all transactions"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>

                      {!isExpenseProtected && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCat(c)}
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition cursor-pointer"
                          title={
                            txCount > 0
                              ? `Delete and reassign ${txCount} transaction(s) to "Expense"`
                              : 'Delete category'
                          }
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Recurring Detection Engine Settings */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-[#6558D3] dark:text-[#8174f7]" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Recurring Detection Rules
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Ignored patterns: <strong>{recurringData?.ignoredCount || 0}</strong>
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          हिसाब-किताब detects recurring commitments by normalizing merchant names and analyzing transaction intervals across supported cadences:
          Weekly (5–9 days), Biweekly (12–17 days), Monthly (24–40 days), Quarterly (75–110 days), and Annual (330–400 days).
        </p>

        {recurringData && recurringData.ignoredCount > 0 && (
          <div className="pt-2">
            <button
              onClick={handleRestoreIgnored}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#6558D3] dark:text-[#8174f7] bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl transition-all cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restore {recurringData.ignoredCount} Ignored Suggestion(s)</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. Google Drive Synchronization Settings */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-[#6558D3] dark:text-[#8174f7]" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Google Drive Synchronization</h3>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800">
            Protected Server Endpoint
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 rounded-xl space-y-1">
            <p className="text-slate-400 dark:text-slate-500 uppercase text-[10px] font-semibold">Dedicated Folder</p>
            <p className="font-semibold text-slate-800 dark:text-white">
              {driveStatus?.folderName || 'हिसाब-किताब Financial Inbox'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Only direct child files are processed. Original Drive files are never modified or deleted.
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 rounded-xl space-y-1">
            <p className="text-slate-400 dark:text-slate-500 uppercase text-[10px] font-semibold">Schedule & Sync Time</p>
            <p className="font-semibold text-slate-800 dark:text-white">
              Daily at 8:00 AM ({preferences.timezone})
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Last executed:{' '}
              {driveStatus?.lastSyncTimestamp
                ? new Date(driveStatus.lastSyncTimestamp).toLocaleString()
                : 'Awaiting initial trigger'}
            </p>
          </div>
        </div>
      </div>

      {/* 6. Complete Data Deletion Card (Destructive) */}
      <div className="bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-6 space-y-3">
        <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200">
          <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          <h3 className="text-sm font-bold">Erase All हिसाब-किताब Data</h3>
        </div>
        <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
          Permanently delete all financial transactions, documents, rules, tags, budgets, and goals from the database and storage vault.
        </p>

        <button
          onClick={() => {
            setDeleteConfirmationText('');
            setIsEraseModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Erase All हिसाब-किताब Data</span>
        </button>
      </div>

      {/* Exact Match DELETE Modal */}
      {isEraseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setIsEraseModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-rose-200 dark:border-rose-900/60 p-6 z-10 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Confirm Complete Data Erasure
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              This action is strictly irreversible. All records, documents in vault, budgets, and settings will be permanently erased.
              To confirm, type <strong className="text-rose-600 dark:text-rose-400 font-mono">DELETE</strong> below:
            </p>

            <input
              type="text"
              placeholder="Type DELETE to confirm"
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 mb-4"
              autoFocus
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEraseModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmationText !== 'DELETE' || eraseLoading}
                onClick={handleExecuteErase}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {eraseLoading ? 'Erasing All Data...' : 'Permanently Erase All Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

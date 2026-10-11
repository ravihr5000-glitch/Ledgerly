import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Check,
  Briefcase,
  User,
  Layers,
  Home,
  Plane,
  Building2,
  Landmark,
  Wallet,
  DollarSign,
  ShoppingBag,
  Folder,
  Tag,
  Car,
  Heart,
  GraduationCap,
  Coffee,
  Wrench,
  Shield,
  TrendingUp,
  Globe,
  Gift,
  Smartphone,
  PieChart,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { FinanceMode } from '../../types/finance';

export const AVAILABLE_ICONS = [
  { name: 'Briefcase', component: Briefcase, label: 'Business' },
  { name: 'User', component: User, label: 'Personal' },
  { name: 'Layers', component: Layers, label: 'Combined' },
  { name: 'Home', component: Home, label: 'Property / Home' },
  { name: 'Plane', component: Plane, label: 'Travel' },
  { name: 'Building2', component: Building2, label: 'Real Estate' },
  { name: 'Landmark', component: Landmark, label: 'Banking' },
  { name: 'Wallet', component: Wallet, label: 'Cash / Wallet' },
  { name: 'DollarSign', component: DollarSign, label: 'Income' },
  { name: 'ShoppingBag', component: ShoppingBag, label: 'Retail' },
  { name: 'Car', component: Car, label: 'Auto' },
  { name: 'Heart', component: Heart, label: 'Health / Family' },
  { name: 'GraduationCap', component: GraduationCap, label: 'Education' },
  { name: 'Coffee', component: Coffee, label: 'Lifestyle' },
  { name: 'Wrench', component: Wrench, label: 'Maintenance' },
  { name: 'Shield', component: Shield, label: 'Insurance' },
  { name: 'TrendingUp', component: TrendingUp, label: 'Investments' },
  { name: 'Globe', component: Globe, label: 'Online / Tech' },
  { name: 'Gift', component: Gift, label: 'Special Events' },
  { name: 'Smartphone', component: Smartphone, label: 'Digital' },
  { name: 'PieChart', component: PieChart, label: 'Budgeting' },
  { name: 'Tag', component: Tag, label: 'General' },
];

export const AVAILABLE_COLORS = [
  { id: 'indigo', name: 'Royal Indigo', hex: '#6558D3' },
  { id: 'emerald', name: 'Emerald Green', hex: '#10B981' },
  { id: 'blue', name: 'Sky Blue', hex: '#3B82F6' },
  { id: 'amber', name: 'Amber Gold', hex: '#F59E0B' },
  { id: 'rose', name: 'Rose Red', hex: '#F43F5E' },
  { id: 'cyan', name: 'Teal Cyan', hex: '#06B6D4' },
  { id: 'purple', name: 'Deep Purple', hex: '#8B5CF6' },
  { id: 'slate', name: 'Slate Gray', hex: '#64748B' },
];

export function getIconComponent(iconName: string): React.ComponentType<{ className?: string }> {
  const found = AVAILABLE_ICONS.find((i) => i.name === iconName);
  return found ? found.component : Briefcase;
}

export const CreateModeModal: React.FC = () => {
  const {
    isCreateModeModalOpen,
    editingMode,
    closeModeModal,
    createMode,
    updateMode,
    deleteMode,
  } = useFinance();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Briefcase');
  const [selectedColor, setSelectedColor] = useState('#6558D3');
  const [startingBalance, setStartingBalance] = useState('0');
  const [categories, setCategories] = useState<string[]>(['Expense', 'Other']);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [allowReceipts, setAllowReceipts] = useState(true);
  const [allowTags, setAllowTags] = useState(true);
  const [allowNotes, setAllowNotes] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Sync state when editing mode changes
  useEffect(() => {
    if (editingMode) {
      setName(editingMode.name);
      setDescription(editingMode.description || '');
      setSelectedIcon(editingMode.icon || 'Briefcase');
      setSelectedColor(editingMode.color || '#6558D3');
      setStartingBalance(editingMode.startingBalance?.toString() || '0');
      setCategories(editingMode.categories && editingMode.categories.length > 0 ? [...editingMode.categories] : ['Expense', 'Other']);
      setAllowReceipts(editingMode.settings?.allowReceipts ?? true);
      setAllowTags(editingMode.settings?.allowTags ?? true);
      setAllowNotes(editingMode.settings?.allowNotes ?? true);
    } else {
      setName('');
      setDescription('');
      setSelectedIcon('Briefcase');
      setSelectedColor('#6558D3');
      setStartingBalance('0');
      setCategories(['Expense', 'Other']);
      setAllowReceipts(true);
      setAllowTags(true);
      setAllowNotes(true);
    }
    setError(null);
    setDeleteConfirmOpen(false);
  }, [editingMode, isCreateModeModalOpen]);

  // Contextual category suggestions based on mode name
  const suggestedCategories = useMemo(() => {
    const q = name.toLowerCase().trim();
    if (!q) {
      return ['Expense', 'Income', 'Supplies', 'Services', 'Operations', 'Other'];
    }

    if (q.includes('travel') || q.includes('trip') || q.includes('tour') || q.includes('vacation')) {
      return ['Flights', 'Hotels', 'Food & Dining', 'Transport', 'Activities', 'Sightseeing', 'Shopping', 'Travel Insurance', 'Expense', 'Other'];
    }
    if (q.includes('freelance') || q.includes('client') || q.includes('consult')) {
      return ['Client Payments', 'Software & Tools', 'Marketing', 'Equipment', 'Office', 'Contractors', 'Taxes', 'Expense', 'Other'];
    }
    if (q.includes('rent') || q.includes('property') || q.includes('real estate') || q.includes('tenant')) {
      return ['Rental Income', 'Maintenance', 'Property Tax', 'Insurance', 'Utilities', 'Mortgage & Loan', 'Repairs', 'Legal Fees', 'Expense', 'Other'];
    }
    if (q.includes('family') || q.includes('home') || q.includes('house') || q.includes('living')) {
      return ['Groceries', 'Housing & Rent', 'Utilities', 'Healthcare', 'Kids & School', 'Dining Out', 'Entertainment', 'Shopping', 'Expense', 'Other'];
    }
    if (q.includes('side') || q.includes('business') || q.includes('store') || q.includes('shop') || q.includes('agency')) {
      return ['Sales Revenue', 'Payroll & Freelancers', 'Inventory', 'Platform Fees', 'Ads & Marketing', 'Shipping', 'Software', 'Expense', 'Other'];
    }
    if (q.includes('saving') || q.includes('invest') || q.includes('wealth') || q.includes('stock')) {
      return ['Bank Deposits', 'Dividends', 'Mutual Funds', 'Stocks & Equity', 'Crypto', 'Emergency Fund', 'Gold', 'Expense', 'Other'];
    }

    return ['Direct Income', 'Services', 'Supplies', 'Logistics', 'Operations', 'Utilities', 'Expense', 'Other'];
  }, [name]);

  if (!isCreateModeModalOpen) return null;

  const handleAddCategory = () => {
    const clean = newCategoryInput.trim();
    if (clean && !categories.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      setCategories([...categories, clean]);
      setNewCategoryInput('');
    }
  };

  const handleToggleSuggested = (cat: string) => {
    if (categories.some((c) => c.toLowerCase() === cat.toLowerCase())) {
      // Remove
      setCategories(categories.filter((c) => c.toLowerCase() !== cat.toLowerCase()));
    } else {
      // Add
      setCategories([...categories, cat]);
    }
  };

  const handleRemoveCategory = (cat: string) => {
    if (cat.toLowerCase() === 'expense') {
      // Keep expense as required
      return;
    }
    setCategories(categories.filter((c) => c !== cat));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide a mode name.');
      return;
    }

    const numBalance = parseFloat(startingBalance);
    if (isNaN(numBalance)) {
      setError('Please provide a valid starting balance number.');
      return;
    }

    const finalCategories = [...categories];
    if (!finalCategories.some((c) => c.toLowerCase() === 'expense')) {
      finalCategories.unshift('Expense');
    }

    try {
      setLoading(true);
      if (editingMode) {
        await updateMode(editingMode.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          icon: selectedIcon,
          color: selectedColor,
          startingBalance: numBalance,
          categories: finalCategories,
          settings: {
            allowReceipts,
            allowTags,
            allowNotes,
          },
        });
      } else {
        await createMode({
          name: name.trim(),
          description: description.trim() || undefined,
          icon: selectedIcon,
          color: selectedColor,
          startingBalance: numBalance,
          categories: finalCategories,
          settings: {
            allowReceipts,
            allowTags,
            allowNotes,
          },
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save financial mode.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingMode) return;
    try {
      setLoading(true);
      await deleteMode(editingMode.id);
      closeModeModal();
    } catch (err: any) {
      setError(err.message || 'Failed to delete mode.');
    } finally {
      setLoading(false);
    }
  };

  const SelectedIconComp = getIconComponent(selectedIcon);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={closeModeModal}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col z-10 border border-slate-200 dark:border-slate-800 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 transition-colors">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: selectedColor }}
            >
              <SelectedIconComp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {editingMode ? `Edit Finance Mode: ${editingMode.name}` : 'Create Custom Finance Mode'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure dedicated accounts, opening balances & category logic
              </p>
            </div>
          </div>
          <button
            onClick={closeModeModal}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          {/* Mode Name & Description */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Mode Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Travel Budget, Freelance Income, Rental Property, Side Business"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Description (Optional)
              </label>
              <input
                type="text"
                placeholder="Brief purpose or notes for this financial profile"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all"
              />
            </div>
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
              Mode Icon
            </label>
            <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 max-h-36 overflow-y-auto">
              {AVAILABLE_ICONS.map((iconItem) => {
                const IconComp = iconItem.component;
                const isSelected = selectedIcon === iconItem.name;
                return (
                  <button
                    key={iconItem.name}
                    type="button"
                    onClick={() => setSelectedIcon(iconItem.name)}
                    className={`p-2 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white dark:bg-slate-700 shadow-xs border-2 text-slate-900 dark:text-white font-bold scale-105'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                    }`}
                    style={isSelected ? { borderColor: selectedColor } : {}}
                    title={iconItem.label}
                  >
                    <IconComp className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
              Theme Color
            </label>
            <div className="flex flex-wrap gap-2.5 items-center">
              {AVAILABLE_COLORS.map((col) => {
                const isSelected = selectedColor.toLowerCase() === col.hex.toLowerCase();
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setSelectedColor(col.hex)}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-xs cursor-pointer ring-1 ring-black/10 dark:ring-white/20"
                    style={{ backgroundColor: col.hex }}
                    title={col.name}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Starting Balance */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
              Starting Opening Balance (₹ INR)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">₹</span>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={startingBalance}
                onChange={(e) => setStartingBalance(e.target.value)}
                className="w-full pl-8 pr-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3] font-sans tabular-nums font-semibold transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Current Balance will be calculated as Starting Balance + Total Money In − Total Money Out.
            </p>
          </div>

          {/* Categories Management */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Transaction Categories</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {categories.length} configured
              </span>
            </div>

            {/* Active configured categories */}
            <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl min-h-[46px] mb-2.5">
              {categories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-white text-slate-800 font-medium rounded-lg border border-slate-200 shadow-xs"
                >
                  <span>{cat}</span>
                  {cat.toLowerCase() !== 'expense' && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(cat)}
                      className="text-slate-400 hover:text-rose-600 rounded p-0.5 ml-0.5 transition-colors cursor-pointer"
                      title="Remove category"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>

            {/* Add Custom Category input */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Add custom category name"
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCategory();
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6558D3]"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Contextual Suggested Categories chips */}
            <div>
              <p className="text-[11px] font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                <span>Suggested for {name ? `"${name}"` : 'this mode'}:</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suggestedCategories.map((scat) => {
                  const isAdded = categories.some((c) => c.toLowerCase() === scat.toLowerCase());
                  return (
                    <button
                      key={scat}
                      type="button"
                      onClick={() => handleToggleSuggested(scat)}
                      className={`text-[11px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                        isAdded
                          ? 'bg-indigo-50 border-indigo-200 text-[#6558D3] font-semibold'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {isAdded ? `✓ ${scat}` : `+ ${scat}`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mode Settings: Available Transaction Fields */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
              Transaction Field Settings
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={allowReceipts}
                  onChange={(e) => setAllowReceipts(e.target.checked)}
                  className="rounded text-[#6558D3] focus:ring-[#6558D3]"
                />
                <span className="font-medium text-slate-700">Receipts & Vault</span>
              </label>
              <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={allowTags}
                  onChange={(e) => setAllowTags(e.target.checked)}
                  className="rounded text-[#6558D3] focus:ring-[#6558D3]"
                />
                <span className="font-medium text-slate-700">Custom Tags</span>
              </label>
              <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={allowNotes}
                  onChange={(e) => setAllowNotes(e.target.checked)}
                  className="rounded text-[#6558D3] focus:ring-[#6558D3]"
                />
                <span className="font-medium text-slate-700">Audit Notes</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            {editingMode && editingMode.isCustom ? (
              <div>
                {deleteConfirmOpen ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-rose-600 font-semibold">Confirm delete?</span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={loading}
                      className="px-2.5 py-1 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700"
                    >
                      Yes, Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmOpen(false)}
                      className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Mode</span>
                  </button>
                )}
              </div>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeModeModal}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl transition-all shadow-sm shadow-[#6558D3]/30 disabled:opacity-60 cursor-pointer"
              >
                {loading ? 'Saving...' : editingMode ? 'Save Changes' : 'Create & Activate Mode'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

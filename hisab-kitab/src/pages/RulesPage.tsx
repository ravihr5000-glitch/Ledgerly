import React, { useState } from 'react';
import {
  Sliders,
  Plus,
  Trash2,
  Edit2,
  Tag as TagIcon,
  ToggleLeft,
  ToggleRight,
  Check,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { CategorizationRule } from '../types/finance';

export const RulesPage: React.FC = () => {
  const {
    rules,
    tags,
    categories,
    createRule,
    updateRule,
    deleteRule,
    createTag,
    deleteTag,
    setIsTagModalOpen,
  } = useFinance();

  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CategorizationRule | null>(null);

  const [formPattern, setFormPattern] = useState('');
  const [formMatchType, setFormMatchType] = useState<'contains' | 'exact' | 'starts_with'>('contains');
  const [formTargetCategory, setFormTargetCategory] = useState(categories[0] || 'Groceries');
  const [formTargetTags, setFormTargetTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Quick tag creation
  const [quickTagName, setQuickTagName] = useState('');
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);
  const [removeHistorical, setRemoveHistorical] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setEditingRule(null);
    setFormPattern('');
    setFormMatchType('contains');
    setFormTargetCategory(categories[0] || 'Groceries');
    setFormTargetTags([]);
    setTagInput('');
    setError(null);
    setIsRuleModalOpen(true);
  };

  const handleOpenEdit = (r: CategorizationRule) => {
    setEditingRule(r);
    setFormPattern(r.merchantPattern);
    setFormMatchType(r.matchType);
    setFormTargetCategory(r.targetCategory);
    setFormTargetTags(r.targetTags || []);
    setTagInput('');
    setError(null);
    setIsRuleModalOpen(true);
  };

  const handleToggleRule = async (r: CategorizationRule) => {
    await updateRule(r.id, { enabled: !r.enabled });
  };

  const handleAddTagToRule = () => {
    const clean = tagInput.trim().replace(/^#/, '');
    if (clean && !formTargetTags.includes(clean)) {
      setFormTargetTags([...formTargetTags, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTagFromRule = (tagToRemove: string) => {
    setFormTargetTags(formTargetTags.filter((t) => t !== tagToRemove));
  };

  const handleToggleTagInRule = (tagName: string) => {
    if (formTargetTags.includes(tagName)) {
      handleRemoveTagFromRule(tagName);
    } else {
      setFormTargetTags([...formTargetTags, tagName]);
    }
  };

  const handleRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPattern.trim()) {
      setError('Merchant pattern is required.');
      return;
    }

    try {
      setLoading(true);
      if (editingRule) {
        await updateRule(editingRule.id, {
          merchantPattern: formPattern.trim(),
          matchType: formMatchType,
          targetCategory: formTargetCategory,
          targetTags: formTargetTags,
        });
      } else {
        await createRule({
          merchantPattern: formPattern.trim(),
          matchType: formMatchType,
          targetCategory: formTargetCategory,
          targetTags: formTargetTags,
          enabled: true,
        });
      }
      setIsRuleModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save rule.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = quickTagName.trim();
    if (!clean) return;
    try {
      await createTag(clean);
      setQuickTagName('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleConfirmDeleteTag = async () => {
    if (!tagToDelete) return;
    try {
      await deleteTag(tagToDelete, removeHistorical);
      setTagToDelete(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Categorization Rules & Tags
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Automate future transaction categorization upon import (applied after duplicate checks)
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl shadow-xs cursor-pointer transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Rule</span>
        </button>
      </div>

      {/* Rules Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Rules</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Rules execute automatically on bank statements and document imports.
            </p>
          </div>
          <span className="text-xs font-sans tabular-nums text-slate-400 dark:text-slate-500">
            {rules.length} rule{rules.length === 1 ? '' : 's'}
          </span>
        </div>

        {rules.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl">
            <Sliders className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No categorization rules</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Add rules like: &quot;If merchant contains &apos;Uber&apos;, set Category to &apos;Transportation&apos;&quot;
            </p>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Rule</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="py-3 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/50 px-2.5 rounded-xl transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleRule(rule)}
                      className={`text-sm cursor-pointer transition-colors ${
                        rule.enabled ? 'text-[#6558D3] dark:text-[#8174f7]' : 'text-slate-300 dark:text-slate-600'
                      }`}
                      title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                    >
                      {rule.enabled ? (
                        <ToggleRight className="w-6 h-6" />
                      ) : (
                        <ToggleLeft className="w-6 h-6" />
                      )}
                    </button>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      When merchant{' '}
                      <span className="text-[#6558D3] dark:text-[#9f94f9] font-mono font-bold">
                        {rule.matchType} &quot;{rule.merchantPattern}&quot;
                      </span>
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-8 flex items-center gap-2 flex-wrap">
                    <span>
                      Assign Category:{' '}
                      <strong className="text-slate-800 dark:text-slate-200">{rule.targetCategory}</strong>
                    </span>
                    {rule.targetTags && rule.targetTags.length > 0 && (
                      <span className="flex items-center gap-1">
                        • Tags:
                        {rule.targetTags.map((t) => (
                          <span
                            key={t}
                            className="inline-block px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[10px]"
                          >
                            #{t}
                          </span>
                        ))}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    onClick={() => handleOpenEdit(rule)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    title="Edit rule"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    title="Delete rule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tags Management Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tag Directory</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Create tags with name only. Tags are independent of categories.
            </p>
          </div>
        </div>

        {/* Quick Tag Creator */}
        <form onSubmit={handleQuickAddTag} className="flex gap-2 max-w-md">
          <input
            type="text"
            placeholder="New tag name (e.g. WorkTrip, Gifts, Deductible)"
            value={quickTagName}
            onChange={(e) => setQuickTagName(e.target.value)}
            className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3]"
          />
          <button
            type="submit"
            disabled={!quickTagName.trim()}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl shadow-xs cursor-pointer transition-colors disabled:opacity-50"
          >
            Add Tag
          </button>
        </form>

        {/* Tags List */}
        {tags.length === 0 ? (
          <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl">
            <TagIcon className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">No tags configured</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {tags.map((t) => (
              <div
                key={t.name}
                className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs"
              >
                <div className="min-w-0 pr-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                    #{t.name}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-sans tabular-nums">
                    {t.count} transaction{t.count === 1 ? '' : 's'}
                  </span>
                </div>
                <button
                  onClick={() => setTagToDelete(t.name)}
                  className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
                  title="Delete tag"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tag Delete Confirmation */}
        {tagToDelete && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl space-y-3">
            <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
              Delete tag &quot;#{tagToDelete}&quot;?
            </p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={removeHistorical}
                onChange={(e) => setRemoveHistorical(e.target.checked)}
                className="w-3.5 h-3.5 text-rose-600 dark:text-rose-500 rounded border-rose-300 dark:border-rose-800 dark:bg-slate-800"
              />
              <span className="text-[11px] font-medium text-rose-800 dark:text-rose-300">
                Also remove this tag from existing historical transactions
              </span>
            </label>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setTagToDelete(null)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteTag}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer transition-colors"
              >
                Delete Tag
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Rule Modal */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setIsRuleModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 z-10 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
              {editingRule ? 'Edit Rule' : 'Create Categorization Rule'}
            </h3>

            {error && (
              <div className="p-3 mb-3 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleRuleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Merchant Condition *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={formMatchType}
                    onChange={(e) => setFormMatchType(e.target.value as any)}
                    className="px-2 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3]"
                  >
                    <option value="contains">Contains</option>
                    <option value="exact">Exact</option>
                    <option value="starts_with">Starts with</option>
                  </select>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Costco, Chevron"
                    value={formPattern}
                    onChange={(e) => setFormPattern(e.target.value)}
                    className="col-span-2 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Category *
                </label>
                <select
                  value={formTargetCategory}
                  onChange={(e) => setFormTargetCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3]"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Tags (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Auto-Attach Tags <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Type tag & press enter"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTagToRule();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3]"
                  />
                  <button
                    type="button"
                    onClick={handleAddTagToRule}
                    disabled={!tagInput.trim()}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer disabled:opacity-40 transition-colors"
                  >
                    Add
                  </button>
                </div>

                {/* Selected Tags Pills */}
                {formTargetTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {formTargetTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#6558D3]/10 dark:bg-[#6558D3]/20 border border-[#6558D3]/30 text-[#6558D3] dark:text-[#9f94f9] text-[11px] font-medium"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTagFromRule(tag)}
                          className="hover:text-rose-500 cursor-pointer ml-0.5 text-xs"
                          title="Remove tag"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Available Existing Tags */}
                {tags.length > 0 && (
                  <div className="pt-1">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block mb-1">
                      Quick select from existing:
                    </span>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                      {tags.map((t) => {
                        const isSelected = formTargetTags.includes(t.name);
                        return (
                          <button
                            key={t.name}
                            type="button"
                            onClick={() => handleToggleTagInRule(t.name)}
                            className={`px-2 py-0.5 rounded-md text-[10px] transition-colors cursor-pointer border ${
                              isSelected
                                ? 'bg-[#6558D3] text-white border-[#6558D3]'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                            }`}
                          >
                            #{t.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl shadow-xs cursor-pointer transition-colors disabled:opacity-50"
                >
                  {editingRule ? 'Update Rule' : 'Save Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

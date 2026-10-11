import React, { useState } from 'react';
import { X, Tag as TagIcon, Plus, Trash2, AlertCircle } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

interface TagModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TagModal: React.FC<TagModalProps> = ({ isOpen, onClose }) => {
  const { tags, createTag, deleteTag } = useFinance();
  const [tagName, setTagName] = useState('');
  const [removeHistorical, setRemoveHistorical] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = tagName.trim();
    if (!clean) {
      setError('Tag name cannot be empty.');
      return;
    }

    if (tags.some(t => t.name.toLowerCase() === clean.toLowerCase())) {
      setError('A tag with this name already exists.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await createTag(clean);
      setTagName('');
    } catch (err: any) {
      setError(err.message || 'Failed to create tag.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!tagToDelete) return;
    try {
      setLoading(true);
      await deleteTag(tagToDelete, removeHistorical);
      setTagToDelete(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete tag.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#6558D3]/10 dark:bg-[#6558D3]/20 text-[#6558D3] dark:text-[#9f94f9] flex items-center justify-center">
              <TagIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Tag Management</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Create and organize custom transaction labels</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Add Tag Form (Name only required!) */}
          <form onSubmit={handleCreateTag} className="flex gap-2">
            <input
              type="text"
              placeholder="Enter tag name (e.g. Travel, Business)"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3]"
            />
            <button
              type="submit"
              disabled={loading || !tagName.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl shadow-xs cursor-pointer transition-colors disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create</span>
            </button>
          </form>

          {/* Tag List with Usage Counts */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Existing Tags ({tags.length})
            </p>

            {tags.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl">
                <TagIcon className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">No tags created yet</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Tags allow flexible cross-category grouping.
                </p>
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {tags.map((t) => (
                  <div
                    key={t.name}
                    className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-xl transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">#{t.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-md font-sans tabular-nums">
                        {t.count} {t.count === 1 ? 'entry' : 'entries'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTagToDelete(t.name)}
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      title="Delete tag"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delete Tag Confirmation Box */}
          {tagToDelete && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl space-y-3 animate-in fade-in">
              <div>
                <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                  Delete tag &quot;#{tagToDelete}&quot;?
                </p>
                <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                  This removes the tag definition from future pickers.
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={removeHistorical}
                  onChange={(e) => setRemoveHistorical(e.target.checked)}
                  className="w-3.5 h-3.5 text-rose-600 dark:text-rose-500 rounded border-rose-300 dark:border-rose-800 dark:bg-slate-800"
                />
                <span className="text-[11px] font-medium text-rose-800 dark:text-rose-300">
                  Also untag from existing historical transactions
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setTagToDelete(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={loading}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer transition-colors"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

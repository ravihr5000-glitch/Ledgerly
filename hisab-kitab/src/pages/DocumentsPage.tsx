import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Download,
  Trash2,
  RefreshCw,
  FolderOpen,
  FileSpreadsheet,
  Image as ImageIcon,
  ExternalLink,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { VaultDocument } from '../types/finance';

export const DocumentsPage: React.FC = () => {
  const {
    documents,
    driveStatus,
    uploadDocument,
    deleteDocument,
    syncDrive,
    isViewOnly,
  } = useFinance();

  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setFeedback('File exceeds 20 MB size limit.');
      return;
    }

    try {
      setUploading(true);
      await uploadDocument(file);
      setFeedback(`File "${file.name}" stored securely in vault.`);
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSyncNow = async () => {
    try {
      setSyncing(true);
      await syncDrive();
      setFeedback('Drive synchronization completed successfully.');
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback(`Drive sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const storedCount = documents.filter(d => d.status === 'stored').length;
  const reviewCount = documents.filter(d => d.status === 'review').length;
  const importedCount = driveStatus?.stats?.imported || 0;
  const duplicatesCount = driveStatus?.stats?.duplicates || 0;
  const errorsCount = driveStatus?.stats?.errors || 0;

  return (
    <div className="space-y-6">
      {/* 5 Spec Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Stored Files
          </span>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{documents.length}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Imported
          </span>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{importedCount}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Duplicates
          </span>
          <div className="text-xl font-bold text-slate-700 dark:text-slate-300 mt-1">{duplicatesCount}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            In Review
          </span>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">{reviewCount}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Errors
          </span>
          <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">{errorsCount}</div>
        </div>
      </div>

      {feedback && (
        <div className="p-3 text-xs bg-indigo-50 dark:bg-indigo-950/60 text-[#6558D3] dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center justify-between animate-in fade-in">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-xs font-semibold hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Documents Card & Google Drive Inbox Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upload Documents Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Upload className="w-5 h-5 text-[#6558D3] dark:text-indigo-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Upload Documents</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Add receipts, invoices, statements, PDFs, images, and spreadsheets up to 20 MB. Stored privately on server disk.
            </p>
          </div>

          <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-[#6558D3] dark:hover:border-indigo-500 rounded-xl p-6 text-center bg-slate-50/50 dark:bg-slate-800/40 transition-colors">
            <input
              type="file"
              id="doc-upload-input"
              accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.tsv"
              onChange={handleFileUpload}
              disabled={uploading || isViewOnly}
              className="hidden"
            />
            <label
              htmlFor={isViewOnly ? undefined : "doc-upload-input"}
              className={`inline-flex flex-col items-center gap-2 ${isViewOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-[#6558D3] dark:text-indigo-400 flex items-center justify-center">
                {uploading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
              </div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {uploading ? 'Uploading to vault...' : isViewOnly ? 'Upload disabled in View-Only' : 'Choose document file to upload'}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Max 20 MB • PDF, PNG, JPG, CSV, Spreadsheets
              </span>
            </label>
          </div>
        </div>

        {/* Google Drive Inbox Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-[#6558D3] dark:text-indigo-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Google Drive Inbox</h3>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Configured
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Automated inbox synchronization folder for financial imports.
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Dedicated Folder:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                  {driveStatus?.folderName || 'Ledgerly Financial Inbox'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Schedule:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {driveStatus?.schedule || 'Daily at 8:00 AM'} ({driveStatus?.timezone || 'Local'})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Last Sync:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300 font-sans tabular-nums">
                  {driveStatus?.lastSyncTimestamp
                    ? new Date(driveStatus.lastSyncTimestamp).toLocaleString()
                    : 'Awaiting initial run'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between">
            <a
              href="https://drive.google.com"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-[#6558D3] dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Open in Google Drive</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            {!isViewOnly && (
              <button
                onClick={handleSyncNow}
                disabled={syncing}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl shadow-xs disabled:opacity-60 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Secure Document List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Stored Vault Documents</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Private document bytes stored on server disk with separate metadata records
            </p>
          </div>
          <span className="text-xs font-sans tabular-nums text-slate-400 dark:text-slate-500">
            {documents.length} item{documents.length === 1 ? '' : 's'}
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No documents in vault</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
              Upload receipts, invoices, or statements to maintain audit-ready financial proof.
            </p>
          </div>
        ) : (
          <div>
            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Filename</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Uploaded Date</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 max-w-[220px] truncate">
                        {doc.originalName}
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                        {doc.mimeType ? doc.mimeType.split('/')[1]?.toUpperCase() : 'FILE'}
                      </td>
                      <td className="py-3 px-4 font-sans tabular-nums text-slate-600 dark:text-slate-300">
                        {formatBytes(doc.sizeBytes)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {doc.source}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            doc.status === 'stored'
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                              : doc.status === 'review'
                              ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'
                              : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400'
                          }`}
                        >
                          {doc.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans tabular-nums text-slate-500 dark:text-slate-400">
                        {doc.createdAt ? doc.createdAt.split('T')[0] : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <a
                            href={`/api/documents/${doc.id}/download`}
                            download={doc.originalName}
                            className="p-1.5 text-slate-400 hover:text-[#6558D3] dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Download document file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          {!isViewOnly && (
                            <button
                              onClick={() => deleteDocument(doc.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Delete from vault"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Document Cards (< 768px) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {documents.map((doc) => (
                <div key={doc.id} className="p-4 flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {doc.originalName}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 dark:text-slate-500 font-sans tabular-nums">
                        <span>{formatBytes(doc.sizeBytes)}</span>
                        <span>•</span>
                        <span>{doc.createdAt ? doc.createdAt.split('T')[0] : '-'}</span>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        doc.status === 'stored'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                          : doc.status === 'review'
                          ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'
                          : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400'
                      }`}
                    >
                      {doc.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {doc.mimeType ? doc.mimeType.split('/')[1]?.toUpperCase() : 'FILE'} • {doc.source}
                    </span>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/api/documents/${doc.id}/download`}
                        download={doc.originalName}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#6558D3] dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg cursor-pointer transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                      {!isViewOnly && (
                        <button
                          onClick={() => deleteDocument(doc.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg cursor-pointer transition-colors"
                          title="Delete from vault"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

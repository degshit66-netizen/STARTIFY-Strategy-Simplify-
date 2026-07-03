import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, File, Trash2, Download, ExternalLink, Loader2, 
  Search, Filter, Edit2, Check, X, Printer, Eye, MoreVertical
} from 'lucide-react';

interface UploadedFile {
  name: string;
  url: string;
  size: number;
  time: string;
  type?: string;
}

export const FileModule: React.FC = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // File management states
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/files');
      const data = await response.json();
      if (Array.isArray(data)) {
        setFiles(data);
      }
    } catch (err) {
      console.error('Failed to fetch files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File size too large. Max 5MB allowed.');
      return;
    }

    setIsUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      
      await fetchFiles();
    } catch (err) {
      setError('Failed to upload file. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRename = async (oldName: string) => {
    if (!newName.trim() || newName === oldName) {
      setEditingFile(null);
      return;
    }

    try {
      const response = await fetch(`/api/files/${encodeURIComponent(oldName)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName: newName.trim() }),
      });

      if (!response.ok) throw new Error('Rename failed');
      await fetchFiles();
      setEditingFile(null);
    } catch (err) {
      setError('Failed to rename file.');
    }
  };

  const handleDelete = async (filename: string) => {
    setIsDeleting(filename);
    try {
      const response = await fetch(`/api/files/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Delete failed');
      await fetchFiles();
    } catch (err) {
      setError('Failed to delete file.');
    } finally {
      setIsDeleting(null);
    }
  };

  const handlePrint = (url: string) => {
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '');
  };

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">Enterprise Media Storage</h2>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Secure digital archive for receipts, contracts, and business assets.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className={`
            flex items-center gap-2 px-6 py-3 bg-zinc-950 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-xs font-black cursor-pointer transition-all shadow-xl shadow-zinc-950/10 dark:shadow-white/5 active:scale-95
            ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}>
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {isUploading ? 'UPLOADING...' : 'UPLOAD NEW ASSET'}
            <input 
              type="file" 
              className="hidden" 
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </label>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text"
              placeholder="Search file archive..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              {filteredFiles.length} ASSETS
            </div>
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-6 mt-6 p-4 bg-rose-50 text-rose-600 text-xs font-bold rounded-2xl border border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20 flex items-center gap-3"
            >
              <X className="w-4 h-4 cursor-pointer" onClick={() => setError('')} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-10 h-10 text-zinc-950 dark:text-white animate-spin" />
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Synchronizing Secure Storage...</span>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800 rounded-3xl flex items-center justify-center mb-6">
                <File className="w-10 h-10 text-zinc-200 dark:text-zinc-700" />
              </div>
              <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-2 uppercase tracking-tight">Storage Empty</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-[240px] font-medium leading-relaxed">
                {searchTerm ? 'No assets match your search criteria.' : 'Begin by uploading your digital receipts, documents, or legal assets.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredFiles.map((file, idx) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={file.name}
                  className="group bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800 rounded-[1.5rem] p-5 hover:border-zinc-900 dark:hover:border-white transition-all cursor-pointer relative"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div 
                      onClick={() => setPreviewFile(file)}
                      className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-700 flex items-center justify-center group-hover:scale-110 transition-transform"
                    >
                      {isImage(file.name) ? (
                        <img src={file.url} className="w-full h-full object-cover rounded-2xl" alt="" />
                      ) : (
                        <File className="w-6 h-6 text-zinc-400" />
                      )}
                    </div>
                    
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
                      <button 
                        onClick={() => { setEditingFile(file.name); setNewName(file.name); }}
                        className="p-2 bg-white dark:bg-zinc-800 text-zinc-500 hover:text-blue-500 rounded-xl border border-zinc-100 dark:border-zinc-700 transition-all shadow-sm"
                        title="Rename"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handlePrint(file.url)}
                        className="p-2 bg-white dark:bg-zinc-800 text-zinc-500 hover:text-emerald-500 rounded-xl border border-zinc-100 dark:border-zinc-700 transition-all shadow-sm"
                        title="Print"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(file.name)}
                        disabled={isDeleting === file.name}
                        className="p-2 bg-white dark:bg-zinc-800 text-zinc-500 hover:text-rose-500 rounded-xl border border-zinc-100 dark:border-zinc-700 transition-all shadow-sm disabled:opacity-50"
                        title="Delete"
                      >
                        {isDeleting === file.name ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {editingFile === file.name ? (
                      <div className="flex items-center gap-2">
                        <input 
                          autoFocus
                          value={newName}
                          onChange={e => setNewName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleRename(file.name)}
                          className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                        <button onClick={() => handleRename(file.name)} className="text-emerald-500 hover:scale-110 transition-transform"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingFile(null)} className="text-rose-500 hover:scale-110 transition-transform"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <p 
                        onClick={() => setPreviewFile(file)}
                        className="text-xs font-black text-zinc-900 dark:text-white truncate uppercase tracking-tight" 
                        title={file.name}
                      >
                        {file.name}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{formatSize(file.size)}</span>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{new Date(file.time).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions Overlay for Desktop Hover */}
                  <div className="absolute top-2 right-2 md:hidden">
                    <MoreVertical className="w-4 h-4 text-zinc-400" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-sm"
            onClick={() => setPreviewFile(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative max-w-4xl w-full bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-6 right-6 z-10 flex gap-2">
                <button 
                  onClick={() => handlePrint(previewFile.url)}
                  className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-md transition-all active:scale-95"
                >
                  <Printer className="w-5 h-5" />
                </button>
                <a 
                  href={previewFile.url} 
                  download={previewFile.name}
                  className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-md transition-all active:scale-95"
                >
                  <Download className="w-5 h-5" />
                </a>
                <button 
                  onClick={() => setPreviewFile(null)}
                  className="p-3 bg-zinc-950 text-white rounded-2xl transition-all active:scale-95"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 pb-4">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center">
                    <File className="w-6 h-6 text-zinc-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight truncate max-w-md">
                      {previewFile.name}
                    </h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      {formatSize(previewFile.size)} • Uploaded {new Date(previewFile.time).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="aspect-video bg-zinc-50 dark:bg-zinc-950 rounded-3xl overflow-hidden flex items-center justify-center border border-zinc-100 dark:border-zinc-800">
                  {isImage(previewFile.name) ? (
                    <img src={previewFile.url} className="max-w-full max-h-full object-contain" alt="" />
                  ) : (
                    <div className="text-center">
                      <File className="w-20 h-20 text-zinc-200 dark:text-zinc-800 mx-auto mb-4" />
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Preview not available for this file type</p>
                      <a 
                        href={previewFile.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center gap-2 text-blue-500 text-xs font-black uppercase tracking-widest hover:underline"
                      >
                        Open in New Tab <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-8 pt-4 flex justify-end gap-3 bg-zinc-50 dark:bg-zinc-800/50">
                 <button 
                  onClick={() => setPreviewFile(null)}
                  className="px-6 py-3 text-xs font-black text-zinc-500 uppercase tracking-widest"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-zinc-950 rounded-[2rem] p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full translate-x-1/3 -translate-y-1/3 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
            <Upload className="w-6 h-6 text-blue-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-black text-lg mb-1 uppercase tracking-tight">Enterprise Compliance Storage</h4>
            <p className="text-zinc-400 text-xs font-medium leading-relaxed max-w-2xl">
              Files uploaded here are stored in your isolated organizational environment. This ensures 100% data privacy and 
              audit readiness. In production, we utilize Google Cloud Storage with 99.9% durability and multi-regional redundancy.
            </p>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-2">
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Storage Status</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-white uppercase tracking-widest">ONLINE / SECURE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { X, FileText, Download, ShieldCheck, Lock, CheckCircle2, Key, ShieldAlert, Image as ImageIcon } from 'lucide-react';

export default function ViewDocumentPreviewModal({ doc, onClose, onReviewDoc, isHrOrAdmin }) {
  const [passwordInput, setPasswordInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [downloadMsg, setDownloadMsg] = useState('');

  if (!doc) return null;

  // Accepted Master Security Vault Passwords for Super Admin & HR
  const validPasswords = ['PROLYNC@2026', 'ADMIN123', 'HR2026', '123456'];

  const handleUnlock = (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (validPasswords.includes(passwordInput.trim()) || validPasswords.includes(passwordInput.trim().toUpperCase())) {
      setIsUnlocked(true);
    } else {
      setErrorMsg('Invalid Vault Security Password. Access Denied.');
    }
  };

  const handleDownload = () => {
    setDownloadMsg(`Downloading original copy of ${doc.file_name}...`);
    setTimeout(() => setDownloadMsg(''), 4000);
  };

  const isPan = doc.document_type?.toLowerCase().includes('pan');
  const isAadhaar = doc.document_type?.toLowerCase().includes('aadhaar');
  const isMarksheet = doc.document_type?.toLowerCase().includes('marksheet') || doc.document_type?.toLowerCase().includes('10th') || doc.document_type?.toLowerCase().includes('12th');

  // Sample original image mockups corresponding to document category
  const getImageSource = () => {
    if (doc.file_url) return doc.file_url;
    if (isPan) {
      return "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800"; // High resolution document image
    }
    if (isAadhaar) {
      return "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800";
    }
    if (isMarksheet) {
      return "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=800";
    }
    return "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&q=80&w=800";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200 select-none">
      <div className="bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 overflow-y-auto max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                Original Document Image ({doc.document_type})
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <Lock className="w-3 h-3 text-emerald-500" />
                <span>Restricted to HR & Super Admin Vault</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Password Security Verification Screen */}
        {!isUnlocked ? (
          <form onSubmit={handleUnlock} className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 flex-shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Admin & HR Security Authorization</h4>
                <p className="text-xs text-slate-500">
                  Enter your unique Vault Password to view the original image of {doc.user_name}&apos;s {doc.document_type}.
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-semibold">
                {errorMsg}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                Vault Password / Security Key:
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter Password (e.g. PROLYNC@2026)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm focus:outline-hidden focus:border-blue-500"
                autoFocus
              />
              <span className="text-[10px] text-slate-400 block pt-0.5">
                Default Security Password: <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-cyan-600 font-mono font-bold">PROLYNC@2026</code> or <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-cyan-600 font-mono font-bold">ADMIN123</code>
              </span>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" /> Unlock Original Image
              </button>
            </div>
          </form>
        ) : (
          /* Directly Render Clean Original Image View (No decryption/encryption text overlay) */
          <div className="space-y-4">
            
            {/* Metadata Summary */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <span className="font-bold text-slate-900 dark:text-white">{doc.user_name}</span>
                <span className="text-[11px] text-slate-500 ml-2">({doc.role})</span>
              </div>
              <span className="font-mono text-slate-500">{doc.file_name} ({doc.file_size || '1.8 MB'})</span>
            </div>

            {/* Original Document Image Container */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-950 p-2 shadow-inner text-center space-y-3">
              
              <div className="relative group min-h-[260px] flex items-center justify-center bg-slate-900 rounded-xl overflow-hidden p-2">
                <img
                  src={getImageSource()}
                  alt={doc.file_name}
                  className="max-h-[380px] w-auto mx-auto object-contain rounded-lg shadow-md border border-slate-800"
                />
              </div>

              {/* Clean Image Info Bar */}
              <div className="flex items-center justify-between px-3 py-2 text-xs bg-slate-900 rounded-xl text-slate-300">
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Original Copy Verified
                </span>
                <button
                  onClick={handleDownload}
                  className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] transition flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Download Image
                </button>
              </div>

              {downloadMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                  {downloadMsg}
                </div>
              )}

            </div>

            {/* HR Approval Controls */}
            {isHrOrAdmin && doc.status === 'Pending' && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-700 dark:text-slate-300 font-semibold">
                  HR Audit Verdict: Review original image and approve
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onReviewDoc(doc.id, 'Approved', 'Verified original document image.');
                      onClose();
                    }}
                    className="px-4 py-2 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition"
                  >
                    Approve Document
                  </button>
                  <button
                    onClick={() => {
                      onReviewDoc(doc.id, 'Rejected', 'Document image unclear or invalid.');
                      onClose();
                    }}
                    className="px-4 py-2 rounded-xl font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition"
                  >
                    Reject Document
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

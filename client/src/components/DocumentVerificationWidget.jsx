import React, { useState } from 'react';
import { FileCheck, UploadCloud, CheckCircle, AlertCircle, Award, UserCheck, Shield, Plus, FileText, CheckCircle2, XCircle, Lock, CreditCard, GraduationCap, Award as Medal, FileSpreadsheet, Eye } from 'lucide-react';
import UploadDocumentModal from './documents/UploadDocumentModal';
import ViewDocumentPreviewModal from './documents/ViewDocumentPreviewModal';

export default function DocumentVerificationWidget({ activeUser, documents, onUploadDoc, onReviewDoc }) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('National Identity (Aadhaar Card)');
  const [previewingDoc, setPreviewingDoc] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  
  const isHrOrAdmin = ['SUPER_ADMIN', 'HR'].includes(activeUser?.role);
  
  // Super Admin / HR can toggle between viewing all company audit queue OR their own personal documents vault!
  const [viewScope, setViewScope] = useState(isHrOrAdmin ? 'ALL_COMPANY' : 'MY_DOCUMENTS');

  const handleOpenUpload = (cat) => {
    setSelectedCategory(cat || 'National Identity (Aadhaar Card)');
    setShowUploadModal(true);
  };

  // Filter documents based on viewScope and permissions
  const accessibleDocs = documents?.filter(doc => {
    if (isHrOrAdmin && viewScope === 'ALL_COMPANY') return true;
    return doc.user_id === activeUser?.id;
  }) || [];

  // Robust Case-Insensitive Filtered documents by status tab
  const filteredDocs = accessibleDocs.filter(doc => {
    const s = (doc.status || '').toLowerCase();
    if (categoryFilter === 'PENDING') return s.includes('pending');
    if (categoryFilter === 'APPROVED') return s.includes('approve') || s.includes('verified');
    if (categoryFilter === 'REJECTED') return s.includes('reject');
    return true;
  });

  // Tab counters
  const pendingCount = accessibleDocs.filter(d => (d.status || '').toLowerCase().includes('pending')).length;
  const approvedCount = accessibleDocs.filter(d => (d.status || '').toLowerCase().includes('approve') || (d.status || '').toLowerCase().includes('verified')).length;
  const rejectedCount = accessibleDocs.filter(d => (d.status || '').toLowerCase().includes('reject')).length;

  // Calculate user profile completion score based on own uploaded docs
  const ownUserDocs = documents?.filter(d => d.user_id === activeUser?.id) || [];
  
  const getItemStatus = (typeKeywords) => {
    const doc = ownUserDocs.find(d => typeKeywords.some(k => d.document_type?.toLowerCase().includes(k)));
    if (!doc) return { isPresent: false, isApproved: false, doc: null, statusText: '⚠️ Pending Upload', badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400' };
    const s = (doc.status || '').toLowerCase();
    if (s.includes('approve') || s.includes('verified')) {
      return { isPresent: true, isApproved: true, doc, statusText: '✓ Approved & Verified', badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' };
    }
    if (s.includes('reject')) {
      return { isPresent: true, isApproved: false, doc, statusText: '❌ Rejected by HR', badgeBg: 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400' };
    }
    return { isPresent: true, isApproved: false, doc, statusText: '⏳ Uploaded (Pending HR Audit)', badgeBg: 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400' };
  };

  const aadhaarStatus = getItemStatus(['aadhaar', 'identity']);
  const panStatus = getItemStatus(['pan']);
  const mark10Status = getItemStatus(['10th']);
  const mark12Status = getItemStatus(['12th']);
  const passportStatus = getItemStatus(['passport', 'license']);
  const bankStatus = getItemStatus(['bank', 'cheque']);

  const approvedChecklistCount = [aadhaarStatus, panStatus, mark10Status, mark12Status, passportStatus, bankStatus].filter(s => s.isPresent).length;
  const profileScore = Math.min(100, Math.round((approvedChecklistCount / 6) * 100));

  const checklistItems = [
    { key: 'aadhaar', label: 'Aadhaar Card', statusInfo: aadhaarStatus, icon: CreditCard, cat: 'National Identity (Aadhaar Card)' },
    { key: 'pan', label: 'PAN Card', statusInfo: panStatus, icon: CreditCard, cat: 'Tax Identity (PAN Card)' },
    { key: '10th', label: '10th SSLC Marksheet', statusInfo: mark10Status, icon: GraduationCap, cat: '10th Class SSLC Marksheet' },
    { key: '12th', label: '12th HSC Marksheet', statusInfo: mark12Status, icon: GraduationCap, cat: '12th Class Higher Secondary Marksheet' },
    { key: 'passport', label: 'Passport / License', statusInfo: passportStatus, icon: Shield, cat: 'Passport Document' },
    { key: 'bank', label: 'Bank Passbook', statusInfo: bankStatus, icon: FileSpreadsheet, cat: 'Bank Passbook / Cancelled Cheque' },
  ];

  return (
    <div className="space-y-6 select-none">
      
      {/* Top Banner & Profile Score */}
      <div className="glass-card p-6 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-heading">Document Verification Center</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isHrOrAdmin ? 'Company Compliance Audit Queue & Personal Document Vault' : 'Personal Document Vault & Identity Verification'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Scope Toggle for Super Admin & HR */}
          {isHrOrAdmin && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setViewScope('ALL_COMPANY')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  viewScope === 'ALL_COMPANY' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All Company Audit ({documents?.length || 0})
              </button>
              <button
                onClick={() => setViewScope('MY_DOCUMENTS')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  viewScope === 'MY_DOCUMENTS' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                My Personal Vault ({ownUserDocs.length})
              </button>
            </div>
          )}

          <div className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 flex items-center gap-3 shadow-2xs">
            <Award className="w-5 h-5 text-amber-500" />
            <div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Compliance Score</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white font-mono">{profileScore}% Verified</div>
            </div>
          </div>

          <button
            onClick={() => handleOpenUpload('National Identity (Aadhaar Card)')}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" /> Upload Document
          </button>
        </div>
      </div>

      {/* Mandatory Personal Verification Requirements Checklist Grid */}
      <div className="glass-card p-5 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Profile Document Compliance Checklist ({activeUser?.name})
            </h3>
          </div>
          <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
            <Lock className="w-3 h-3 text-emerald-500" /> Strictly Private & Encrypted
          </span>
        </div>

        {/* Grid of 6 Key Document Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {checklistItems.map((item) => {
            const Icon = item.icon;
            const statusInfo = item.statusInfo;

            return (
              <div
                key={item.key}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition ${statusInfo.badgeBg}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center flex-shrink-0 text-blue-500">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <span className="font-bold text-xs block truncate">{item.label}</span>
                    <span className="text-[10px] font-bold block">
                      {statusInfo.statusText}
                    </span>
                  </div>
                </div>

                {(!statusInfo.isPresent || statusInfo.statusText.includes('Rejected')) ? (
                  <button
                    onClick={() => handleOpenUpload(item.cat)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-600 hover:bg-amber-500 text-white transition flex-shrink-0 shadow-2xs"
                  >
                    Upload
                  </button>
                ) : (
                  <button
                    onClick={() => setPreviewingDoc(statusInfo.doc)}
                    className="p-1.5 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition flex-shrink-0"
                    title="View Document"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Verification Queue / Personal Vault Table */}
      <div className="glass-card p-6 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" />
            {isHrOrAdmin && viewScope === 'ALL_COMPANY'
              ? `Company-Wide HR Audit Queue (${accessibleDocs.length})`
              : `My Personal Document Vault (${accessibleDocs.length})`}
          </h3>

          {/* Status Filter Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setCategoryFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition ${
                categoryFilter === 'ALL' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-500'
              }`}
            >
              All ({accessibleDocs.length})
            </button>
            <button
              onClick={() => setCategoryFilter('PENDING')}
              className={`px-3 py-1 rounded-lg transition ${
                categoryFilter === 'PENDING' ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs' : 'text-slate-500'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setCategoryFilter('APPROVED')}
              className={`px-3 py-1 rounded-lg transition ${
                categoryFilter === 'APPROVED' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-500'
              }`}
            >
              Approved ({approvedCount})
            </button>
            <button
              onClick={() => setCategoryFilter('REJECTED')}
              className={`px-3 py-1 rounded-lg transition ${
                categoryFilter === 'REJECTED' ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs' : 'text-slate-500'
              }`}
            >
              Rejected ({rejectedCount})
            </button>
          </div>
        </div>

        {/* Documents Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60">
                <th className="py-3 px-3">Employee</th>
                <th className="py-3 px-3">Document Category</th>
                <th className="py-3 px-3">File Reference</th>
                <th className="py-3 px-3">Uploaded Date</th>
                <th className="py-3 px-3">Verification Status</th>
                <th className="py-3 px-3 text-right">Document Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {filteredDocs.length > 0 ? (
                filteredDocs.map((doc) => {
                  const s = (doc.status || '').toLowerCase();
                  const isPending = s.includes('pending');
                  const isApproved = s.includes('approve') || s.includes('verified');
                  const isRejected = s.includes('reject');

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                        {doc.user_name} <span className="text-[10px] text-slate-500 font-mono">({doc.role})</span>
                      </td>
                      <td className="py-3 px-3 text-blue-600 dark:text-blue-400 font-semibold">{doc.document_type}</td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-mono flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400" /> {doc.file_name}
                      </td>
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400 font-mono">
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isApproved ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' :
                          isRejected ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30' :
                          'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                        }`}>
                          {doc.status}
                        </span>
                      </td>

                      {/* View Document Action for Super Admin & HR / Owner */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setPreviewingDoc(doc)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 transition flex items-center gap-1"
                            title="View Encrypted Document Preview"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Document
                          </button>

                          {isHrOrAdmin && viewScope === 'ALL_COMPANY' && isPending && (
                            <>
                              <button
                                onClick={() => onReviewDoc(doc.id, 'Approved', 'Verified & compliance approved by HR.')}
                                className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Approve
                              </button>
                              <button
                                onClick={() => onReviewDoc(doc.id, 'Rejected', 'Document unclear or invalid.')}
                                className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition flex items-center gap-1"
                              >
                                <XCircle className="w-3 h-3" /> Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                    No documents found for selected tab filter ({categoryFilter.toLowerCase()}).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <UploadDocumentModal
          onClose={() => setShowUploadModal(false)}
          onUploadDoc={onUploadDoc}
          activeUser={activeUser}
          initialCategory={selectedCategory}
        />
      )}

      {/* View Document Preview Modal */}
      {previewingDoc && (
        <ViewDocumentPreviewModal
          doc={previewingDoc}
          onClose={() => setPreviewingDoc(null)}
          onReviewDoc={onReviewDoc}
          isHrOrAdmin={isHrOrAdmin}
        />
      )}

    </div>
  );
}

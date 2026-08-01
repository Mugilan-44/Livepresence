import React, { useState } from 'react';
import { X, CheckCircle2, RefreshCcw, XCircle, MessageSquare, History, UserCheck } from 'lucide-react';

export default function TaskReworkModal({ isOpen, onClose, task, activeUser, onTaskReviewed }) {
  const [reviewAction, setReviewAction] = useState('request_changes');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !task) return null;

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch(`/api/tasks/${task.id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewAction,
          comments,
          reviewedBy: activeUser?.name || 'Manager',
          userRole: activeUser?.role
        })
      });

      if (res.ok) {
        if (onTaskReviewed) onTaskReviewed();
        onClose();
      }
    } catch (err) {
      console.error("Failed to submit task review", err);
    } finally {
      setSubmitting(false);
    }
  };

  const isManagerOrAdmin = ['SUPER_ADMIN', 'HR', 'MANAGER'].includes(activeUser?.role);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <RefreshCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Task Deliverable Audit & Rework Workflow</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Review task submission, request rework, or approve deliverables</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form & Revision Details */}
        <form onSubmit={handleSubmitReview} className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          
          {/* Task Info Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white">{task.title}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold">
                {task.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{task.description || 'No detailed description provided.'}</p>
            <div className="text-[11px] text-slate-400 pt-1">Assigned to: <strong className="text-slate-700 dark:text-slate-300">{task.assigned_name}</strong></div>
          </div>

          {/* Action Choice buttons for Managers */}
          {isManagerOrAdmin ? (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Select Review Action</label>
              
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setReviewAction('approve')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition ${
                    reviewAction === 'approve'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span>Approve</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReviewAction('request_changes')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition ${
                    reviewAction === 'request_changes'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <RefreshCcw className="w-5 h-5 text-amber-500" />
                  <span>Request Rework</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReviewAction('reject')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition ${
                    reviewAction === 'reject'
                      ? 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <XCircle className="w-5 h-5 text-rose-500" />
                  <span>Reject</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Revision / Rework Comments
                </label>
                <textarea
                  rows={3}
                  required={reviewAction === 'request_changes'}
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  placeholder={reviewAction === 'request_changes' ? "Explain required changes or missing criteria for employee resubmission..." : "Enter review notes (optional)..."}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
              Only Project Leads, Managers, or Admins can sign off or request rework on tasks.
            </div>
          )}

          {/* Revision History Log */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              Full Revision History Audit Log
            </h4>

            {(task.revisions || []).length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(task.revisions || []).map(rev => (
                  <div key={rev.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between font-semibold">
                      <span className={`${
                        rev.status === 'Approved' ? 'text-emerald-500' : rev.status === 'Rework Required' ? 'text-amber-500' : 'text-rose-500'
                      }`}>
                        {rev.status}
                      </span>
                      <span className="text-[10px] text-slate-400">By {rev.reviewed_by} • {new Date(rev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">{rev.comments}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-3 text-center text-xs text-slate-400">No previous revision records.</div>
            )}
          </div>

          {/* Footer Submit */}
          {isManagerOrAdmin && (
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow transition"
              >
                {submitting ? 'Submitting...' : 'Confirm Review Decision'}
              </button>
            </div>
          )}

        </form>

      </div>
    </div>
  );
}

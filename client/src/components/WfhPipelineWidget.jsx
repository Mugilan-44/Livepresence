import React, { useState } from 'react';
import { Send, CheckCircle2, XCircle, Clock, Calendar, ShieldCheck, Home, Plus, Briefcase, FileText } from 'lucide-react';
import ApplyLeaveModal from './leaves/ApplyLeaveModal';

export default function WfhPipelineWidget({ activeUser, requests, onRequestSubmitted, onReviewRequest, customizations }) {
  const [filterTab, setFilterTab] = useState('ALL');
  const [showApplyModal, setShowApplyModal] = useState(false);

  const isHrOrAdmin = ['SUPER_ADMIN', 'HR', 'MANAGER'].includes(activeUser?.role);

  const filteredRequests = requests?.filter(req => {
    if (filterTab === 'PENDING') return req.status === 'Pending';
    if (filterTab === 'APPROVED') return req.status === 'Approved';
    if (filterTab === 'REJECTED') return req.status === 'Rejected';
    return true;
  }) || [];

  return (
    <div className="space-y-5 select-none">
      
      {/* Header & Apply Action */}
      <div className="glass-card p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Leaves & WFH Pipeline</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Enterprise leave tracker, WFH pipeline, and approval workflow</p>
        </div>

        <button
          onClick={() => setShowApplyModal(true)}
          className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs flex items-center gap-1.5 transition"
        >
          <Plus className="w-3.5 h-3.5" /> Apply Leave / WFH
        </button>
      </div>

      {/* Leave Quota Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card p-3.5 space-y-0.5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Casual Leave (CL)</div>
          <div className="text-lg font-semibold text-purple-600 dark:text-purple-400 font-mono">10 / 12</div>
          <p className="text-[11px] text-slate-400">2 days taken</p>
        </div>
        <div className="glass-card p-3.5 space-y-0.5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Sick Leave (SL)</div>
          <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 font-mono">7 / 8</div>
          <p className="text-[11px] text-slate-400">1 day taken</p>
        </div>
        <div className="glass-card p-3.5 space-y-0.5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Earned Leave (EL)</div>
          <div className="text-lg font-semibold text-cyan-600 dark:text-cyan-400 font-mono">14 / 15</div>
          <p className="text-[11px] text-slate-400">Carried forward</p>
        </div>
        <div className="glass-card p-3.5 space-y-0.5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">WFH Allowance</div>
          <div className="text-lg font-semibold text-amber-600 dark:text-amber-400 font-mono">4 / 5</div>
          <p className="text-[10px] text-slate-400 mt-1">Monthly quota</p>
        </div>
      </div>

      {/* Pipeline Filter Tabs & Request Feed */}
      <div className="glass-card p-6 border border-slate-200 dark:border-slate-800 space-y-4">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Leave & WFH Authorization Queue ({filteredRequests.length})
          </h3>

          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(tab => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-3 py-1 rounded-lg font-semibold transition capitalize ${
                  filterTab === tab ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs' : 'text-slate-500'
                }`}
              >
                {tab.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Requests List */}
        <div className="space-y-3">
          {filteredRequests.map((req) => (
            <div key={req.id} className="bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{req.user_name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-medium">
                    {req.department || 'Engineering'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 font-bold border border-purple-500/20">
                    {req.leave_type || 'Leave / WFH'}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    req.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' :
                    req.status === 'Rejected' ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30' :
                    'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                  }`}>
                    {req.status}
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 mb-1 font-mono flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-500" />
                  <span>{req.start_date} to {req.end_date}</span>
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 italic">"{req.reason}"</p>
                {req.review_notes && (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1 flex items-center gap-1 font-medium">
                    <span>Note ({req.reviewed_by}):</span> {req.review_notes}
                  </p>
                )}
              </div>

              {/* Approval Actions for HR / Leads */}
              {isHrOrAdmin && req.status === 'Pending' && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => onReviewRequest(req.id, 'Approved', `${activeUser.name} (${activeUser.role})`, 'Approved for attendance exemption.')}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 flex items-center gap-1 transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => onReviewRequest(req.id, 'Rejected', `${activeUser.name} (${activeUser.role})`, 'Requires office presence.')}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 flex items-center gap-1 transition"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <ApplyLeaveModal
          onClose={() => setShowApplyModal(false)}
          leaveTypesList={customizations?.leave_types}
          onSubmitLeave={async (formData) => {
            const res = await fetch('/api/leaves', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData)
            });
            if (res.ok) {
              onRequestSubmitted();
            }
          }}
          activeUser={activeUser}
        />
      )}

    </div>
  );
}

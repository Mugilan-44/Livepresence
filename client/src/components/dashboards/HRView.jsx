import React from 'react';
import { Users, FileCheck, CalendarCheck, Clock, CheckCircle2, ShieldCheck, DollarSign } from 'lucide-react';
import DocumentVerificationWidget from '../DocumentVerificationWidget';
import WfhPipelineWidget from '../WfhPipelineWidget';

export default function HRView({ activeUser, documents, onUploadDoc, onReviewDoc, wfhRequests, onRequestSubmitted, onReviewRequest }) {
  const pendingDocs = documents?.filter(d => d.status === 'Pending').length || 0;
  const pendingWfh = wfhRequests?.filter(r => r.status === 'Pending').length || 0;

  return (
    <div className="space-y-6">
      
      {/* HR Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase">Pending HR Doc Audits</span>
            <div className="text-2xl font-bold text-amber-400 font-mono mt-1">{pendingDocs} Queue</div>
            <span className="text-[10px] text-amber-300">Aadhaar/PAN/Passbook Audit</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <FileCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase">Pending WFH Requests</span>
            <div className="text-2xl font-bold text-purple-400 font-mono mt-1">{pendingWfh} Requests</div>
            <span className="text-[10px] text-purple-300">Dual Approval Engine</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase">Active Workforce</span>
            <div className="text-2xl font-bold text-cyan-400 font-mono mt-1">26 Employees</div>
            <span className="text-[10px] text-cyan-300">Full-Time & Interns</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase">Payroll Processing</span>
            <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">100% Paid</div>
            <span className="text-[10px] text-emerald-300">July 2026 Payslips Issued</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Document Verification Engine */}
      <DocumentVerificationWidget
        activeUser={activeUser}
        documents={documents}
        onUploadDoc={onUploadDoc}
        onReviewDoc={onReviewDoc}
      />

      {/* WFH Approval Pipeline */}
      <WfhPipelineWidget
        activeUser={activeUser}
        requests={wfhRequests}
        onRequestSubmitted={onRequestSubmitted}
        onReviewRequest={onReviewRequest}
      />

    </div>
  );
}

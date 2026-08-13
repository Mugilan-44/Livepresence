import React from 'react';
import { ShieldAlert, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

export default function OnboardingVerificationBanner({ activeUser, documents = [], onNavigateTab }) {
  // Super Admin might be auto-verified, but for employees/interns/HR check their documents
  const ownDocs = (documents || []).filter(d => d.user_id === activeUser?.id);

  // Key mandatory document categories
  const keyCategories = [
    ['aadhaar', 'identity'],
    ['pan'],
    ['10th'],
    ['12th'],
    ['passport', 'license'],
    ['bank', 'cheque']
  ];

  let verifiedCount = 0;
  keyCategories.forEach(keywords => {
    const hasDoc = ownDocs.some(d => keywords.some(k => (d.document_type || '').toLowerCase().includes(k)));
    if (hasDoc) verifiedCount++;
  });

  // Calculate percentage
  let percentage = Math.round((verifiedCount / 6) * 100);
  if (percentage === 0 && activeUser?.profile_score) {
    percentage = activeUser.profile_score;
  }
  if (activeUser?.verified_employee && percentage < 100) {
    percentage = 100;
  }

  // If 100% verified, don't show the pending banner
  if (percentage >= 100) return null;

  return (
    <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-500/30 dark:border-amber-500/20 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
      
      {/* Left Details */}
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
          <ShieldAlert className="w-5 h-5" />
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Onboarding Verification Pending
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black font-mono shadow-xs">
              {percentage}% Complete
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
            Please upload your Aadhaar, PAN, Marksheets & Bank verification documents to complete your official HR onboarding.
          </p>

          {/* Animated Progress Bar */}
          <div className="w-full max-w-md h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mt-1.5 border border-slate-300/50 dark:border-slate-700/50">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Complete Verification Action Button */}
      <button
        onClick={() => onNavigateTab?.('documents')}
        className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition shrink-0 flex items-center gap-2 group cursor-pointer"
      >
        Complete Verification
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
      </button>

    </div>
  );
}

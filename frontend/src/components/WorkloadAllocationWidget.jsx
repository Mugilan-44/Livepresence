import React from 'react';
import { PieChart, Users, Shield, Briefcase, Award } from 'lucide-react';

export default function WorkloadAllocationWidget({ stats }) {
  if (!stats) return null;

  const totalDeliverables = (stats.full_time_staff?.active_deliverables || 0) +
                           (stats.interns?.active_deliverables || 0) +
                           (stats.project_leads?.active_deliverables || 0) +
                           (stats.hr_admins?.active_deliverables || 0);

  const items = [
    {
      key: 'full_time_staff',
      title: 'Full-Time Staff',
      subtitle: '15 Employees (Active Deliverables)',
      count: stats.full_time_staff?.count || 15,
      deliverables: stats.full_time_staff?.active_deliverables || 24,
      pct: 53,
      color: 'from-cyan-500 to-blue-600',
      textColor: 'text-cyan-400',
      badgeBg: 'bg-cyan-500/10 border-cyan-500/30'
    },
    {
      key: 'interns',
      title: 'Interns & Trainees',
      subtitle: '6 Interns (Assigned Tasks)',
      count: stats.interns?.count || 6,
      deliverables: stats.interns?.active_deliverables || 11,
      pct: 24,
      color: 'from-emerald-500 to-teal-600',
      textColor: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/10 border-emerald-500/30'
    },
    {
      key: 'project_leads',
      title: 'Project Leads / Managers',
      subtitle: '3 Leads (Team Governance)',
      count: stats.project_leads?.count || 3,
      deliverables: stats.project_leads?.active_deliverables || 6,
      pct: 13,
      color: 'from-purple-500 to-indigo-600',
      textColor: 'text-purple-400',
      badgeBg: 'bg-purple-500/10 border-purple-500/30'
    },
    {
      key: 'hr_admins',
      title: 'HR & System Admins',
      subtitle: '2 System Controllers (Governance)',
      count: stats.hr_admins?.count || 2,
      deliverables: stats.hr_admins?.active_deliverables || 4,
      pct: 10,
      color: 'from-amber-500 to-orange-600',
      textColor: 'text-amber-400',
      badgeBg: 'bg-amber-500/10 border-amber-500/30'
    }
  ];

  return (
    <div className="glass-card p-6 border border-slate-200 dark:border-slate-800 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white font-sans">System Workload & Team Allocation</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Headcount & Deliverable Distribution Across Tiers</p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-500 dark:text-slate-400">Active Workload</div>
          <div className="text-base font-bold text-cyan-600 dark:text-cyan-400 font-mono">{totalDeliverables} Active Deliverables</div>
        </div>
      </div>

      {/* Visual Bar Allocation Chart */}
      <div className="space-y-4 mb-6">
        {items.map((item) => (
          <div key={item.key} className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${item.textColor.replace('text-', 'bg-')}`} />
                {item.title}
              </span>
              <span className="text-slate-600 dark:text-slate-300 font-mono font-medium">{item.subtitle}</span>
            </div>

            {/* Visual Bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-4 overflow-hidden p-0.5 border border-slate-300/50 dark:border-slate-700/50">
              <div
                className={`bg-gradient-to-r ${item.color} h-full rounded-full transition-all duration-700 flex items-center justify-end px-2 text-[9px] font-bold text-white shadow-xs`}
                style={{ width: `${Math.max(12, item.pct)}%` }}
              >
                {item.pct}%
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Callout */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-cyan-500/30 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-3">
        <Users className="w-5 h-5 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
        <p>
          <strong>Unified Governance:</strong> Project Leads manage daily task velocity while HR and Admins maintain workforce compliance and attendance governance.
        </p>
      </div>

    </div>
  );
}

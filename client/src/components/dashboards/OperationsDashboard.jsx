import React from 'react';
import { CalendarDays, ChevronRight, ClipboardCheck, FileCheck2, Megaphone, Send, UsersRound } from 'lucide-react';

const formatDate = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export default function OperationsDashboard({ activeUser, statCounts, onNavigateTab }) {
  const stats = statCounts || { all: 0, present: 0, not_in: 0, leave: 0 };
  const canManageEmployees = ['SUPER_ADMIN', 'HR', 'MANAGER'].includes(activeUser?.role);
  const canReviewDocuments = ['SUPER_ADMIN', 'HR'].includes(activeUser?.role);
  const canViewPayroll = ['SUPER_ADMIN', 'HR', 'FULL_TIME'].includes(activeUser?.role);
  const quickLinks = [
    { label: 'View attendance', description: 'Review today’s attendance records', icon: ClipboardCheck, tab: 'attendance' },
    { label: 'Leave requests', description: 'Review leave and WFH requests', icon: CalendarDays, tab: 'leaves' },
    ...(canManageEmployees ? [{ label: 'Manage employees', description: 'Update employee information', icon: UsersRound, tab: 'employees' }] : []),
    ...(canReviewDocuments ? [{ label: 'Review documents', description: 'Manage employee documents', icon: FileCheck2, tab: 'documents' }] : []),
    ...(canViewPayroll ? [{ label: 'View payroll', description: 'Access payroll and payslips', icon: FileCheck2, tab: 'payroll' }] : []),
    { label: 'Announcements', description: 'View organisation updates', icon: Megaphone, tab: 'announcements' }
  ];

  return (
    <div className="space-y-5">
      <section className="glass-card p-5 lg:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Welcome back, {activeUser?.name?.split(' ')[0] || 'there'}.</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Keep your people operations organised from one place.</p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl">
          <CalendarDays className="w-4 h-4 text-slate-400" />
          {formatDate.format(new Date())}
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4">

        <Metric label="Total employees" value={stats.all} detail="Active workforce" />
        <Metric label="Present today" value={stats.present} detail="Checked-in employees" tone="emerald" />
        <Metric label="Not checked in" value={stats.not_in} detail="Requires follow-up" tone="amber" />
        <Metric label="On leave" value={stats.leave} detail="Approved leave or WFH" tone="blue" />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-5">
        <div className="glass-card p-5 lg:p-6">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Start here</h2>
              <p className="mt-1 text-xs text-slate-500">Common HR actions for today</p>
            </div>
            <Send className="w-5 h-5 text-slate-400" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {quickLinks.map(({ label, description, icon: Icon, tab }) => (
              <button key={tab} type="button" onClick={() => onNavigateTab(tab)} className="group rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-left hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <span className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 inline-flex items-center justify-center"><Icon className="w-4 h-4" /></span>
                  <ChevronRight className="w-4 h-4 mt-1 text-slate-300 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                </div>
                <p className="mt-4 text-xs font-semibold text-slate-800 dark:text-slate-200">{label}</p>
                <p className="mt-1 text-[11px] text-slate-500">{description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card p-5 lg:p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Attendance overview</h2>
          <p className="mt-1 text-xs text-slate-500">Today’s workforce status</p>
          <div className="mt-6 space-y-5">
            <AttendanceLine label="Present" value={stats.present} total={stats.all} color="bg-emerald-500" />
            <AttendanceLine label="On leave" value={stats.leave} total={stats.all} color="bg-sky-500" />
            <AttendanceLine label="Not checked in" value={stats.not_in} total={stats.all} color="bg-amber-500" />
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, detail, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-900 dark:text-white',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    blue: 'text-sky-600 dark:text-sky-400'
  };
  return <div className="glass-card p-5"><p className="text-xs font-medium text-slate-500">{label}</p><p className={`mt-2 text-2xl font-bold tracking-tight ${tones[tone]}`}>{value}</p><p className="mt-1 text-[11px] text-slate-400">{detail}</p></div>;
}

function AttendanceLine({ label, value, total, color }) {
  const percentage = total ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs"><span className="font-medium text-slate-600 dark:text-slate-300">{label}</span><span className="text-slate-400">{value} of {total}</span></div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className={`h-full rounded-full ${color}`} style={{ width: `${percentage}%` }} /></div>
    </div>
  );
}

import React from 'react';
import { CalendarCheck, FileCheck2, Settings2, ShieldCheck, UsersRound } from 'lucide-react';

function StatCard({ label, value, note, icon: Icon }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
          <p className="mt-1 text-[11px] text-slate-400">{note}</p>
        </div>
        <span className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 inline-flex items-center justify-center">
          <Icon className="w-5 h-5" strokeWidth={1.8} />
        </span>
      </div>
    </div>
  );
}

export default function SuperAdminView({ activeUser, attendanceLogs = [], auditLogs = [], documents = [], leaveRequests = [], onOpenCustomizations, users = [] }) {
  const presentToday = new Set(attendanceLogs.filter((log) => log.check_in || log.status === 'Present').map((log) => log.user_id)).size;
  const pendingReviews = documents.filter((document) => document.status === 'Pending').length + leaveRequests.filter((request) => request.status === 'Pending').length;
  const latestAttendance = attendanceLogs.slice(0, 5);
  const latestActivity = auditLogs.slice(0, 5);

  return (
    <div className="space-y-5">
      <section className="glass-card p-5 lg:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Good day, {activeUser?.name?.split(' ')[0] || 'Admin'}.</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Here is a concise view of your workforce and HR activity.</p>
        </div>
        <button type="button" onClick={onOpenCustomizations} className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold transition-colors">
          <Settings2 className="w-4 h-4" /> HR settings
        </button>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4">

        <StatCard label="Total employees" value={users.length || '—'} note="Active workforce" icon={UsersRound} />
        <StatCard label="Present today" value={presentToday} note="Checked-in employees" icon={CalendarCheck} />
        <StatCard label="Pending reviews" value={pendingReviews} note="Documents and requests" icon={FileCheck2} />
        <StatCard label="Admin activity" value={auditLogs.length} note="Recorded updates" icon={ShieldCheck} />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Today’s attendance</h2>
              <p className="mt-0.5 text-xs text-slate-500">Latest employee check-ins</p>
            </div>
            <CalendarCheck className="w-5 h-5 text-slate-400" />
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {latestAttendance.length ? latestAttendance.map((log, index) => (
              <div key={log.id || index} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{log.user_name || log.name || `Employee ${log.user_id || ''}`}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{log.check_in ? 'Checked in' : (log.status || 'Attendance recorded')}</p>
                </div>
                <span className="shrink-0 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full">Present</span>
              </div>
            )) : <EmptyState text="No attendance has been recorded today." />}
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Recent activity</h2>
              <p className="mt-0.5 text-xs text-slate-500">Latest HR and administration updates</p>
            </div>
            <ShieldCheck className="w-5 h-5 text-slate-400" />
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {latestActivity.length ? latestActivity.map((activity, index) => (
              <div key={activity.id || index} className="px-5 py-3.5">
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{activity.action || 'Record updated'}</p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{activity.details || `${activity.actor || 'An administrator'} made an update.`}</p>
              </div>
            )) : <EmptyState text="Administrative activity will appear here." />}
          </div>
        </div>
      </section>
    </div>
  );
}

function EmptyState({ text }) {
  return <p className="px-5 py-10 text-center text-xs text-slate-400">{text}</p>;
}

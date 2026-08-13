import React, { useMemo } from 'react';
import {
  CalendarCheck,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileText,
  Settings2,
  ShieldCheck,
  UsersRound
} from 'lucide-react';

function StatCard({ label, value, note, icon: Icon }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
          <p className="mt-1 text-[11px] text-slate-400">{note}</p>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </span>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return <p className="px-5 py-10 text-center text-xs text-slate-400">{text}</p>;
}

const parseStoredUtc = (value) => new Date(`${String(value || '').replace(' ', 'T').replace(/Z$/, '')}Z`);
const dateLabel = (value) => {
  const date = parseStoredUtc(value);
  return Number.isNaN(date.getTime())
    ? 'Recently'
    : date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
};

export default function SuperAdminView({
  activeUser,
  attendanceLogs = [],
  leaveRequests = [],
  timePermissions = [],
  onOpenCustomizations,
  onNavigate,
  users = [],
  tasks = [],
  projects = [],
  workLogs = []
}) {
  const presentToday = new Set(attendanceLogs.filter((log) => log.check_in || log.status === 'Present').map((log) => log.user_id)).size;
  const pendingLeaves = leaveRequests.filter((request) => request.status === 'Pending');
  const pendingPermissions = timePermissions.filter((request) => request.status === 'Pending');
  const pendingRequestCount = pendingLeaves.length + pendingPermissions.length;

  const employeeActivity = useMemo(() => [
    ...leaveRequests.map((item) => ({
      id: `leave-${item.id}`,
      title: `${item.user_name || 'Employee'} applied for ${item.leave_type || 'leave'}`,
      detail: `${item.start_date} → ${item.end_date} · ${item.status || 'Pending'}`,
      date: item.created_at,
      icon: CalendarCheck
    })),
    ...timePermissions.map((item) => ({
      id: `permission-${item.id}`,
      title: `${item.user_name || 'Employee'} requested time permission`,
      detail: `${item.permission_date || 'Date pending'} · ${item.permission_type || 'Time permission'} · ${item.status || 'Pending'}`,
      date: item.created_at,
      icon: Clock3
    })),
    ...projects.map((item) => ({
      id: `project-${item.id}`,
      title: `${item.created_by_name || 'Employee'} created ${item.title}`,
      detail: `Project completion date: ${item.deadline || 'Not set'}`,
      date: item.created_at,
      icon: ClipboardCheck
    })),
    ...tasks.flatMap((item) => [
      {
        id: `task-${item.id}`,
        title: `${item.created_by_name || 'Employee'} created task: ${item.title}`,
        detail: item.project_title || 'General work',
        date: item.created_at,
        icon: ClipboardCheck
      },
      ...(item.movement_history || []).map((move) => ({
        id: move.id,
        title: `${move.actor_name || 'Employee'} moved ${item.title}`,
        detail: `${move.from_status || 'New'} → ${move.to_status || 'Updated'}`,
        date: move.created_at,
        icon: ClipboardCheck
      }))
    ]),
    ...workLogs.map((item) => ({
      id: `log-${item.id}`,
      title: `${item.user_name || 'Employee'} updated a daily log`,
      detail: item.project_title || item.summary || 'Daily work update',
      date: item.created_at,
      icon: FileText
    }))
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 10), [leaveRequests, projects, tasks, timePermissions, workLogs]);

  const todayAttendance = attendanceLogs
    .filter((log) => String(log.check_in || '').slice(0, 10) === new Date().toISOString().slice(0, 10))
    .slice(0, 5);

  const openHrArea = (tab) => {
    localStorage.setItem('prolync_leave_admin_tab', tab);
    onNavigate?.('leaves');
  };

  return (
    <div className="space-y-5">
      <section className="glass-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between lg:p-6">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Good day, {activeUser?.name?.split(' ')[0] || 'Founder'}.</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">A clear view of your people, delivery and employee updates.</p>
        </div>
        <button type="button" onClick={onOpenCustomizations} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900">
          <Settings2 className="h-4 w-4" /> HR settings
        </button>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] shadow-xs">
        <div className="grid gap-0 lg:grid-cols-[1.55fr_0.8fr]">
          <div className="p-5 lg:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${pendingRequestCount ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-ink)]">Employee requests</p>
                </div>
                <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                  {pendingRequestCount ? `${pendingRequestCount} request${pendingRequestCount === 1 ? '' : 's'} need your decision` : 'No pending leave or time-permission requests'}
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Approve or decline employee leave and time permissions from one place.</p>
              </div>
              <button type="button" onClick={() => openHrArea('approvals')} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900">
                Review all <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => openHrArea('approvals')} className="rounded-xl border border-amber-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm dark:border-amber-900/50 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Leave approvals</span><CalendarCheck className="h-4 w-4 text-amber-600" /></div>
                <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{pendingLeaves.length}</p>
                <p className="mt-1 text-[11px] text-slate-500">Applications awaiting approval</p>
              </button>
              <button type="button" onClick={() => openHrArea('time')} className="rounded-xl border border-rose-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm dark:border-rose-900/50 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Time permissions</span><Clock3 className="h-4 w-4 text-rose-600" /></div>
                <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{pendingPermissions.length}</p>
                <p className="mt-1 text-[11px] text-slate-500">Late arrival or early-exit requests</p>
              </button>
            </div>
          </div>

          <div className="border-t border-[var(--accent-border)] bg-white/65 p-5 dark:bg-slate-900/65 lg:border-l lg:border-t-0">
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[var(--accent-ink)]" /><p className="text-sm font-bold text-slate-900 dark:text-white">HR workspace</p></div>
            <p className="mt-1 text-xs leading-5 text-slate-500">Jump to the founder controls you need.</p>
            <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wide text-slate-500" htmlFor="hr-workspace-menu">Open an HR tool</label>
            <select
              id="hr-workspace-menu"
              defaultValue=""
              onChange={(event) => event.target.value && openHrArea(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-[var(--accent)] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="" disabled>Select a workspace</option>
              <option value="approvals">Leave approvals ({pendingLeaves.length})</option>
              <option value="time">Time permissions ({pendingPermissions.length})</option>
              <option value="employees">Employee leave balances</option>
              <option value="policy">Leave policy & rules</option>
              <option value="holidays">Holiday management</option>
              <option value="assign">Assign personal leave</option>
            </select>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total employees" value={users.length || '—'} note="Active workforce" icon={UsersRound} />
        <StatCard label="Present today" value={presentToday} note="Checked-in employees" icon={CalendarCheck} />
        <StatCard label="Active projects" value={projects.filter((item) => item.status !== 'Completed').length} note="Across all teams" icon={ClipboardCheck} />
        <StatCard label="Daily logs today" value={workLogs.filter((item) => String(item.date || item.created_at || '').slice(0, 10) === new Date().toISOString().slice(0, 10)).length} note="Employee work updates" icon={FileText} />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800"><div><h2 className="text-sm font-semibold text-slate-900 dark:text-white">Today’s attendance</h2><p className="mt-0.5 text-xs text-slate-500">Latest office check-ins</p></div><CalendarCheck className="h-5 w-5 text-slate-400" /></div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">{todayAttendance.length ? todayAttendance.map((log, index) => <div key={log.id || index} className="flex items-center justify-between gap-4 px-5 py-3.5"><div className="min-w-0"><p className="truncate text-xs font-medium text-slate-800 dark:text-slate-200">{log.user_name || log.name || 'Employee'}</p><p className="mt-0.5 text-[11px] text-slate-400">Checked in at {dateLabel(log.check_in)}</p></div><span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">Present</span></div>) : <EmptyState text="No attendance has been recorded today." />}</div>
        </div>
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800"><div><h2 className="text-sm font-semibold text-slate-900 dark:text-white">Employee activity</h2><p className="mt-0.5 text-xs text-slate-500">Requests, projects, task movement and daily-log updates</p></div><ClipboardCheck className="h-5 w-5 text-slate-400" /></div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">{employeeActivity.length ? employeeActivity.map((item) => { const Icon = item.icon; return <div key={item.id} className="flex gap-3 px-5 py-3.5"><span className="mt-0.5 rounded-lg bg-[var(--accent-soft)] p-2 text-[var(--accent-ink)]"><Icon className="h-3.5 w-3.5" /></span><div className="min-w-0"><p className="text-xs font-medium text-slate-800 dark:text-slate-200">{item.title}</p><p className="mt-1 line-clamp-1 text-[11px] text-slate-500">{item.detail} · {dateLabel(item.date)}</p></div></div>; }) : <EmptyState text="Employee activity will appear here." />}</div>
        </div>
      </section>
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Bell, BriefcaseBusiness, CalendarDays, CalendarClock, ClipboardCheck, Clock3, Home, Megaphone, SlidersHorizontal } from 'lucide-react';

const parseStoredUtc = (value) => new Date(`${String(value || '').replace(' ', 'T').replace(/Z$/, '')}Z`);
const indiaParts = (value) => Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(parseStoredUtc(value)).filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
const dateOf = (value) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(String(value))) return String(value).slice(0, 10);
  const parts = indiaParts(value);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
};
const readableDate = (value) => {
  const date = parseStoredUtc(value);
  return Number.isNaN(date.getTime()) ? 'Recently' : date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' });
};
const formatHours = (minutes) => {
  const total = Math.max(0, Math.round(minutes || 0));
  if (total < 60) return `${total}m`;
  return `${Math.floor(total / 60)}h ${total % 60 ? `${total % 60}m` : ''}`.trim();
};
const sessionMinutes = (log) => {
  if (!log?.check_in || !log?.check_out) return 0;
  return Math.max(0, Math.round((parseStoredUtc(log.check_out) - parseStoredUtc(log.check_in)) / 60000));
};
const afterHoursMinutes = (log) => {
  if (!log?.check_out) return 0;
  const out = parseStoredUtc(log.check_out);
  const parts = indiaParts(log.check_out);
  const cutoffUtc = Date.UTC(parts.year, parts.month - 1, parts.day, 13, 30, 0); // 7:00 PM IST
  return Math.max(0, Math.round((out.getTime() - cutoffUtc) / 60000));
};

function periodBounds(period) {
  const now = new Date();
  const key = (date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  if (period === 'overall') return { start: '', end: '9999-12-31' };
  if (period === 'this_year') return { start: `${now.getFullYear()}-01-01`, end: `${now.getFullYear()}-12-31` };
  if (period === 'last_month') return { start: key(new Date(now.getFullYear(), now.getMonth() - 1, 1)), end: key(new Date(now.getFullYear(), now.getMonth(), 0)) };
  return { start: key(new Date(now.getFullYear(), now.getMonth(), 1)), end: key(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
}

const periodLabel = { this_month: 'This month', last_month: 'Last month', this_year: 'This year', overall: 'Overall' };

export default function PersonalDashboard({ activeUser, attendanceLogs = [], tasks = [], projects = [], dailyTasks = [], workLogs = [], announcements = [], events = [], notifications = [], onNavigate }) {
  const [period, setPeriod] = useState('this_month');
  const { start, end } = useMemo(() => periodBounds(period), [period]);
  const inPeriod = (value) => { const valueDate = dateOf(value); return Boolean(valueDate) && (!start || valueDate >= start) && valueDate <= end; };
  const ownAttendance = useMemo(() => attendanceLogs.filter((log) => log.user_id === activeUser?.id && inPeriod(log.check_in || log.created_at)), [activeUser?.id, attendanceLogs, period]);
  const ownWorkLogs = useMemo(() => workLogs.filter((log) => log.user_id === activeUser?.id && inPeriod(log.date || log.created_at)), [activeUser?.id, workLogs, period]);
  const assignedDailyTasks = useMemo(() => dailyTasks.filter((task) => task.assigned_to === activeUser?.id || task.assigned_to === 'ALL' || task.created_by === activeUser?.id), [dailyTasks, activeUser?.id]);
  const summary = useMemo(() => {
    const ownTasks = tasks.filter((task) => task.assigned_to === activeUser?.id);
    const completedSessions = ownAttendance.filter((log) => log.check_out);
    const officeMinutes = completedSessions.reduce((total, log) => total + sessionMinutes(log), 0);
    const presentDays = new Set(completedSessions.map((log) => dateOf(log.check_in))).size;
    return {
      activeTasks: ownTasks.filter((task) => !['Completed', 'Done'].includes(task.status)).length,
      completedTasks: ownTasks.filter((task) => ['Completed', 'Done'].includes(task.status)).length,
      officeMinutes,
      extraMinutes: completedSessions.reduce((total, log) => total + afterHoursMinutes(log), 0),
      presentDays,
      averageMinutes: presentDays ? officeMinutes / presentDays : 0,
      dailyLogs: ownWorkLogs.length
    };
  }, [activeUser?.id, ownAttendance, ownWorkLogs, tasks]);
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const activeProjects = projects.filter((project) => tasks.some((task) => task.project_id === project.id && task.assigned_to === activeUser?.id));
  const overdueTasks = useMemo(() => tasks.filter((task) => task.assigned_to === activeUser?.id && (task.is_overdue || (task.due_date && String(task.due_date).slice(0, 10) < new Date().toISOString().slice(0, 10) && !['Completed', 'Done'].includes(task.status)))), [tasks, activeUser?.id]);
  const overdueProjects = useMemo(() => activeProjects.filter((project) => project.deadline && String(project.deadline).slice(0, 10) < new Date().toISOString().slice(0, 10) && !tasks.filter((task) => task.project_id === project.id).every((task) => ['Completed', 'Done'].includes(task.status))), [activeProjects, tasks]);
  const openDailyTasks = assignedDailyTasks.filter((task) => task.assigned_to === 'ALL' ? !(task.completions || []).some((item) => item.user_id === activeUser?.id) : task.status !== 'Completed');
  const companyUpdates = useMemo(() => {
    const directUpdates = notifications.filter((item) => ['policy', 'calendar', 'daily_log', 'worklog'].includes(String(item.type || '').toLowerCase()) && inPeriod(item.created_at)).map((item) => ({ id: item.id, title: item.title, detail: item.message, date: item.created_at, icon: item.type === 'calendar' ? CalendarClock : item.type === 'policy' ? SlidersHorizontal : ClipboardCheck, destination: item.type === 'calendar' ? 'calendar' : item.type === 'policy' ? 'leaves' : 'worklogs' }));
    const reviewedLogs = ownWorkLogs.filter((log) => log.founder_seen && inPeriod(log.founder_seen_at || log.created_at)).map((log) => ({ id: `review-${log.id}`, title: 'Daily log reviewed', detail: `${log.founder_seen_by || 'Founder'} reviewed your update for ${readableDate(log.date || log.created_at)}.`, date: log.founder_seen_at || log.created_at, icon: ClipboardCheck, destination: 'worklogs' }));
    const calendarUpdates = events.filter((event) => event.created_by && inPeriod(event.created_at || event.event_date)).map((event) => ({ id: `calendar-${event.id}`, title: 'Team calendar updated', detail: `${event.title} is scheduled for ${readableDate(event.event_date)}.`, date: event.created_at || event.event_date, icon: CalendarClock, destination: 'calendar' }));
    return [...directUpdates, ...reviewedLogs, ...calendarUpdates].filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index).sort((a, b) => parseStoredUtc(b.date) - parseStoredUtc(a.date)).slice(0, 5);
  }, [notifications, ownWorkLogs, events, period]);
  const shownAnnouncements = useMemo(() => announcements.filter((item) => inPeriod(item.created_at || item.date)).slice(0, 3), [announcements, period]);

  return <div className="w-full max-w-none space-y-5">
    <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{greeting}, {activeUser?.name?.split(' ')[0] || 'there'}.</h1><p className="mt-1 text-sm text-slate-500">Your work pulse for {periodLabel[period].toLowerCase()}.</p></div><div className="flex flex-wrap gap-2"><label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><SlidersHorizontal className="h-3.5 w-3.5 text-[var(--accent)]" /><select value={period} onChange={(event) => setPeriod(event.target.value)} className="bg-transparent outline-none"><option value="this_month">This month</option><option value="last_month">Last month</option><option value="this_year">This year</option><option value="overall">Overall</option></select></label><button onClick={() => onNavigate('attendance')} className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white">Mark office presence</button></div></section>
    {(overdueTasks.length || overdueProjects.length) && <section className="glass-card border-rose-200 p-5 dark:border-rose-500/30"><div className="flex items-center justify-between gap-4"><div><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-rose-600" /><h2 className="text-base font-bold">Overdue work</h2></div><p className="mt-1 text-xs text-slate-500">These items are past their completion date and still need attention.</p></div><button onClick={() => onNavigate('projects')} className="text-xs font-semibold text-[var(--accent)]">Open projects</button></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{overdueTasks.map((task) => <div key={task.id} className="rounded-xl border border-rose-200 bg-rose-50/60 px-3.5 py-3 text-sm dark:border-rose-500/30 dark:bg-rose-500/10"><p className="font-semibold">{task.title}</p><p className="mt-1 text-xs text-rose-700 dark:text-rose-200">Task due {task.due_date}</p></div>)}{overdueProjects.map((project) => <div key={project.id} className="rounded-xl border border-rose-200 bg-rose-50/60 px-3.5 py-3 text-sm dark:border-rose-500/30 dark:bg-rose-500/10"><p className="font-semibold">{project.title}</p><p className="mt-1 text-xs text-rose-700 dark:text-rose-200">Project due {project.deadline}</p></div>)}</div></section>}
    <button type="button" onClick={() => onNavigate('daily_tasks')} className="glass-card block w-full border-[var(--accent-line)] p-5 text-left transition hover:bg-[var(--accent-soft)]"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-[var(--accent)]" /><h2 className="text-base font-bold">New daily tasks</h2></div><p className="mt-1 text-sm text-slate-500">Work assigned directly to you or to the whole company.</p></div><span className="rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-bold text-[var(--accent-ink)]">{openDailyTasks.length} open</span></div><div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300"><span>{openDailyTasks.slice(0, 3).map((task) => task.title).join(' · ') || 'No new daily tasks'}</span><span className="inline-flex items-center gap-1 text-[var(--accent)]">Open daily tasks <ArrowRight className="h-3.5 w-3.5" /></span></div></button>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric onClick={() => onNavigate('projects')} icon={BriefcaseBusiness} label="Assigned work" value={summary.activeTasks} detail={`${summary.completedTasks} completed`} /><Metric onClick={() => onNavigate('attendance')} icon={Clock3} label="Average working day" value={summary.presentDays ? formatHours(summary.averageMinutes) : '—'} detail={summary.presentDays ? `${summary.presentDays} completed office day${summary.presentDays === 1 ? '' : 's'}` : 'No completed office days'} /><Metric onClick={() => onNavigate('attendance')} icon={CalendarDays} label="Office hours" value={formatHours(summary.officeMinutes)} detail="Completed check-in sessions" /><Metric onClick={() => onNavigate('attendance')} icon={Home} label="Extra office time" value={formatHours(summary.extraMinutes)} detail="Time after 7:00 PM" /><Metric onClick={() => onNavigate('projects')} icon={AlertTriangle} label="Overdue work" value={overdueTasks.length + overdueProjects.length} detail={`${overdueTasks.length} task${overdueTasks.length === 1 ? '' : 's'} · ${overdueProjects.length} project${overdueProjects.length === 1 ? '' : 's'}`} /></section>
    <section className="grid gap-5 lg:grid-cols-[1.18fr_.82fr]"><div className="glass-card p-5"><div className="flex items-center justify-between"><div><h2 className="text-base font-bold">My work</h2><p className="mt-1 text-xs text-slate-500">Projects and tasks currently assigned to you.</p></div><button onClick={() => onNavigate('projects')} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]">Open projects <ArrowRight className="h-3.5 w-3.5" /></button></div><div className="mt-4 space-y-2">{activeProjects.slice(0, 4).map((project) => <div key={project.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-800"><span className="font-semibold">{project.title}</span><span className="text-xs text-slate-500">{tasks.filter((task) => task.project_id === project.id && task.assigned_to === activeUser?.id).length} assigned</span></div>)}{!activeProjects.length && <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-slate-700">No assigned work yet. Your manager will add work here.</p>}</div></div><div className="glass-card p-5"><div className="flex items-center gap-2"><Bell className="h-4 w-4 text-[var(--accent)]" /><h2 className="text-base font-bold">Company activity</h2></div><p className="mt-1 text-xs text-slate-500">Policy, calendar and review updates relevant to you.</p><div className="mt-4 space-y-3">{companyUpdates.map((item) => { const Icon = item.icon; return <button type="button" onClick={() => onNavigate(item.destination)} key={item.id} className="flex w-full gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-[var(--accent-line)] dark:border-slate-800"><span className="mt-0.5 rounded-lg bg-[var(--accent-soft)] p-2 text-[var(--accent-ink)]"><Icon className="h-3.5 w-3.5" /></span><div className="min-w-0"><div className="flex items-start justify-between gap-3"><p className="text-xs font-bold">{item.title}</p><span className="shrink-0 text-[10px] text-slate-400">{readableDate(item.date)}</span></div><p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p></div></button>; })}{!companyUpdates.length && <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-slate-700">New policy, calendar and daily-log review updates will appear here.</p>}</div></div></section>
    <section className="grid gap-5 lg:grid-cols-2"><div className="glass-card p-5"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-[var(--accent)]" /><h2 className="text-base font-bold">Company announcements</h2></div><button onClick={() => onNavigate('announcements')} className="text-xs font-semibold text-[var(--accent)]">View all</button></div><div className="mt-4 space-y-3">{shownAnnouncements.map((item) => <button type="button" onClick={() => onNavigate('announcements')} key={item.id} className="block w-full rounded-xl border border-slate-200 p-3.5 text-left transition hover:border-[var(--accent-line)] dark:border-slate-800"><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold">{item.title}</p><span className="shrink-0 text-[10px] text-slate-400">{readableDate(item.created_at || item.date)}</span></div><p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-500">{item.content}</p></button>)}{!shownAnnouncements.length && <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-slate-700">No company announcements for this period.</p>}</div></div></section>
  </div>;
}

function Metric({ icon: Icon, label, value, detail, onClick }) { return <button type="button" onClick={onClick} className="glass-card p-5 text-left transition hover:border-[var(--accent-line)]"><Icon className="h-4 w-4 text-[var(--accent)]" /><p className="mt-3 text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></button>; }

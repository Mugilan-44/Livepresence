import React, { useMemo, useState } from 'react';

const months = Array.from({ length: 4 }, (_, index) => { const date = new Date(); date.setMonth(date.getMonth() - index); return { value: date.toISOString().slice(0, 7), label: new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(date) }; });
const dateOf = value => String(value || '').slice(0, 10);
const hours = value => Number.parseFloat(String(value || '0').replace(/[^\d.]/g, '')) || 0;

export default function MonthlyWrap({ activeUser, attendanceLogs = [], workLogs = [], tasks = [] }) {
  const [month, setMonth] = useState(months[0].value);
  const summary = useMemo(() => {
    const office = attendanceLogs.filter(log => dateOf(log.check_in).startsWith(month));
    const logs = workLogs.filter(log => (log.user_id || log.userId) === activeUser?.id && dateOf(log.date || log.created_at).startsWith(month));
    const projectNames = [...new Set([...logs.map(log => log.project_title), ...tasks.filter(task => task.assigned_to === activeUser?.id).map(task => task.project_title)].filter(Boolean))];
    const officeHours = office.reduce((total, log) => total + hours(log.working_hours), 0);
    const extraHours = office.reduce((total, log) => total + hours(log.overtime), 0);
    const dates = office.map(log => dateOf(log.check_in)).filter(Boolean);
    const mostWorkedDate = dates.sort((left, right) => dates.filter(day => day === right).length - dates.filter(day => day === left).length)[0];
    return { logs: logs.length, projectNames, officeHours, extraHours, mostWorkedDate };
  }, [activeUser?.id, attendanceLogs, month, tasks, workLogs]);
  const dateLabel = summary.mostWorkedDate ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(`${summary.mostWorkedDate}T12:00:00`)) : '—';
  return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#111827]"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-semibold text-slate-900 dark:text-white">Monthly wrap</p><h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Your {months.find(item => item.value === month)?.label} at a glance.</h2><p className="mt-1 text-sm text-slate-500">A private summary of the work you recorded.</p></div><select value={month} onChange={event => setMonth(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white">{months.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Stat label="Work entries" value={summary.logs} detail="Daily logs submitted" /><Stat label="Projects touched" value={summary.projectNames.length} detail={summary.projectNames.slice(0, 2).join(' · ') || 'No project yet'} /><Stat label="Office time" value={`${summary.officeHours.toFixed(1)}h`} detail={`${summary.extraHours.toFixed(1)}h after-hours`} /><Stat label="Most active day" value={dateLabel} detail="Based on office presence" /></div></section>;
}

function Stat({ label, value, detail }) { return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{value}</p><p className="mt-1 truncate text-xs text-slate-500">{detail}</p></div>; }

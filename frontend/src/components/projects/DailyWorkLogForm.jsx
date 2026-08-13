import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Clock3, Home, LockKeyhole, Pencil, Plus } from 'lucide-react';
import { getApiUrl } from '../../config/api';

const isoDate = (value) => {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const direct = String(value || '').match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (direct) return direct;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
};
const displayDate = (value) => {
  const date = isoDate(value);
  return date ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(new Date(`${date}T12:00:00`)) : '—';
};
const editableWithin48Hours = (entry) => !entry?.created_at || Date.now() - new Date(entry.created_at).getTime() <= 48 * 60 * 60 * 1000;
const ledgerDays = Array.from({ length: 14 }, (_, index) => {
  const date = new Date(); date.setDate(date.getDate() - (13 - index));
  return { date: isoDate(date), day: new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(date) };
});

function GrowingTextArea({ value, onChange, placeholder }) {
  const ref = useRef(null);
  const resize = () => {
    if (!ref.current) return;
    ref.current.style.height = '0px';
    ref.current.style.height = `${Math.max(48, ref.current.scrollHeight)}px`;
  };
  useEffect(resize, [value]);
  return <textarea ref={ref} rows={1} value={value} onChange={(event) => { onChange(event); requestAnimationFrame(resize); }} placeholder={placeholder} className="block min-h-12 w-full resize-none overflow-hidden bg-transparent px-3 py-2.5 leading-5 outline-none placeholder:text-slate-400" />;
}

function EntryButton({ entry, editable, saving, onSave }) {
  if (!editable) return <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500"><LockKeyhole className="h-3 w-3" /> Locked</span>;
  return <button onClick={onSave} disabled={saving} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-slate-900">{saving ? 'Saving…' : <>{entry ? <Pencil className="h-3 w-3" /> : <Plus className="h-3 w-3" />}{entry ? 'Update' : 'Save'}</>}</button>;
}

export default function DailyWorkLogForm({ activeUser, onSubmitLog, onRefreshLogs, logs = [], projects = [], attendanceLogs = [] }) {
  const [location, setLocation] = useState('office');
  const [officeDrafts, setOfficeDrafts] = useState({});
  const [homeEntries, setHomeEntries] = useState([]);
  const [homeDrafts, setHomeDrafts] = useState({});
  const [saving, setSaving] = useState('');
  const [notice, setNotice] = useState('');
  const today = isoDate(new Date());
  const ownLogs = useMemo(() => logs.filter((log) => (log.user_id || log.userId) === activeUser?.id), [logs, activeUser?.id]);
  const ownAttendance = attendanceLogs.find((item) => item.user_id === activeUser?.id && isoDate(item.check_in) === today);
  const founderLogs = useMemo(() => logs.filter((log) => (log.user_id || log.userId) !== activeUser?.id), [logs, activeUser?.id]);
  const rows = location === 'office' ? ledgerDays : ledgerDays.filter((row) => row.date <= today);
  const officeEntry = (date) => ownLogs.find((entry) => isoDate(entry.date || entry.created_at) === date);
  const homeEntry = (date) => homeEntries.find((entry) => isoDate(entry.work_date) === date);
  const officeText = (entry) => entry?.summary || entry?.completed_work || '';
  const setDraft = (setter, date, values) => setter((current) => ({ ...current, [date]: { ...(current[date] || {}), ...values } }));

  const loadHomeEntries = async () => {
    const response = await fetch(getApiUrl(`/api/collaboration/home-time?userId=${encodeURIComponent(activeUser?.id || '')}`));
    if (response.ok) setHomeEntries(await response.json());
  };
  useEffect(() => { if (activeUser?.id) loadHomeEntries(); }, [activeUser?.id]);

  const saveOffice = async (date) => {
    const entry = officeEntry(date); const draft = officeDrafts[date] || {};
    const summary = (draft.summary ?? officeText(entry)).trim();
    if (!summary) { setNotice('Describe the work before saving this entry.'); return; }
    setSaving(`office-${date}`); setNotice('');
    try {
      if (entry) {
        const response = await fetch(getApiUrl(`/api/work-logs/${entry.id}`), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: activeUser.id, summary, projectTitle: draft.projectTitle || entry.project_title, hoursSpent: draft.hoursSpent || entry.hours_spent }) });
        const result = await response.json(); if (!response.ok) throw new Error(result.error);
        await onRefreshLogs?.();
      } else {
        await onSubmitLog({ userId: activeUser.id, userName: activeUser.name, completedWork: summary, summary, projectTitle: draft.projectTitle || projects[0]?.title || 'General work', hoursSpent: Number(draft.hoursSpent || 8), checkInTime: ownAttendance?.check_in, date });
      }
      setOfficeDrafts((current) => ({ ...current, [date]: {} })); setNotice(`Office entry saved for ${displayDate(date)}.`);
    } catch (error) { setNotice(error.message || 'Could not save this entry.'); }
    finally { setSaving(''); }
  };

  const saveHome = async (date) => {
    const entry = homeEntry(date); const draft = homeDrafts[date] || {};
    const payload = { userId: activeUser.id, workDate: date, startTime: draft.startTime ?? entry?.start_time ?? '', endTime: draft.endTime ?? entry?.end_time ?? '', reason: (draft.reason ?? entry?.reason ?? '').trim(), workKind: 'Off-day / home work' };
    if (!payload.reason || !payload.startTime || !payload.endTime) { setNotice('Choose your actual start and end time, then describe the work.'); return; }
    setSaving(`home-${date}`); setNotice('');
    try {
      if (payload.endTime <= payload.startTime) throw new Error('End time must be after start time.');
      const response = await fetch(getApiUrl(entry ? `/api/collaboration/home-time/${entry.id}` : '/api/collaboration/home-time'), { method: entry ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setHomeDrafts((current) => ({ ...current, [date]: {} })); await loadHomeEntries(); setNotice(`Home entry saved for ${displayDate(date)}.`);
    } catch (error) { setNotice(error.message || 'Could not save this entry.'); }
    finally { setSaving(''); }
  };

  const markSeen = async (entry) => {
    setSaving(`seen-${entry.id}`); setNotice('');
    try {
      const response = await fetch(getApiUrl(`/api/work-logs/${entry.id}/seen`), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userRole: activeUser?.role, actorName: activeUser?.name }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      await onRefreshLogs?.(); setNotice(`Marked ${entry.user_name || 'employee'}'s update as seen.`);
    } catch (error) { setNotice(error.message || 'Could not mark this log as seen.'); }
    finally { setSaving(''); }
  };

  return <div className="mx-auto max-w-6xl space-y-5">
    <section className="glass-card flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-6"><div><p className="page-eyebrow">Daily logs</p><h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">Your work, in one simple sheet</h2><p className="mt-2 text-sm text-slate-500">Your work update grows as you type. Entries can be corrected for 48 hours, then lock.</p></div><div className="grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900"><button onClick={() => setLocation('office')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${location === 'office' ? 'bg-white shadow-sm dark:bg-slate-800' : 'text-slate-500'}`}>Office</button><button onClick={() => setLocation('home')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${location === 'home' ? 'bg-white shadow-sm dark:bg-slate-800' : 'text-slate-500'}`}>Home / off-day</button></div></section>

    {activeUser?.role === 'SUPER_ADMIN' && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#111827]"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5 dark:border-slate-800"><div><p className="text-sm font-semibold">Employee daily-log review</p><p className="mt-1 text-xs text-slate-500">Review and acknowledge each employee update.</p></div><span className="text-xs font-semibold text-slate-500">{founderLogs.filter((log) => !log.founder_seen).length} to review</span></div><div className="divide-y divide-slate-200 md:hidden dark:divide-slate-800">{founderLogs.map((log) => <article key={log.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{log.user_name || 'Employee'}</p><p className="mt-1 text-xs text-slate-500">{displayDate(log.date || log.created_at)} · {log.project_title || 'General work'}</p></div>{log.founder_seen ? <span className="text-xs font-semibold text-emerald-600">Seen</span> : <button onClick={() => markSeen(log)} disabled={saving === `seen-${log.id}`} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white">{saving === `seen-${log.id}` ? 'Saving…' : 'Mark seen'}</button>}</div><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-5 text-slate-600 dark:text-slate-300">{officeText(log)}</p></article>)}{!founderLogs.length && <p className="p-8 text-center text-sm text-slate-500">No employee daily logs yet.</p>}</div><div className="hidden max-h-72 overflow-auto md:block"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-900 dark:text-slate-300"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Project</th><th className="px-4 py-3">Work update</th><th className="px-4 py-3">Review</th></tr></thead><tbody>{founderLogs.map((log) => <tr key={log.id} className="border-t border-slate-200 dark:border-slate-800"><td className="px-4 py-3 font-semibold">{log.user_name || 'Employee'}</td><td className="px-4 py-3">{displayDate(log.date || log.created_at)}</td><td className="px-4 py-3">{log.project_title || 'General work'}</td><td className="max-w-sm whitespace-pre-wrap break-words px-4 py-3 text-slate-600 dark:text-slate-300">{officeText(log)}</td><td className="px-4 py-3">{log.founder_seen ? <span className="text-xs font-semibold text-emerald-600">Seen</span> : <button onClick={() => markSeen(log)} disabled={saving === `seen-${log.id}`} className="rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-xs font-semibold text-white">{saving === `seen-${log.id}` ? 'Saving…' : 'Mark seen'}</button>}</td></tr>)}{!founderLogs.length && <tr><td colSpan="5" className="px-4 py-8 text-center text-sm text-slate-500">No employee daily logs yet.</td></tr>}</tbody></table></div></section>}

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#111827]"><div className="flex flex-col gap-1 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 dark:border-slate-800"><p className="text-sm font-semibold">{location === 'office' ? 'Office work ledger' : 'Home & off-day work ledger'}</p><p className="text-xs text-slate-500">{location === 'office' ? (ownAttendance ? 'Today is linked to office presence' : 'Check in first to link today’s row') : 'Set the actual day and hours you worked.'}</p></div>
      <div className="divide-y divide-slate-200 md:hidden dark:divide-slate-800">{rows.map((row) => { const entry = location === 'office' ? officeEntry(row.date) : homeEntry(row.date); const editable = !entry || editableWithin48Hours(entry); const draft = location === 'office' ? officeDrafts[row.date] || {} : homeDrafts[row.date] || {}; return <article key={row.date} className={row.date === today ? 'bg-[var(--accent-soft)]/35 p-4' : 'p-4'}><div className="mb-3 flex items-center justify-between"><div><p className="font-semibold">{displayDate(row.date)}</p><p className="text-xs text-slate-500">{row.day}{row.date === today ? ' · Today' : ''}</p></div>{!editable && <span className="inline-flex items-center gap-1 text-xs text-slate-500"><LockKeyhole className="h-3 w-3" /> Locked</span>}</div>{location === 'office' ? <div className="space-y-3"><label className="block text-xs font-semibold text-slate-500">Project</label><div>{editable ? <select value={draft.projectTitle ?? entry?.project_title ?? projects[0]?.title ?? 'General work'} onChange={(event) => setDraft(setOfficeDrafts, row.date, { projectTitle: event.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-900">{projects.map((project) => <option key={project.id}>{project.title}</option>)}<option>General work</option></select> : <p className="text-sm">{entry?.project_title || 'General work'}</p>}</div><label className="block text-xs font-semibold text-slate-500">Work update</label><div className="rounded-lg border border-slate-200 dark:border-slate-700">{editable ? <GrowingTextArea value={draft.summary ?? officeText(entry)} onChange={(event) => setDraft(setOfficeDrafts, row.date, { summary: event.target.value })} placeholder="Record work completed…" /> : <p className="whitespace-pre-wrap break-words px-3 py-2.5 text-sm leading-5">{officeText(entry)}</p>}</div><div className="flex items-center justify-between gap-3"><label className="text-xs font-semibold text-slate-500">Hours {editable && <input type="number" min="0.25" max="24" step="0.25" value={draft.hoursSpent ?? entry?.hours_spent ?? 8} onChange={(event) => setDraft(setOfficeDrafts, row.date, { hoursSpent: event.target.value })} className="ml-2 w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900" />}</label><EntryButton entry={entry} editable={editable} saving={saving === `office-${row.date}`} onSave={() => saveOffice(row.date)} /></div></div> : <div className="space-y-3"><div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold text-slate-500">Start{editable ? <input type="time" value={draft.startTime ?? entry?.start_time ?? ''} onChange={(event) => setDraft(setHomeDrafts, row.date, { startTime: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" /> : <span className="mt-1 block text-sm text-slate-900 dark:text-white">{entry?.start_time}</span>}</label><label className="text-xs font-semibold text-slate-500">End{editable ? <input type="time" value={draft.endTime ?? entry?.end_time ?? ''} onChange={(event) => setDraft(setHomeDrafts, row.date, { endTime: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" /> : <span className="mt-1 block text-sm text-slate-900 dark:text-white">{entry?.end_time}</span>}</label></div><label className="block text-xs font-semibold text-slate-500">Work done</label><div className="rounded-lg border border-slate-200 dark:border-slate-700">{editable ? <GrowingTextArea value={draft.reason ?? entry?.reason ?? ''} onChange={(event) => setDraft(setHomeDrafts, row.date, { reason: event.target.value })} placeholder="Describe the work done at home…" /> : <p className="whitespace-pre-wrap break-words px-3 py-2.5 text-sm leading-5">{entry?.reason}</p>}</div><EntryButton entry={entry} editable={editable} saving={saving === `home-${row.date}`} onSave={() => saveHome(row.date)} /></div>}</article>; })}</div>
      <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[920px] border-collapse text-left text-sm"><thead><tr className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-900 dark:text-slate-300"><th className="border-r border-slate-200 px-4 py-3 dark:border-slate-800">Date</th><th className="border-r border-slate-200 px-4 py-3 dark:border-slate-800">Day</th>{location === 'office' ? <><th className="border-r border-slate-200 px-4 py-3 dark:border-slate-800">Project</th><th className="border-r border-slate-200 px-4 py-3 dark:border-slate-800">Work update</th><th className="border-r border-slate-200 px-4 py-3 dark:border-slate-800">Hours</th></> : <><th className="border-r border-slate-200 px-4 py-3 dark:border-slate-800">Time</th><th className="border-r border-slate-200 px-4 py-3 dark:border-slate-800">Work done</th></>}<th className="px-4 py-3">Entry</th></tr></thead><tbody>{rows.map((row) => { const entry = location === 'office' ? officeEntry(row.date) : homeEntry(row.date); const editable = !entry || editableWithin48Hours(entry); const draft = location === 'office' ? officeDrafts[row.date] || {} : homeDrafts[row.date] || {}; return <tr key={row.date} className={row.date === today ? 'bg-[var(--accent-soft)]/40' : ''}><td className="border-r border-t border-slate-200 px-4 py-3 font-medium dark:border-slate-800">{displayDate(row.date)}</td><td className="border-r border-t border-slate-200 px-4 py-3 text-slate-500 dark:border-slate-800">{row.day}</td>{location === 'office' ? <><td className="border-r border-t border-slate-200 p-0 dark:border-slate-800">{editable ? <select value={draft.projectTitle ?? entry?.project_title ?? projects[0]?.title ?? 'General work'} onChange={(event) => setDraft(setOfficeDrafts, row.date, { projectTitle: event.target.value })} className="w-full bg-transparent px-4 py-3 text-xs outline-none">{projects.map((project) => <option key={project.id}>{project.title}</option>)}<option>General work</option></select> : <span className="px-4 py-3">{entry?.project_title || 'General work'}</span>}</td><td className="border-r border-t border-slate-200 p-0 align-top dark:border-slate-800">{editable ? <GrowingTextArea value={draft.summary ?? officeText(entry)} onChange={(event) => setDraft(setOfficeDrafts, row.date, { summary: event.target.value })} placeholder="Click to record work…" /> : <p className="whitespace-pre-wrap break-words px-4 py-3 leading-5">{officeText(entry)}</p>}</td><td className="border-r border-t border-slate-200 p-0 align-top dark:border-slate-800">{editable ? <input type="number" min="0.25" max="24" step="0.25" value={draft.hoursSpent ?? entry?.hours_spent ?? 8} onChange={(event) => setDraft(setOfficeDrafts, row.date, { hoursSpent: event.target.value })} className="w-20 bg-transparent px-4 py-3 font-mono text-xs outline-none" /> : `${entry?.hours_spent || 8}h`}</td></> : <><td className="border-r border-t border-slate-200 p-0 align-top dark:border-slate-800">{editable ? <div className="flex items-center gap-1 px-3"><input type="time" value={draft.startTime ?? entry?.start_time ?? ''} onChange={(event) => setDraft(setHomeDrafts, row.date, { startTime: event.target.value })} className="bg-transparent py-3 text-xs outline-none" /><span className="text-slate-400">to</span><input type="time" value={draft.endTime ?? entry?.end_time ?? ''} onChange={(event) => setDraft(setHomeDrafts, row.date, { endTime: event.target.value })} className="bg-transparent py-3 text-xs outline-none" /></div> : <span className="px-4 py-3 font-mono text-xs">{entry?.start_time} – {entry?.end_time}</span>}</td><td className="border-r border-t border-slate-200 p-0 align-top dark:border-slate-800">{editable ? <GrowingTextArea value={draft.reason ?? entry?.reason ?? ''} onChange={(event) => setDraft(setHomeDrafts, row.date, { reason: event.target.value })} placeholder="Describe the work done at home…" /> : <p className="whitespace-pre-wrap break-words px-4 py-3 leading-5">{entry?.reason}</p>}</td></>}<td className="border-t border-slate-200 px-4 py-3 align-top dark:border-slate-800"><EntryButton entry={entry} editable={editable} saving={saving === `${location}-${row.date}`} onSave={() => location === 'office' ? saveOffice(row.date) : saveHome(row.date)} /></td></tr>; })}</tbody></table></div>
    </section>
    {notice && <p className={notice.includes('saved') || notice.includes('seen') ? 'text-sm text-emerald-700 dark:text-emerald-300' : 'text-sm text-rose-600'}>{notice}</p>}
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" /> Entries become read-only 48 hours after submission. <Home className="h-3.5 w-3.5" /> Home/off-day work is kept separately for founder reporting.</p>
  </div>;
}

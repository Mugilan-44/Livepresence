import React, { useState } from 'react';
import { CalendarDays, Check, Layers3, Plus, Save, Settings2, Trash2, X } from 'lucide-react';

const defaultLeaveTypes = [
  { id: 'casual', label: 'Casual Leave', maxDays: 12, badgeColor: 'bg-slate-100 text-slate-700 border-slate-200' },
  { id: 'sick', label: 'Sick Leave', maxDays: 10, badgeColor: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'earned', label: 'Privilege / Earned Leave', maxDays: 15, badgeColor: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'wfh', label: 'Work From Home Pass', maxDays: 30, badgeColor: 'bg-[var(--accent-soft)] text-[var(--accent-ink)] border-[var(--accent-line)]' },
  { id: 'special', label: 'Special / Parental Leave', maxDays: 90, badgeColor: 'bg-violet-50 text-violet-700 border-violet-200' }
];

const defaultTaskStatuses = [
  { id: 'todo', label: 'To Do', color: 'bg-slate-500', textColor: 'text-slate-700' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-[var(--accent)]', textColor: 'text-[var(--accent-ink)]' },
  { id: 'code_review', label: 'Code Review', color: 'bg-violet-500', textColor: 'text-violet-700' },
  { id: 'testing', label: 'Testing / QA', color: 'bg-amber-500', textColor: 'text-amber-700' },
  { id: 'completed', label: 'Completed', color: 'bg-emerald-500', textColor: 'text-emerald-700' },
  { id: 'blocked', label: 'Blocked / Escalated', color: 'bg-rose-500', textColor: 'text-rose-700' }
];
const arraySetting = (value, fallback) => {
  if (Array.isArray(value)) return value;
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : fallback; } catch { return fallback; }
};

export default function CustomizationSettingsModal({ onClose, customizations, onSaveCustomizations }) {
  const [activeTab, setActiveTab] = useState('leave_options');
  const [leaveTypes, setLeaveTypes] = useState(() => arraySetting(customizations?.leave_types, defaultLeaveTypes));
  const [taskStatuses, setTaskStatuses] = useState(() => arraySetting(customizations?.task_statuses, defaultTaskStatuses));
  const [newLeaveLabel, setNewLeaveLabel] = useState('');
  const [newLeaveMaxDays, setNewLeaveMaxDays] = useState(12);
  const [newTaskLabel, setNewTaskLabel] = useState('');
  const [newTaskColor, setNewTaskColor] = useState('bg-[var(--accent)]');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const addLeave = event => {
    event.preventDefault();
    if (!newLeaveLabel.trim()) return;
    setLeaveTypes(current => [...current, { id: `custom_leave_${Date.now()}`, label: newLeaveLabel.trim(), maxDays: Number(newLeaveMaxDays) || 1, badgeColor: 'bg-[var(--accent-soft)] text-[var(--accent-ink)] border-[var(--accent-line)]' }]);
    setNewLeaveLabel(''); setNewLeaveMaxDays(12);
  };
  const addStatus = event => {
    event.preventDefault();
    if (!newTaskLabel.trim()) return;
    setTaskStatuses(current => [...current, { id: `custom_status_${Date.now()}`, label: newTaskLabel.trim(), color: newTaskColor, textColor: 'text-slate-700' }]);
    setNewTaskLabel('');
  };
  const save = async () => {
    setIsSaving(true);
    try {
      await onSaveCustomizations({ leave_types: leaveTypes, task_statuses: taskStatuses, task_priorities: customizations?.task_priorities || ['Low', 'Medium', 'High', 'Critical'] });
      setSaveSuccess(true); window.setTimeout(() => { setSaveSuccess(false); onClose(); }, 900);
    } finally { setIsSaving(false); }
  };

  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-labelledby="workflow-settings-title" className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
      <header className="flex items-start justify-between gap-5 border-b border-slate-200 px-6 py-5">
        <div className="flex gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"><Settings2 className="h-5 w-5" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent-ink)]">Founder settings</p><h2 id="workflow-settings-title" className="mt-1 text-xl font-bold tracking-tight">Company workflow settings</h2><p className="mt-1 max-w-xl text-sm text-slate-500">Set leave policies and the stages your team uses to report project progress. Changes apply across the company after you save.</p></div></div>
        <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" title="Close settings"><X className="h-4 w-4" /></button>
      </header>

      <div className="grid gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4 sm:grid-cols-2"><Summary icon={CalendarDays} label="Leave policies" value={leaveTypes.length} detail="Types employees can request" /><Summary icon={Layers3} label="Workflow stages" value={taskStatuses.length} detail="Columns available on project boards" /></div>

      <nav className="flex gap-2 border-b border-slate-200 px-6 pt-4" aria-label="Workflow settings sections"><Tab active={activeTab === 'leave_options'} onClick={() => setActiveTab('leave_options')} icon={CalendarDays} label="Leave policies" /><Tab active={activeTab === 'task_options'} onClick={() => setActiveTab('task_options')} icon={Layers3} label="Project workflow" /></nav>

      <main className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {activeTab === 'leave_options' ? <div className="space-y-5"><div><h3 className="text-sm font-bold">Leave policies</h3><p className="mt-1 text-sm text-slate-500">Set the maximum number of days an employee can request in a year.</p></div><form onSubmit={addLeave} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_132px_auto]"><label className="text-xs font-semibold text-slate-600">Policy name<input value={newLeaveLabel} onChange={event => setNewLeaveLabel(event.target.value)} placeholder="e.g. Bereavement leave" className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-[var(--accent)]" /></label><label className="text-xs font-semibold text-slate-600">Days per year<input type="number" min="1" max="365" value={newLeaveMaxDays} onChange={event => setNewLeaveMaxDays(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-[var(--accent)]" /></label><button disabled={!newLeaveLabel.trim()} className="self-end rounded-lg bg-[var(--accent)] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-45"><Plus className="mr-1 inline h-4 w-4" />Add</button></form><div className="overflow-hidden rounded-xl border border-slate-200"><div className="grid grid-cols-[minmax(0,1fr)_160px_40px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"><span>Policy</span><span>Annual allowance</span><span /></div>{leaveTypes.map(leave => <div key={leave.id} className="grid grid-cols-[minmax(0,1fr)_160px_40px] items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0"><span className={`w-fit rounded-md border px-2.5 py-1 text-sm font-semibold ${leave.badgeColor || 'bg-slate-100 text-slate-700 border-slate-200'}`}>{leave.label}</span><label className="flex items-center gap-2 text-sm text-slate-500"><input type="number" min="1" max="365" value={leave.maxDays} onChange={event => setLeaveTypes(current => current.map(item => item.id === leave.id ? { ...item, maxDays: Number(event.target.value) || 1 } : item))} className="w-16 rounded-md border border-slate-300 px-2 py-1.5 text-center font-semibold text-slate-900 outline-none focus:border-[var(--accent)]" />days</label><button type="button" onClick={() => setLeaveTypes(current => current.filter(item => item.id !== leave.id))} className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-700" title={`Remove ${leave.label}`}><Trash2 className="h-4 w-4" /></button></div>)}</div></div> : <div className="space-y-5"><div><h3 className="text-sm font-bold">Project workflow</h3><p className="mt-1 text-sm text-slate-500">These stages appear across project boards and let the founder view real progress.</p></div><form onSubmit={addStatus} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_170px_auto]"><label className="text-xs font-semibold text-slate-600">Stage name<input value={newTaskLabel} onChange={event => setNewTaskLabel(event.target.value)} placeholder="e.g. Client review" className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-[var(--accent)]" /></label><label className="text-xs font-semibold text-slate-600">Stage colour<select value={newTaskColor} onChange={event => setNewTaskColor(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-[var(--accent)]"><option value="bg-[var(--accent)]">Workspace accent</option><option value="bg-slate-500">Slate</option><option value="bg-violet-500">Violet</option><option value="bg-amber-500">Amber</option><option value="bg-emerald-500">Emerald</option><option value="bg-rose-500">Rose</option></select></label><button disabled={!newTaskLabel.trim()} className="self-end rounded-lg bg-[var(--accent)] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-45"><Plus className="mr-1 inline h-4 w-4" />Add</button></form><div className="overflow-hidden rounded-xl border border-slate-200"><div className="grid grid-cols-[minmax(0,1fr)_40px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"><span>Board stage</span><span /></div>{taskStatuses.map(status => <div key={status.id} className="grid grid-cols-[minmax(0,1fr)_40px] items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0"><div className="flex items-center gap-3"><span className={`h-2.5 w-2.5 rounded-full ${status.color || 'bg-slate-500'}`} /><span className="text-sm font-semibold">{status.label}</span></div><button type="button" onClick={() => { if (taskStatuses.length > 2) setTaskStatuses(current => current.filter(item => item.id !== status.id)); }} disabled={taskStatuses.length <= 2} className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-30" title="Remove stage"><Trash2 className="h-4 w-4" /></button></div>)}</div></div>}
      </main>

      <footer className="flex flex-col gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-500">Changes do not apply until you save them.</p><div className="flex items-center gap-3"><button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button><button type="button" onClick={save} disabled={isSaving} className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50">{saveSuccess ? <><Check className="mr-1 inline h-4 w-4" />Saved</> : isSaving ? 'Saving…' : <><Save className="mr-1 inline h-4 w-4" />Save changes</>}</button></div></footer>
    </section>
  </div>;
}

function Summary({ icon: Icon, label, value, detail }) { return <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]"><Icon className="h-4 w-4" /></div><div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="text-lg font-bold">{value} <span className="text-xs font-medium text-slate-500">{detail}</span></p></div></div>; }
function Tab({ active, onClick, icon: Icon, label }) { return <button type="button" onClick={onClick} className={`flex items-center gap-2 border-b-2 px-3 pb-3 text-sm font-semibold transition ${active ? 'border-[var(--accent)] text-[var(--accent-ink)]' : 'border-transparent text-slate-500 hover:text-slate-900'}`}><Icon className="h-4 w-4" />{label}</button>; }

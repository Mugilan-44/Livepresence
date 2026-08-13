import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { getApiUrl } from '../../config/api';

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const eventTone = (type = '') => {
  const value = type.toLowerCase();
  if (value.includes('holiday')) return 'bg-orange-50 text-orange-800 border-orange-200';
  if (value.includes('leave')) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (value.includes('home')) return 'bg-rose-50 text-rose-800 border-rose-200';
  return 'bg-[var(--accent-soft)] text-[var(--accent-ink)] border-[var(--accent-line)]';
};
const keyFor = (date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
const eventKey = (value) => String(value || '').slice(0, 10);
const monthTitle = (date) => date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

export default function TeamCalendarPage({ activeUser }) {
  const now = new Date();
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(keyFor(now));
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', eventDate: keyFor(now), eventTime: '', type: 'Team event' });
  const isFounder = activeUser?.role === 'SUPER_ADMIN';

  const refresh = async () => {
    try {
      const response = await fetch(getApiUrl('/api/collaboration/calendar'));
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data.error || 'Could not load the team calendar.');
      setEvents(data);
    } catch (loadError) { setError(loadError.message); }
  };
  useEffect(() => { refresh(); }, []);

  const days = useMemo(() => {
    const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const offset = (firstDay.getDay() + 6) % 7;
    const firstCell = new Date(cursor.getFullYear(), cursor.getMonth(), 1 - offset);
    return Array.from({ length: 42 }, (_, index) => new Date(firstCell.getFullYear(), firstCell.getMonth(), firstCell.getDate() + index));
  }, [cursor]);
  const byDate = useMemo(() => events.reduce((result, event) => {
    const key = eventKey(event.event_date);
    (result[key] ||= []).push(event);
    return result;
  }, {}), [events]);
  const selectedEvents = byDate[selectedDate] || [];
  const upcoming = useMemo(() => events.filter(event => eventKey(event.event_date) >= keyFor(now)).slice(0, 5), [events]);

  const createEvent = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch(getApiUrl('/api/collaboration/calendar'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, createdBy: activeUser.id, userRole: activeUser.role })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not create event.');
      setShowCreate(false); setForm({ title: '', eventDate: selectedDate, eventTime: '', type: 'Team event' }); await refresh();
    } catch (submitError) { setError(submitError.message); }
  };

  return <div className="mx-auto max-w-[1540px] space-y-6">
    <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="page-eyebrow">Planning</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Team calendar</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Company events, holidays, approved leave and approved home work in one shared view.</p></div>
      <div className="flex items-center gap-2"><button onClick={() => { setCursor(new Date(now.getFullYear(), now.getMonth(), 1)); setSelectedDate(keyFor(now)); }} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">Today</button>{isFounder && <button onClick={() => { setForm(current => ({ ...current, eventDate: selectedDate })); setShowCreate(true); }} className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Create event</button>}</div>
    </section>
    {error && <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><span>{error}</span><button onClick={() => setError('')}><X className="h-4 w-4" /></button></div>}
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#101012]">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800"><div className="flex items-center gap-1"><button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronLeft className="h-4 w-4" /></button><h2 className="min-w-40 text-base font-bold">{monthTitle(cursor)}</h2><button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight className="h-4 w-4" /></button></div><div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold text-slate-500"><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[var(--accent)]" />Event</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-orange-500" />Holiday</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-emerald-600" />Leave</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-rose-600" />Home work</span></div></div>
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">{dayNames.map(day => <div key={day} className="py-3">{day}</div>)}</div>
        <div className="grid grid-cols-7">{days.map(date => { const dateKey = keyFor(date); const cellEvents = byDate[dateKey] || []; const inMonth = date.getMonth() === cursor.getMonth(); const today = dateKey === keyFor(now); const selected = dateKey === selectedDate; return <button key={dateKey} onClick={() => setSelectedDate(dateKey)} className={`min-h-[118px] border-b border-r border-slate-100 p-2 text-left transition last:border-r-0 dark:border-slate-800 ${inMonth ? 'bg-white dark:bg-[#101012]' : 'bg-slate-50/70 text-slate-400 dark:bg-slate-950/30'} ${selected ? 'ring-2 ring-inset ring-[var(--accent-line)]' : 'hover:bg-[var(--accent-soft)]/30'}`}><span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${today ? 'bg-[var(--accent)] text-white' : ''}`}>{date.getDate()}</span><div className="mt-1.5 space-y-1">{cellEvents.slice(0, 2).map(event => <span key={event.id} title={event.title} className={`block truncate rounded-md border px-1.5 py-1 text-[9px] font-semibold ${eventTone(event.type)}`}>{event.event_time && !String(event.event_time).startsWith('Until') ? `${event.event_time} ` : ''}{event.title}</span>)}{cellEvents.length > 2 && <span className="block px-1.5 text-[9px] font-bold text-slate-500">+{cellEvents.length - 2} more</span>}</div></button>; })}</div>
      </section>
      <aside className="space-y-5"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#101012]"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Selected day</p><div className="mt-2 flex items-end justify-between"><div><h2 className="text-xl font-bold">{new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</h2><p className="text-xs text-slate-500">{selectedEvents.length} item{selectedEvents.length === 1 ? '' : 's'} planned</p></div><CalendarDays className="h-5 w-5 text-[var(--accent)]" /></div><div className="mt-4 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">{selectedEvents.length ? selectedEvents.map(event => <div key={event.id} className={`rounded-xl border p-3 ${eventTone(event.type)}`}><div className="flex items-start justify-between gap-2"><p className="text-xs font-bold">{event.title}</p><span className="shrink-0 text-[10px] font-semibold">{event.event_time || 'All day'}</span></div><p className="mt-1 text-[10px] font-medium opacity-75">{event.type}</p></div>) : <p className="py-4 text-center text-xs text-slate-500">Nothing is planned for this date.</p>}</div></section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#101012]"><div className="flex items-center justify-between"><h3 className="text-sm font-bold">Upcoming</h3><span className="text-[10px] font-semibold text-slate-500">Next 5</span></div><div className="mt-4 space-y-3">{upcoming.length ? upcoming.map(event => <button key={event.id} onClick={() => { setSelectedDate(eventKey(event.event_date)); setCursor(new Date(`${eventKey(event.event_date)}T00:00:00`)); }} className="flex w-full gap-3 text-left"><div className="w-9 rounded-lg bg-[var(--accent-soft)] py-1 text-center text-[10px] text-[var(--accent-ink)]"><p className="font-bold">{new Date(`${eventKey(event.event_date)}T00:00:00`).toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}</p><p className="text-sm font-bold text-slate-900">{new Date(`${eventKey(event.event_date)}T00:00:00`).getDate()}</p></div><div className="min-w-0"><p className="truncate text-xs font-bold">{event.title}</p><p className="mt-0.5 text-[10px] text-slate-500">{event.event_time || 'All day'} · {event.type}</p></div></button>) : <p className="text-xs text-slate-500">No upcoming items.</p>}</div></section></aside>
    </div>
    {showCreate && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"><form onSubmit={createEvent} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900"><div className="flex items-center justify-between"><div><h2 className="font-bold">Create calendar event</h2><p className="mt-1 text-xs text-slate-500">This is shared with the whole company.</p></div><button type="button" onClick={() => setShowCreate(false)}><X className="h-4 w-4" /></button></div><div className="mt-5 space-y-3"><input required value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="Event title" className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm dark:border-slate-700" /><div className="grid grid-cols-2 gap-3"><input required type="date" value={form.eventDate} onChange={event => setForm({ ...form, eventDate: event.target.value })} className="rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm dark:border-slate-700" /><input type="time" value={form.eventTime} onChange={event => setForm({ ...form, eventTime: event.target.value })} className="rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm dark:border-slate-700" /></div><select value={form.type} onChange={event => setForm({ ...form, type: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm dark:border-slate-700"><option>Team event</option><option>Company event</option><option>Holiday</option></select></div><button className="mt-5 w-full rounded-xl bg-[var(--accent)] px-3 py-2.5 text-sm font-semibold text-white">Create event</button></form></div>}
  </div>;
}

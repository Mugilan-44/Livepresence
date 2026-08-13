import React, { useEffect, useState } from 'react';
import { Palette } from 'lucide-react';
import { getApiUrl } from '../../config/api';

const accents = [
  { id: 'aubergine', name: 'Aubergine' }, { id: 'clementine', name: 'Clementine' },
  { id: 'jade', name: 'Jade' }, { id: 'raspberry', name: 'Raspberry' },
  { id: 'graphite', name: 'Graphite' }, { id: 'multicolor', name: 'Multicolour' }
];

function Toggle({ checked, onChange, label, detail }) {
  return <label className="flex items-center justify-between gap-5 rounded-xl border border-slate-200 p-4 dark:border-slate-700"><span><span className="block text-sm font-semibold">{label}</span><span className="mt-1 block text-xs text-slate-500">{detail}</span></span><button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-[var(--accent)]' : 'bg-slate-300 dark:bg-slate-700'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${checked ? 'left-6' : 'left-1'}`} /></button></label>;
}

export default function PersonalSettings({ activeUser, onPreferencesChange }) {
  const [preferences, setPreferences] = useState({ theme: 'paper', accent: 'aubergine', density: 'comfortable', quietHours: '', pushEnabled: false });
  const [permission, setPermission] = useState(() => window.Notification?.permission || 'unsupported');

  useEffect(() => { fetch(getApiUrl(`/api/collaboration/preferences/${activeUser.id}`)).then(r => r.json()).then(data => {
    const browserCanNotify = !window.Notification || window.Notification.permission === 'granted';
    const next = { theme: ['paper', 'dark'].includes(data.theme) ? data.theme : 'paper', accent: accents.some(a => a.id === data.accent) ? data.accent : 'aubergine', density: data.density || 'comfortable', quietHours: data.quiet_hours || '', pushEnabled: Number(data.push_enabled) === 1 && browserCanNotify };
    setPreferences(next); localStorage.setItem('prolync_push_enabled', String(next.pushEnabled));
  }).catch(() => {}); }, [activeUser.id]);

  const apply = async (next) => {
    setPreferences(next); onPreferencesChange?.(next); localStorage.setItem('prolync_push_enabled', String(next.pushEnabled));
    await fetch(getApiUrl(`/api/collaboration/preferences/${activeUser.id}`), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) }).catch(() => {});
  };
  const changePush = async (pushEnabled) => {
    let nextPermission = permission;
    if (pushEnabled && window.Notification && permission !== 'granted') nextPermission = await window.Notification.requestPermission();
    setPermission(nextPermission);
    apply({ ...preferences, pushEnabled: Boolean(pushEnabled && (!window.Notification || nextPermission === 'granted')) });
  };

  return <div className="mx-auto max-w-4xl space-y-5"><section className="glass-card p-6"><div className="flex items-center gap-3"><div className="rounded-xl bg-[var(--accent-soft)] p-3 text-[var(--accent)]"><Palette className="h-5 w-5" /></div><div><h2 className="text-lg font-bold">Appearance</h2><p className="text-sm text-slate-500">Changes apply instantly and follow your selected accent.</p></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><Toggle checked={preferences.theme === 'paper'} onChange={() => apply({ ...preferences, theme: 'paper' })} label="Light" detail="Clean white workspace." /><Toggle checked={preferences.theme === 'dark'} onChange={() => apply({ ...preferences, theme: 'dark' })} label="Dark" detail="Low-light black workspace." /></div><label className="mt-5 block text-sm font-semibold">Accent colour<select value={preferences.accent} onChange={event => apply({ ...preferences, accent: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-200 bg-transparent p-2.5 text-sm dark:border-slate-700">{accents.map(accent => <option key={accent.id} value={accent.id}>{accent.name}</option>)}</select></label><div className="mt-5"><Toggle checked={preferences.pushEnabled} onChange={changePush} label="Push notifications" detail={preferences.pushEnabled ? 'On for messages, announcements and approvals.' : 'Off — the platform will not show desktop alerts.'} /></div></section><p className="px-1 text-sm text-slate-500">Need a password reset? Contact the founder. The founder can securely set a new password for your account from People.</p></div>;
}

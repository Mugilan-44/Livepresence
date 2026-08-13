import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, Mail, Plus, Timer, XCircle } from 'lucide-react';
import ApplyLeaveModal from './ApplyLeaveModal';
import { getApiUrl } from '../../config/api';

const statusStyle = (status) => status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200';
export default function EmployeeLeaveView({ activeUser, onRefreshLeaves }) {
  const [requests, setRequests] = useState([]);
  const [timePermissions, setTimePermissions] = useState([]);
  const [showApply, setShowApply] = useState(false);
  const [showTimePermission, setShowTimePermission] = useState(false);
  const [activeSection, setActiveSection] = useState('leave');
  const [mailDraft, setMailDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = async () => {
    if (!activeUser?.id) return;
    try {
      setLoading(true); setError('');
      const query = `requesterId=${encodeURIComponent(activeUser.id)}&requesterRole=${encodeURIComponent(activeUser.role || '')}`;
      const [requestResponse, permissionResponse] = await Promise.all([
        fetch(getApiUrl(`/api/leaves/requests?${query}`)),
        fetch(getApiUrl(`/api/leaves/time-permissions?${query}`))
      ]);
      const [requestData, permissionData] = await Promise.all([
        requestResponse.json().catch(() => []), permissionResponse.json().catch(() => [])
      ]);
      if (requestResponse.ok && Array.isArray(requestData)) setRequests(requestData);
      if (permissionResponse.ok && Array.isArray(permissionData)) setTimePermissions(permissionData);
    } catch { setError('Could not load leave management right now.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, [activeUser?.id]);

  const submitLeave = async (data) => {
    const response = await fetch(getApiUrl('/api/leaves/requests'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, userId: activeUser.id }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Could not submit leave request.');
    setMailDraft(result.leave); await refresh(); onRefreshLeaves?.();
  };
  const submitTimePermission = async (data) => {
    const response = await fetch(getApiUrl('/api/leaves/time-permissions'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, userId: activeUser.id }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Could not request time permission.');
    await refresh(); onRefreshLeaves?.();
  };
  const orderedRequests = useMemo(() => [...requests].sort((a, b) => String(b.start_date).localeCompare(String(a.start_date))), [requests]);

  return <div className="space-y-5">
    {mailDraft && <section className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-emerald-900">Leave request sent for founder approval</p><p className="mt-1 text-xs text-emerald-800">The platform has notified Careers. You can also open Hostinger Mail in the browser.</p></div><a href="https://mail.hostinger.com/" target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white"><Mail className="h-3.5 w-3.5" />Open Hostinger Mail</a></section>}
    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900"><button type="button" onClick={() => setActiveSection('leave')} className={`rounded-lg px-4 py-2 text-xs font-bold transition ${activeSection === 'leave' ? 'bg-[var(--accent)] text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Leave</button><button type="button" onClick={() => setActiveSection('permission')} className={`rounded-lg px-4 py-2 text-xs font-bold transition ${activeSection === 'permission' ? 'bg-[var(--accent)] text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Time permission</button></div>
    {activeSection === 'leave' && <><section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-[#111827]"><div><h2 className="text-lg font-bold">Leave requests</h2><p className="mt-1 text-sm text-slate-500">Submit a request and follow its approval status here.</p></div><button onClick={() => setShowApply(true)} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Apply leave</button></section>
    {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#111827]"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800"><div><h3 className="text-sm font-bold">Leave history</h3><p className="mt-1 text-xs text-slate-500">What you took, when you took it, and the reason provided.</p></div><span className="text-xs font-semibold text-slate-500">{requests.length} record{requests.length === 1 ? '' : 's'}</span></div>{loading ? <p className="px-5 py-10 text-center text-sm text-slate-500">Loading leave history…</p> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-900 dark:text-slate-300"><tr><th className="px-5 py-3">Leave</th><th className="px-5 py-3">When</th><th className="px-5 py-3">Reason</th><th className="px-5 py-3">Reviewed by</th><th className="px-5 py-3">Status</th></tr></thead><tbody>{orderedRequests.map((request) => <tr key={request.id} className="border-t border-slate-200 align-top dark:border-slate-800"><td className="px-5 py-3 font-semibold">{request.leave_type}</td><td className="px-5 py-3 text-xs font-mono text-slate-600 dark:text-slate-300">{request.start_date} → {request.end_date}<br /><span className="font-sans text-slate-500">{request.days_count} day{Number(request.days_count) === 1 ? '' : 's'}</span></td><td className="max-w-md whitespace-pre-wrap break-words px-5 py-3 text-slate-600 dark:text-slate-300">{request.reason || 'No reason recorded'}</td><td className="px-5 py-3 text-xs text-slate-500">{request.reviewed_by || 'Awaiting review'}</td><td className="px-5 py-3"><StatusBadge status={request.status} /></td></tr>)}{!orderedRequests.length && <tr><td colSpan="5" className="px-5 py-10 text-center text-sm text-slate-500">No leave requests yet.</td></tr>}</tbody></table></div>}</section></>}
    {activeSection === 'permission' && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#111827]"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><Timer className="h-5 w-5 text-[var(--accent)]" /><h3 className="text-sm font-bold">Time permission</h3></div><p className="mt-1 text-xs text-slate-500">Request permission for a late arrival or early exit. The founder approves or rejects it.</p></div><button onClick={() => setShowTimePermission(true)} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><Plus className="h-3.5 w-3.5" />Request permission</button></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead className="border-y border-slate-200 bg-slate-50 uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900"><tr><th className="px-3 py-2.5">Date</th><th className="px-3 py-2.5">Permission</th><th className="px-3 py-2.5">Time</th><th className="px-3 py-2.5">Reason</th><th className="px-3 py-2.5">Status</th></tr></thead><tbody>{timePermissions.map(item => <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800"><td className="px-3 py-2.5 font-mono">{item.permission_date}</td><td className="px-3 py-2.5 font-semibold">{item.permission_type}</td><td className="px-3 py-2.5 font-mono">{item.requested_time}</td><td className="max-w-sm whitespace-pre-wrap break-words px-3 py-2.5 text-slate-600 dark:text-slate-300">{item.reason}</td><td className="px-3 py-2.5"><StatusBadge status={item.status} /></td></tr>)}{!timePermissions.length && <tr><td colSpan="5" className="px-3 py-7 text-center text-slate-500">No time-permission requests yet.</td></tr>}</tbody></table></div></section>}
    {showApply && <ApplyLeaveModal onClose={() => setShowApply(false)} onSubmitLeave={submitLeave} activeUser={activeUser} />}
    {showTimePermission && <TimePermissionModal onClose={() => setShowTimePermission(false)} onSubmit={submitTimePermission} />}
  </div>;
}

function StatusBadge({ status }) { return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusStyle(status)}`}>{status === 'Approved' ? <CheckCircle2 className="h-3 w-3" /> : status === 'Rejected' ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}{status}</span>; }
function TimePermissionModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({ permissionDate: new Date().toISOString().slice(0, 10), permissionType: 'Late arrival', requestedTime: '', reason: '' });
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const submit = async (event) => { event.preventDefault(); if (!form.requestedTime || !form.reason.trim()) return setError('Choose the expected time and give a reason.'); setSaving(true); setError(''); try { await onSubmit(form); onClose(); } catch (err) { setError(err.message || 'Could not request permission.'); } finally { setSaving(false); } };
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4"><form onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold">Request time permission</h2><p className="mt-1 text-xs text-slate-500">For a late arrival or early exit. It stays pending until the founder reviews it.</p></div><button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">×</button></div>{error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>}<div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold">Date<input required type="date" value={form.permissionDate} onChange={e => setForm({ ...form, permissionDate: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950" /></label><label className="text-xs font-bold">Permission<select value={form.permissionType} onChange={e => setForm({ ...form, permissionType: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"><option>Late arrival</option><option>Early exit</option></select></label><label className="text-xs font-bold sm:col-span-2">Expected {form.permissionType === 'Late arrival' ? 'arrival' : 'exit'} time<input required type="time" value={form.requestedTime} onChange={e => setForm({ ...form, requestedTime: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950" /></label><label className="text-xs font-bold sm:col-span-2">Reason<textarea required rows="6" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="For example: traffic delay, headache, or a personal appointment…" className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950" /></label></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">Cancel</button><button disabled={saving} className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Sending…' : 'Send for approval'}</button></div></form></div>;
}

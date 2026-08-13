import React, { useState } from 'react';
import { Save, X } from 'lucide-react';

const roleOptions = [
  ['FULL_TIME', 'Full access'],
  ['INTERN', 'Employee access · intern'],
  ['MANAGER', 'Employee access · manager'],
  ['HR', 'Employee access · HR']
];

export default function EditEmployeeModal({ employee, onClose, onSave }) {
  const [form, setForm] = useState({
    name: employee?.name || '', email: employee?.email || '', role: employee?.role || 'FULL_TIME',
    title: employee?.title || '', department: employee?.department || 'Product', branch: employee?.branch || 'Chennai',
    mobile: employee?.mobile || employee?.phone || '', salary_base: employee?.salary_base || '',
    pay_type: employee?.pay_type || 'PAID', aadhaar_number: employee?.aadhaar_number || '', pan_number: employee?.pan_number || '',
    newPassword: '', confirmPassword: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const nextPassword = form.newPassword.trim();
    if (nextPassword || form.confirmPassword) {
      if (nextPassword.length < 8) return setError('Use at least 8 characters for the new password.');
      if (nextPassword !== form.confirmPassword) return setError('The new password and confirmation do not match.');
    }
    setSaving(true);
    try {
      const { confirmPassword, newPassword, ...profile } = form;
      await onSave({ ...profile, ...(nextPassword ? { newPassword: nextPassword } : {}), salary_base: form.pay_type === 'UNPAID' ? 0 : Number(form.salary_base || 0) });
      onClose();
    } catch (err) {
      setError(err.message || 'Employee profile could not be updated.');
    } finally { setSaving(false); }
  };

  const fieldClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]';
  return <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/40 p-3 sm:p-6">
    <form onSubmit={submit} className="mx-auto my-4 w-full max-w-3xl rounded-3xl bg-white shadow-2xl sm:my-10">
      <div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-7"><div><p className="page-eyebrow">Founder controls</p><h2 className="mt-1 text-xl font-bold text-slate-950">Edit employee profile</h2><p className="mt-1 text-sm text-slate-500">Update employment details, access and identity records.</p></div><button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
      <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-7">
        <label className="text-sm font-semibold text-slate-700">Full name<input required name="name" value={form.name} onChange={update} className={fieldClass} /></label>
        <label className="text-sm font-semibold text-slate-700">Work email<input required type="email" name="email" value={form.email} onChange={update} className={fieldClass} /></label>
        <label className="text-sm font-semibold text-slate-700">Access role<select name="role" value={form.role} onChange={update} className={fieldClass}>{roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-sm font-semibold text-slate-700">Company role<input name="title" value={form.title} onChange={update} placeholder="Developer, Editor…" className={fieldClass} /></label>
        <label className="text-sm font-semibold text-slate-700">Department<select name="department" value={form.department} onChange={update} className={fieldClass}><option>Product</option><option>Service</option><option>Product and Service</option></select></label>
        <label className="text-sm font-semibold text-slate-700">Branch<input name="branch" value={form.branch} onChange={update} className={fieldClass} /></label>
        <label className="text-sm font-semibold text-slate-700">Mobile number<input name="mobile" inputMode="numeric" value={form.mobile} onChange={update} className={fieldClass} /></label>
        <div className="grid grid-cols-[1fr_140px] gap-3"><label className="text-sm font-semibold text-slate-700">Monthly salary (₹)<input name="salary_base" type="number" min="0" disabled={form.pay_type === 'UNPAID'} value={form.salary_base} onChange={update} className={`${fieldClass} disabled:cursor-not-allowed disabled:bg-slate-100`} /></label><label className="text-sm font-semibold text-slate-700">Pay type<select name="pay_type" value={form.pay_type} onChange={update} className={fieldClass}><option value="PAID">Paid</option><option value="UNPAID">Unpaid</option></select></label></div>
        <label className="text-sm font-semibold text-slate-700">Aadhaar number<input name="aadhaar_number" value={form.aadhaar_number} onChange={update} className={fieldClass} /></label>
        <label className="text-sm font-semibold text-slate-700">PAN number<input name="pan_number" value={form.pan_number} onChange={update} className={fieldClass} /></label>
        <div className="sm:col-span-2 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <h3 className="text-sm font-bold text-slate-900">Reset password <span className="font-medium text-slate-500">(optional)</span></h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">Use this only when the employee asks for help signing in. Share the new password privately.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">New password<input type="password" autoComplete="new-password" name="newPassword" value={form.newPassword} onChange={update} className={fieldClass} /></label>
            <label className="text-sm font-semibold text-slate-700">Confirm new password<input type="password" autoComplete="new-password" name="confirmPassword" value={form.confirmPassword} onChange={update} className={fieldClass} /></label>
          </div>
        </div>
      </div>
      {error && <p className="mx-5 mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 sm:mx-7">{error}</p>}
      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-5 py-5 sm:flex-row sm:justify-end sm:px-7"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700">Cancel</button><button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save changes'}</button></div>
    </form>
  </div>;
}

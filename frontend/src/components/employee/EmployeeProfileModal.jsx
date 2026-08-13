import React from 'react';
import { Building2, CalendarDays, CheckCircle2, CreditCard, Edit3, HeartPulse, Mail, MapPin, Phone, ShieldCheck, Trash2, UserRound, X } from 'lucide-react';
import { calculateDynamicProfileScore } from '../../config/api';

function DetailCard({ title, icon: Icon, children, className = '' }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}><div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3"><span className="rounded-lg bg-[var(--accent-soft)] p-2 text-[var(--accent)]"><Icon className="h-4 w-4" /></span><h3 className="text-sm font-bold text-slate-900">{title}</h3></div><dl className="grid gap-3 text-sm">{children}</dl></section>;
}

function Detail({ label, value, mono = false }) {
  return <div><dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</dt><dd className={`mt-1 break-words font-medium text-slate-800 ${mono ? 'font-mono' : ''}`}>{value || 'Not provided'}</dd></div>;
}

export default function EmployeeProfileModal({ employee, onClose, activeUser, onEditEmployee, onDeleteEmployee, documents = [] }) {
  if (!employee) return null;
  const founderView = activeUser?.role === 'SUPER_ADMIN';
  const profileScore = calculateDynamicProfileScore(employee, documents);
  const salary = employee.pay_type === 'UNPAID' ? 'Unpaid internship' : employee.salary_base ? `₹${Number(employee.salary_base).toLocaleString('en-IN')} / month` : 'Not provided';

  return <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-100/95 p-3 sm:p-6">
    <div className="mx-auto min-h-full w-full max-w-7xl">
      <div className="sticky top-3 z-10 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm sm:top-6"><div className="flex items-center gap-3"><span className="rounded-xl bg-[var(--accent-soft)] p-2.5 text-[var(--accent)]"><UserRound className="h-5 w-5" /></span><div><p className="text-sm font-bold text-slate-900">Employee profile</p><p className="text-xs text-slate-500">Founder view · complete employee record</p></div></div><button onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><X className="h-5 w-5" /></button></div>

      <main className="my-4 space-y-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:my-6 sm:p-7">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between"><div className="flex min-w-0 items-center gap-4"><img src={employee.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(employee.name)} alt="" className="h-16 w-16 shrink-0 rounded-2xl border border-slate-200 object-cover sm:h-20 sm:w-20" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="break-words text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{employee.name}</h1><span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-bold text-[var(--accent-ink)]">{employee.employee_id}</span></div><p className="mt-1 text-sm text-slate-600">{employee.title || employee.designation || 'Team member'} · {employee.department || 'Department not assigned'}</p><p className="mt-2 text-xs font-semibold text-emerald-600">{employee.employment_status || 'Active'}</p></div></div><div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 md:w-auto md:min-w-[225px]"><div className="flex items-center justify-between text-xs"><span className="font-semibold text-slate-600">Profile completion</span><span className="font-bold text-[var(--accent)]">{profileScore}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${profileScore}%` }} /></div><p className="mt-2 text-[11px] text-slate-500">Identity and required documents can be completed from My profile.</p></div></div></section>

        <section className="grid gap-5 lg:grid-cols-3"><DetailCard title="Personal information" icon={UserRound}><Detail label="Gender" value={employee.gender} /><Detail label="Date of birth" value={employee.dob ? String(employee.dob).slice(0, 10) : ''} /><Detail label="Blood group" value={employee.blood_group} /></DetailCard><DetailCard title="Contact information" icon={Phone}><Detail label="Work email" value={employee.email} /><Detail label="Mobile" value={employee.mobile || employee.phone} mono /><Detail label="Emergency contact" value={employee.emergency_contact} /></DetailCard><DetailCard title="Employment details" icon={Building2}><Detail label="Access role" value={employee.role?.replace('_', ' ')} /><Detail label="Company role" value={employee.title || employee.designation} /><Detail label="Branch" value={employee.branch || employee.office_location} /><Detail label="Joining date" value={employee.joining_date ? String(employee.joining_date).slice(0, 10) : ''} /></DetailCard></section>

        <section className="grid gap-5 lg:grid-cols-2"><DetailCard title="Financial and bank details" icon={CreditCard}><Detail label="Salary package" value={salary} /><Detail label="Bank name" value={employee.bank_name} /><Detail label="Account number" value={employee.bank_account} mono /><Detail label="IFSC / SWIFT" value={employee.ifsc_swift} mono /></DetailCard><DetailCard title="Identity and compliance" icon={ShieldCheck}><Detail label="Aadhaar number" value={founderView ? employee.aadhaar_number : 'Private'} mono /><Detail label="PAN number" value={founderView ? employee.pan_number : 'Private'} mono /><Detail label="Verification" value={employee.verified_employee ? 'Verified' : 'Pending verification'} /></DetailCard></section>

        <DetailCard title="Residential address" icon={MapPin}><Detail label="Address" value={employee.address} /></DetailCard>
        <div className="flex flex-wrap justify-end gap-3"><button onClick={onClose} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Close</button>{founderView && onEditEmployee && <button onClick={() => { onClose(); onEditEmployee(employee); }} className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white"><Edit3 className="h-4 w-4" />Edit employee</button>}{founderView && onDeleteEmployee && employee.id !== activeUser?.id && <button onClick={() => onDeleteEmployee(employee)} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700"><Trash2 className="h-4 w-4" />Delete profile</button>}</div>
      </main>
    </div>
  </div>;
}

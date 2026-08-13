import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Clock3, Pencil, Trash2, UserPlus, Users } from 'lucide-react';
import AddEmployeeModal from './AddEmployeeModal';

const rupees = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

function PersonRow({ person, onOpenTimeline, onOpenProfile, canViewPackages, canManagePeople, onEdit, onDelete, isCurrentUser }) {
  const isIntern = person.role === 'INTERN';
  const packageLabel = person.pay_type === 'UNPAID' || (isIntern && !person.salary_base)
    ? 'Unpaid internship'
    : isIntern
      ? `${rupees(person.salary_base)} / month`
      : `${(Number(person.salary_base || 0) * 12 / 100000).toFixed(1)} LPA`;
  return <tr className="border-b border-slate-200/80 last:border-0 dark:border-slate-800">
    <td className="px-4 py-3"><div className="font-semibold text-slate-900 dark:text-white">{person.name}</div><div className="mt-0.5 text-xs text-slate-500">{person.title || 'Team member'}</div></td>
    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{person.department || '—'}</td>
    {canViewPackages && <td className="px-4 py-3"><span className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">{packageLabel}</span></td>}
    <td className="px-4 py-3 text-right"><div className="inline-flex items-center gap-3"><button onClick={() => onOpenProfile?.(person)} className="text-xs font-semibold text-[var(--accent)]">Profile</button><button onClick={() => onOpenTimeline?.(person)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)]"><Clock3 className="h-3.5 w-3.5" />Timeline<ArrowUpRight className="h-3.5 w-3.5" /></button>{canManagePeople && <button onClick={() => onEdit?.(person)} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700"><Pencil className="h-3.5 w-3.5" />Edit</button>}{canManagePeople && !isCurrentUser && <button onClick={() => onDelete?.(person)} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600"><Trash2 className="h-3.5 w-3.5" />Delete</button>}</div></td>
  </tr>;
}

function PersonCard({ person, onOpenTimeline, onOpenProfile, canViewPackages, canManagePeople, onEdit, onDelete, isCurrentUser }) {
  const isIntern = person.role === 'INTERN';
  const packageLabel = person.pay_type === 'UNPAID' || (isIntern && !person.salary_base)
    ? 'Unpaid internship'
    : isIntern ? `${rupees(person.salary_base)} / month` : `${(Number(person.salary_base || 0) * 12 / 100000).toFixed(1)} LPA`;
  return <article className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><h4 className="truncate font-bold text-slate-900 dark:text-white">{person.name}</h4><p className="mt-1 text-sm text-slate-500">{person.title || 'Team member'}</p></div>
      {canViewPackages && <span className="shrink-0 rounded-full border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">{packageLabel}</span>}
    </div>
    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{person.department || 'Department not set'}</p>
    <div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => onOpenProfile?.(person)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">Profile</button><button onClick={() => onOpenTimeline?.(person)} className="inline-flex items-center justify-center gap-1 rounded-lg bg-[var(--accent-soft)] px-3 py-2 text-xs font-bold text-[var(--accent)]">Timeline <ArrowUpRight className="h-3.5 w-3.5" /></button>{canManagePeople && <button onClick={() => onEdit?.(person)} className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"><Pencil className="h-3.5 w-3.5" />Edit</button>}{canManagePeople && !isCurrentUser && <button onClick={() => onDelete?.(person)} className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600"><Trash2 className="h-3.5 w-3.5" />Delete</button>}</div>
  </article>;
}

export default function PeopleOverview({ users = [], onOpenTimeline, onOpenProfile, onAddEmployee, onEditEmployee, onDeleteEmployee, activeUser }) {
  const [activeList, setActiveList] = useState('employees');
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const { employees, interns } = useMemo(() => ({ employees: users.filter(person => person.role !== 'INTERN'), interns: users.filter(person => person.role === 'INTERN') }), [users]);
  const list = activeList === 'employees' ? employees : interns;
  const canViewPackages = activeUser?.role === 'SUPER_ADMIN';
  const canManagePeople = activeUser?.role === 'SUPER_ADMIN';
  return <div className="mx-auto max-w-6xl space-y-5">
    <section className="glass-card flex flex-col gap-5 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-6"><div><p className="page-eyebrow">People</p><h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">Team and progress</h2><p className="mt-2 max-w-xl text-sm text-slate-500">A practical people view with employee and intern lists, plus their work timeline.</p></div><div className="flex w-full items-end gap-3 sm:w-auto"><div className="flex-1 rounded-xl border border-slate-200 px-4 py-3 sm:flex-none dark:border-slate-700"><p className="text-xs text-slate-500">Active people</p><p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{users.length}</p></div>{activeUser?.role === 'SUPER_ADMIN' && <button onClick={() => setShowAddEmployee(true)} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-bold text-white sm:flex-none"><UserPlus className="h-4 w-4" />Add people</button>}</div></section>
    <section className="glass-card overflow-hidden p-0"><div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 dark:border-slate-800"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-[var(--accent)]" /><h3 className="font-bold">People directory</h3></div><div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-900"><button onClick={() => setActiveList('employees')} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${activeList === 'employees' ? 'bg-white shadow-sm dark:bg-slate-800' : 'text-slate-500'}`}>Employees ({employees.length})</button><button onClick={() => setActiveList('interns')} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${activeList === 'interns' ? 'bg-white shadow-sm dark:bg-slate-800' : 'text-slate-500'}`}>Interns ({interns.length})</button></div></div><div className="space-y-3 p-3 sm:hidden">{list.map(person => <PersonCard key={person.id} person={person} onOpenTimeline={onOpenTimeline} onOpenProfile={onOpenProfile} canViewPackages={canViewPackages} canManagePeople={canManagePeople} onEdit={onEditEmployee} onDelete={onDeleteEmployee} isCurrentUser={person.id === activeUser?.id} />)}{!list.length && <p className="py-10 text-center text-sm text-slate-500">No {activeList} yet.</p>}</div><div className="hidden overflow-x-auto sm:block"><table className="w-full min-w-[680px] text-left"><thead><tr className="bg-slate-50 text-xs dark:bg-slate-900/50"><th className="px-4 py-3">Person</th><th className="px-4 py-3">Department</th>{canViewPackages && <th className="px-4 py-3">Package</th>}<th className="px-4 py-3 text-right">Activity</th></tr></thead><tbody>{list.map(person => <PersonRow key={person.id} person={person} onOpenTimeline={onOpenTimeline} onOpenProfile={onOpenProfile} canViewPackages={canViewPackages} canManagePeople={canManagePeople} onEdit={onEditEmployee} onDelete={onDeleteEmployee} isCurrentUser={person.id === activeUser?.id} />)}{!list.length && <tr><td colSpan={canViewPackages ? 4 : 3} className="px-4 py-12 text-center text-sm text-slate-500">No {activeList} yet.</td></tr>}</tbody></table></div></section>
    <p className="px-1 text-xs text-slate-500">Salary and package information is available only to the founder. Timeline opens attendance, leave, regular hours, extra hours and off-day work records.</p>
    {showAddEmployee && <AddEmployeeModal activeUser={activeUser} onClose={() => setShowAddEmployee(false)} onAddEmployee={async data => { await onAddEmployee(data); setShowAddEmployee(false); }} />}
  </div>;
}

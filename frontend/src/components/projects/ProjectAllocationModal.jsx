import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Users, Briefcase, Calendar, Percent, CheckCircle2 } from 'lucide-react';

export default function ProjectAllocationModal({ isOpen, onClose, activeUser, employees = [], projects = [], onAllocationUpdated }) {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(employees[0]?.id || '');
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [roleInProject, setRoleInProject] = useState('Senior Full-Stack Consultant');
  const [allocationPct, setAllocationPct] = useState(50);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('2026-12-31');

  useEffect(() => {
    if (isOpen) {
      fetchAllocations();
    }
  }, [isOpen]);

  const fetchAllocations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/project-allocations');
      const data = await res.json();
      setAllocations(data);
    } catch (e) {
      console.error("Failed to fetch project allocations", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAllocation = async (e) => {
    e.preventDefault();
    if (!selectedUserId || !selectedProjectId) return;

    try {
      const res = await fetch('/api/project-allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          projectId: selectedProjectId,
          roleInProject,
          allocationPct,
          startDate,
          endDate,
          userRole: activeUser?.role,
          actorName: activeUser?.name
        })
      });

      if (res.ok) {
        fetchAllocations();
        if (onAllocationUpdated) onAllocationUpdated();
      }
    } catch (err) {
      console.error("Failed to create project allocation", err);
    }
  };

  const handleToggleStatus = async (alloc) => {
    const nextStatus = alloc.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await fetch(`/api/project-allocations/${alloc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          userRole: activeUser?.role,
          actorName: activeUser?.name
        })
      });
      if (res.ok) {
        fetchAllocations();
        if (onAllocationUpdated) onAllocationUpdated();
      }
    } catch (err) {
      console.error("Failed to update allocation status", err);
    }
  };

  const handleRemoveAllocation = async (id) => {
    if (!confirm('Are you sure you want to remove this project allocation?')) return;
    try {
      const res = await fetch(`/api/project-allocations/${id}?userRole=${activeUser?.role}&actorName=${encodeURIComponent(activeUser?.name || '')}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchAllocations();
        if (onAllocationUpdated) onAllocationUpdated();
      }
    } catch (err) {
      console.error("Failed to delete allocation", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Multiple Project Allocation Manager</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Assign employees to multiple projects with workload percentages & timeline controls</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* New Allocation Form */}
          <form onSubmit={handleCreateAllocation} className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-4">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-cyan-500" />
              Assign Employee to Project
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Select Employee</label>
                <select
                  value={selectedUserId}
                  onChange={e => setSelectedUserId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Select Target Project</label>
                <select
                  value={selectedProjectId}
                  onChange={e => setSelectedProjectId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Role in Project</label>
                <input
                  type="text"
                  required
                  value={roleInProject}
                  onChange={e => setRoleInProject(e.target.value)}
                  placeholder="e.g. Lead Developer"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Workload Allocation %</label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={allocationPct}
                  onChange={e => setAllocationPct(parseInt(e.target.value, 10))}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Allocation Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Allocation End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Allocate Project
              </button>
            </div>
          </form>

          {/* Active & Historical Allocations List */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active & Historical Project Allocations</h4>

            <div className="space-y-2">
              {allocations.map(alloc => (
                <div
                  key={alloc.id}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                    alloc.status === 'Active'
                      ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80'
                      : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{alloc.user_name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold">
                        {alloc.project_title}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        alloc.status === 'Active'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      }`}>
                        {alloc.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>Role: <strong>{alloc.role_in_project}</strong></span>
                      <span>Allocation: <strong className="text-cyan-500">{alloc.allocation_pct}%</strong></span>
                      <span>Duration: {alloc.start_date} to {alloc.end_date}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleToggleStatus(alloc)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                        alloc.status === 'Active'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {alloc.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>

                    <button
                      onClick={() => handleRemoveAllocation(alloc.id)}
                      className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 transition"
                      title="Remove Allocation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

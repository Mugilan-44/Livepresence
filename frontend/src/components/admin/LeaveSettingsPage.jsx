import React, { useState, useEffect } from 'react';
import {
  Sliders, Plus, Edit2, Trash2, CheckCircle2, XCircle, MapPin, Building,
  Shield, RefreshCw, Calendar, FileText, AlertTriangle, Layers, UserCheck, Check, Clock, ChevronRight
} from 'lucide-react';
import AddLocationModal from './AddLocationModal';

export default function LeaveSettingsPage({ activeUser, employees = [] }) {
  const [activeTab, setActiveTab] = useState('types');
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [workflowConfig, setWorkflowConfig] = useState({
    approval_pipeline: ["Reporting Manager", "HR Admin"],
    auto_approval_enabled: false,
    require_attachment_above_days: 3,
    max_consecutive_leave_days: 10,
    minimum_notice_period_days: 2,
    allow_half_day: true,
    allow_quarter_day: false,
    sandwich_leave_rule: true,
    holiday_between_leaves_deducted: true
  });

  const [loading, setLoading] = useState(true);

  // Modals state
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);

  const [isLeaveTypeModalOpen, setIsLeaveTypeModalOpen] = useState(false);
  const [editingLeaveType, setEditingLeaveType] = useState(null);
  const [leaveTypeForm, setLeaveTypeForm] = useState({
    name: '',
    code: '',
    description: '',
    total_days_per_year: 12,
    carry_forward: true,
    max_carry_forward: 5,
    requires_approval: true,
    requires_medical: false,
    paid: true,
    active: true
  });

  // Employee Override state
  const [selectedUserForOverride, setSelectedUserForOverride] = useState(employees[0]?.id || '');
  const [overrideBal, setOverrideBal] = useState({ casual: 12, sick: 10, earned: 15, comp_off: 2 });

  // Reset Engine State
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [resetTarget, setResetTarget] = useState('ALL');

  useEffect(() => {
    fetchSettingsData();
  }, []);

  const fetchSettingsData = async () => {
    try {
      setLoading(true);
      const [ltRes, locRes, wfRes] = await Promise.all([
        fetch('/api/admin/leave-types').then(r => r.json()),
        fetch('/api/locations').then(r => r.json()),
        fetch('/api/admin/leave-workflow').then(r => r.json())
      ]);
      if (Array.isArray(ltRes)) setLeaveTypes(ltRes);
      if (Array.isArray(locRes)) setLocations(locRes);
      if (wfRes.approval_pipeline) setWorkflowConfig(wfRes);
    } catch (e) {
      console.error("Failed to load leave settings data", e);
    } finally {
      setLoading(false);
    }
  };

  // --- Leave Types Handlers ---
  const handleSaveLeaveType = async (e) => {
    e.preventDefault();
    try {
      const url = editingLeaveType ? `/api/admin/leave-types/${editingLeaveType.id}` : '/api/admin/leave-types';
      const method = editingLeaveType ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...leaveTypeForm,
          userRole: activeUser?.role,
          actorName: activeUser?.name
        })
      });

      if (res.ok) {
        const data = await res.json();
        setLeaveTypes(data.leaveTypes);
        setIsLeaveTypeModalOpen(false);
        setEditingLeaveType(null);
      }
    } catch (err) {
      console.error("Failed to save leave type", err);
    }
  };

  const handleDeleteLeaveType = async (id) => {
    if (!confirm('Are you sure you want to delete this leave type?')) return;
    try {
      const res = await fetch(`/api/admin/leave-types/${id}?userRole=${activeUser?.role}&actorName=${encodeURIComponent(activeUser?.name || '')}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const data = await res.json();
        setLeaveTypes(data.leaveTypes);
      }
    } catch (err) {
      console.error("Failed to delete leave type", err);
    }
  };

  const handleToggleLeaveTypeActive = async (type) => {
    try {
      const res = await fetch(`/api/admin/leave-types/${type.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          active: !type.active,
          userRole: activeUser?.role,
          actorName: activeUser?.name
        })
      });
      if (res.ok) {
        const data = await res.json();
        setLeaveTypes(data.leaveTypes);
      }
    } catch (err) {
      console.error("Failed to toggle leave type status", err);
    }
  };

  // --- Workflow Config Handlers ---
  const handleSaveWorkflow = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/leave-workflow', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...workflowConfig,
          userRole: activeUser?.role,
          actorName: activeUser?.name
        })
      });
      if (res.ok) {
        alert('Leave Policy & Approval Workflow settings saved successfully!');
        fetchSettingsData();
      }
    } catch (err) {
      console.error("Failed to save workflow settings", err);
    }
  };

  // --- Employee Override Handler ---
  const handleSaveOverride = async (e) => {
    e.preventDefault();
    if (!selectedUserForOverride) return;

    try {
      const res = await fetch(`/api/admin/employees/${selectedUserForOverride}/leave-override`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...overrideBal,
          userRole: activeUser?.role,
          actorName: activeUser?.name
        })
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message);
      }
    } catch (err) {
      console.error("Failed to override leave balance", err);
    }
  };

  // --- Reset Engine Execution ---
  const handleExecuteReset = async () => {
    try {
      const res = await fetch('/api/admin/leave-balances/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserIds: resetTarget === 'SELECTED' ? [selectedUserForOverride] : null,
          userRole: activeUser?.role,
          actorName: activeUser?.name
        })
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        setShowResetConfirmModal(false);
      }
    } catch (err) {
      console.error("Failed to execute leave reset", err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-500" />
            Administration → Leave & Location Control Engine
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Zero-hardcoding enterprise configuration: Configure leave types, office locations, department policies, & approval workflows
          </p>
        </div>

        <button
          onClick={fetchSettingsData}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Sync Rules
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('types')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'types'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          1. Leave Types (CRUD)
        </button>

        <button
          onClick={() => setActiveTab('locations')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'locations'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <MapPin className="w-4 h-4" />
          2. Office Locations & Holidays
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'rules'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          3. Department & Role Rules
        </button>

        <button
          onClick={() => setActiveTab('workflow')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'workflow'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4" />
          4. Approval Workflow & Policy Rules
        </button>

        <button
          onClick={() => setActiveTab('override')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'override'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          5. Employee Overrides & Reset Engine
        </button>
      </div>

      {/* --- TAB 1: LEAVE TYPES CRUD --- */}
      {activeTab === 'types' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Enterprise Leave Types Table</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Configure annual day allowances, medical certificates, carry forward rules, and active flags</p>
            </div>
            <button
              onClick={() => {
                setEditingLeaveType(null);
                setLeaveTypeForm({ name: '', code: '', description: '', total_days_per_year: 12, carry_forward: true, max_carry_forward: 5, requires_approval: true, requires_medical: false, paid: true, active: true });
                setIsLeaveTypeModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition"
            >
              <Plus className="w-4 h-4" />
              Create New Leave Type
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Leave Name</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Annual Days</th>
                  <th className="py-3 px-4">Carry Forward</th>
                  <th className="py-3 px-4">Medical Certificate</th>
                  <th className="py-3 px-4">Paid / Unpaid</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {leaveTypes.map((lt) => (
                  <tr key={lt.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{lt.name}</div>
                      <div className="text-[10px] text-slate-400">{lt.description}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-cyan-600 dark:text-cyan-400">{lt.code}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">{lt.total_days_per_year} Days</td>
                    <td className="py-3 px-4">
                      {lt.carry_forward ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-semibold">
                          Yes (Max {lt.max_carry_forward})
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">No</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {lt.requires_medical ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 font-semibold">Required</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Optional</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                      {lt.paid !== false ? 'Paid' : 'Unpaid'}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleLeaveTypeActive(lt)}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition ${
                          lt.active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                        }`}
                      >
                        {lt.active ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingLeaveType(lt);
                            setLeaveTypeForm({ ...lt });
                            setIsLeaveTypeModalOpen(true);
                          }}
                          className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteLeaveType(lt.id)}
                          className="p-1 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 2: OFFICE LOCATIONS & HOLIDAYS --- */}
      {activeTab === 'locations' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Enterprise Office Locations & Geofences</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">Manage multi-city locations, branch codes, time zones, weekly off patterns, and geofence coordinates</p>
            </div>
            <button
              onClick={() => {
                setEditingLocation(null);
                setIsLocationModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition"
            >
              <Plus className="w-4 h-4" />
              Add Office Location
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {locations.map((loc) => (
              <div key={loc.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-500" />
                    {loc.name}
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold">
                    {loc.branch_code}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                  <div>City/State: <strong>{loc.city}, {loc.state}</strong></div>
                  <div>Timezone: <strong>{loc.time_zone}</strong></div>
                  <div>Weekly Off: <strong>{loc.weekly_off_pattern}</strong></div>
                  <div>GPS: <span className="font-mono text-[10px]">{loc.latitude}, {loc.longitude}</span></div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                  <button
                    onClick={() => {
                      setEditingLocation(loc);
                      setIsLocationModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium"
                  >
                    Edit Location
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB 3: DEPARTMENT & ROLE ALLOCATION RULES --- */}
      {activeTab === 'rules' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Department & Role Leave Allocation Rules</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Configure distinct leave quotas by department and employment status (Permanent, Probation, Intern)</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
              <div className="font-bold text-xs text-slate-900 dark:text-white">Engineering & Operations</div>
              <div className="text-[11px] text-slate-500">CL: 12 | SL: 10 | EL: 15 | Comp-Off: 5</div>
              <span className="text-[10px] text-cyan-500">Default IT Staff Policy</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
              <div className="font-bold text-xs text-slate-900 dark:text-white">Human Resources & Admin</div>
              <div className="text-[11px] text-slate-500">CL: 14 | SL: 12 | EL: 15 | Comp-Off: 3</div>
              <span className="text-[10px] text-cyan-500">HR Governance Policy</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
              <div className="font-bold text-xs text-slate-900 dark:text-white">Interns & Trainees</div>
              <div className="text-[11px] text-slate-500">CL: 6 | SL: 5 | EL: 0 | Comp-Off: 0</div>
              <span className="text-[10px] text-amber-500">Trainee Probation Policy</span>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 4: WORKFLOW & POLICY RULES --- */}
      {activeTab === 'workflow' && (
        <form onSubmit={handleSaveWorkflow} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Approval Workflow & Policy Governance Rules</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Configure multi-stage leave approvals, sandwich rules, notice periods, and medical attachment thresholds</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Require Medical Certificate Above (Days)</label>
              <input
                type="number"
                value={workflowConfig.require_attachment_above_days}
                onChange={e => setWorkflowConfig({ ...workflowConfig, require_attachment_above_days: parseInt(e.target.value, 10) })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Minimum Advance Notice Period (Days)</label>
              <input
                type="number"
                value={workflowConfig.minimum_notice_period_days}
                onChange={e => setWorkflowConfig({ ...workflowConfig, minimum_notice_period_days: parseInt(e.target.value, 10) })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="sandwichRule"
                checked={workflowConfig.sandwich_leave_rule}
                onChange={e => setWorkflowConfig({ ...workflowConfig, sandwich_leave_rule: e.target.checked })}
                className="rounded text-cyan-500"
              />
              <label htmlFor="sandwichRule" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Enforce Sandwich Leave Rule (Count weekend holidays between leave days)
              </label>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="allowHalfDay"
                checked={workflowConfig.allow_half_day}
                onChange={e => setWorkflowConfig({ ...workflowConfig, allow_half_day: e.target.checked })}
                className="rounded text-cyan-500"
              />
              <label htmlFor="allowHalfDay" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Allow Half Day Leave Submissions
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow transition"
            >
              Save Workflow Governance Rules
            </button>
          </div>
        </form>
      )}

      {/* --- TAB 5: OVERRIDES & RESET ENGINE --- */}
      {activeTab === 'override' && (
        <div className="space-y-6">
          
          {/* Employee Override Card */}
          <form onSubmit={handleSaveOverride} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Individual Employee Leave Quota Override</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Manually override specific leave day balances for an employee</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-1">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Select Employee</label>
                <select
                  value={selectedUserForOverride}
                  onChange={e => setSelectedUserForOverride(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                >
                  {employees.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Casual Leave (CL)</label>
                <input
                  type="number"
                  value={overrideBal.casual}
                  onChange={e => setOverrideBal({ ...overrideBal, casual: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Sick Leave (SL)</label>
                <input
                  type="number"
                  value={overrideBal.sick}
                  onChange={e => setOverrideBal({ ...overrideBal, sick: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Earned Leave (EL)</label>
                <input
                  type="number"
                  value={overrideBal.earned}
                  onChange={e => setOverrideBal({ ...overrideBal, earned: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Comp Off</label>
                <input
                  type="number"
                  value={overrideBal.comp_off}
                  onChange={e => setOverrideBal({ ...overrideBal, comp_off: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold shadow transition"
              >
                Apply Quota Override
              </button>
            </div>
          </form>

          {/* Reset Engine Card */}
          <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-3">
            <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Annual Leave Balance Reset Engine
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Execute annual leave quota reset for the new fiscal year (2026-2027). This will reset casual & sick leave balances back to default entitlements.
            </p>

            <button
              onClick={() => setShowResetConfirmModal(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow transition"
            >
              Execute Annual Leave Balance Reset
            </button>
          </div>

        </div>
      )}

      {/* Location Modal */}
      {isLocationModalOpen && (
        <AddLocationModal
          isOpen={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
          locationToEdit={editingLocation}
          activeUser={activeUser}
          onLocationSaved={fetchSettingsData}
        />
      )}

      {/* Leave Type Form Modal */}
      {isLeaveTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {editingLeaveType ? 'Edit Leave Type' : 'Create New Leave Type'}
            </h3>

            <form onSubmit={handleSaveLeaveType} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">Leave Name</label>
                <input
                  type="text"
                  required
                  value={leaveTypeForm.name}
                  onChange={e => setLeaveTypeForm({ ...leaveTypeForm, name: e.target.value })}
                  placeholder="e.g. Bereavement Leave"
                  className="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-1.5"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Short Code</label>
                <input
                  type="text"
                  required
                  value={leaveTypeForm.code}
                  onChange={e => setLeaveTypeForm({ ...leaveTypeForm, code: e.target.value })}
                  placeholder="BEREAVEMENT"
                  className="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-1.5 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Total Days Per Year</label>
                <input
                  type="number"
                  required
                  value={leaveTypeForm.total_days_per_year}
                  onChange={e => setLeaveTypeForm({ ...leaveTypeForm, total_days_per_year: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-1.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsLeaveTypeModalOpen(false)} className="px-3 py-1.5 text-slate-500">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-cyan-600 text-white rounded-lg font-bold">Save Leave Type</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 text-xs">
            <h3 className="text-base font-bold text-rose-600">Confirm Annual Balance Reset</h3>
            <p className="text-slate-600 dark:text-slate-300">Are you sure you want to reset annual leave balances for all active employees? This action cannot be undone.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowResetConfirmModal(false)} className="px-3 py-1.5 text-slate-500">Cancel</button>
              <button onClick={handleExecuteReset} className="px-4 py-1.5 bg-rose-600 text-white rounded-lg font-bold">Confirm Reset</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

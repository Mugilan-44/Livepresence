import React, { useState } from 'react';
import { X, Plus, Trash2, Shield, Layers, Calendar, Sliders, Save, Sparkles, Check } from 'lucide-react';

export default function CustomizationSettingsModal({ onClose, customizations, onSaveCustomizations, activeUser }) {
  const [activeTab, setActiveTab] = useState('leave_options');

  // Local editable state
  const [leaveTypes, setLeaveTypes] = useState(() => customizations?.leave_types || [
    { id: "casual", label: "Casual Leave", maxDays: 12, badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    { id: "sick", label: "Sick Leave", maxDays: 10, badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
    { id: "earned", label: "Privilege / Earned Leave", maxDays: 15, badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    { id: "wfh", label: "Work From Home Pass", maxDays: 30, badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
    { id: "special", label: "Special / Parental Leave", maxDays: 90, badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20" }
  ]);

  const [taskStatuses, setTaskStatuses] = useState(() => customizations?.task_statuses || [
    { id: "todo", label: "To Do", color: "bg-slate-500", textColor: "text-slate-400" },
    { id: "in_progress", label: "In Progress", color: "bg-blue-500", textColor: "text-blue-400" },
    { id: "code_review", label: "Code Review", color: "bg-purple-500", textColor: "text-purple-400" },
    { id: "testing", label: "Testing / QA", color: "bg-amber-500", textColor: "text-amber-400" },
    { id: "completed", label: "Completed", color: "bg-emerald-500", textColor: "text-emerald-400" },
    { id: "blocked", label: "Blocked / Escalated", color: "bg-rose-500", textColor: "text-rose-400" }
  ]);

  // Form input states
  const [newLeaveLabel, setNewLeaveLabel] = useState('');
  const [newLeaveMaxDays, setNewLeaveMaxDays] = useState(12);

  const [newTaskLabel, setNewTaskLabel] = useState('');
  const [newTaskColor, setNewTaskColor] = useState('bg-indigo-500');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Leave Handlers
  const handleAddLeaveType = (e) => {
    e.preventDefault();
    if (!newLeaveLabel.trim()) return;
    const id = `custom_leave_${Date.now()}`;
    const colors = [
      "bg-teal-500/10 text-teal-400 border-teal-500/20",
      "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20"
    ];
    const badgeColor = colors[Math.floor(Math.random() * colors.length)];

    setLeaveTypes([...leaveTypes, { id, label: newLeaveLabel.trim(), maxDays: parseInt(newLeaveMaxDays, 10) || 12, badgeColor }]);
    setNewLeaveLabel('');
    setNewLeaveMaxDays(12);
  };

  const handleDeleteLeaveType = (id) => {
    setLeaveTypes(leaveTypes.filter(l => l.id !== id));
  };

  const handleUpdateLeaveMaxDays = (id, newDays) => {
    setLeaveTypes(leaveTypes.map(l => l.id === id ? { ...l, maxDays: parseInt(newDays, 10) || 1 } : l));
  };

  // Task Status Handlers
  const handleAddTaskStatus = (e) => {
    e.preventDefault();
    if (!newTaskLabel.trim()) return;
    const id = `custom_status_${Date.now()}`;
    setTaskStatuses([...taskStatuses, {
      id,
      label: newTaskLabel.trim(),
      color: newTaskColor,
      textColor: newTaskColor.replace('bg-', 'text-')
    }]);
    setNewTaskLabel('');
  };

  const handleDeleteTaskStatus = (id) => {
    if (taskStatuses.length <= 2) {
      alert("At least 2 workflow statuses are required.");
      return;
    }
    setTaskStatuses(taskStatuses.filter(s => s.id !== id));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await onSaveCustomizations({
        leave_types: leaveTypes,
        task_statuses: taskStatuses,
        task_priorities: customizations?.task_priorities || ["Low", "Medium", "High", "Critical"]
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      alert("Failed to save customization options: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-md">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white font-sans">
                  SuperAdmin Customization Control Hub
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Live Controls
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Customize leave types, task statuses, and project workflow options in real-time for all portal users.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-4 border-b border-slate-800/60 flex items-center gap-4 bg-slate-900/80">
          <button
            onClick={() => setActiveTab('leave_options')}
            className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
              activeTab === 'leave_options'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Leave & WFH Types ({leaveTypes.length})
          </button>
          <button
            onClick={() => setActiveTab('task_options')}
            className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
              activeTab === 'task_options'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Task Statuses & Workflow Stages ({taskStatuses.length})
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {activeTab === 'leave_options' && (
            <div className="space-y-6">
              {/* Add New Leave Type Form */}
              <form onSubmit={handleAddLeaveType} className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-cyan-400" />
                  Add Custom Leave Type
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Leave Option Title</label>
                    <input
                      type="text"
                      placeholder="e.g., Sabbatical Leave / Bereavement"
                      value={newLeaveLabel}
                      onChange={(e) => setNewLeaveLabel(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Max Annual Days</label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={newLeaveMaxDays}
                      onChange={(e) => setNewLeaveMaxDays(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!newLeaveLabel.trim()}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition ml-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Leave Option
                </button>
              </form>

              {/* Leave Options List */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                  Active System Leave Types
                </div>
                <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/30">
                  {leaveTypes.map((leave) => (
                    <div key={leave.id} className="p-3 flex items-center justify-between hover:bg-slate-800/30 transition">
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-md border text-xs font-semibold ${leave.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                          {leave.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <span>Allowance:</span>
                          <input
                            type="number"
                            min="1"
                            max="365"
                            value={leave.maxDays}
                            onChange={(e) => handleUpdateLeaveMaxDays(leave.id, e.target.value)}
                            className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-center text-cyan-400 font-bold focus:outline-none focus:border-cyan-500"
                          />
                          <span>days/year</span>
                        </div>
                        <button
                          onClick={() => handleDeleteLeaveType(leave.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition"
                          title="Delete Leave Option"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'task_options' && (
            <div className="space-y-6">
              {/* Add New Task Status Form */}
              <form onSubmit={handleAddTaskStatus} className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-cyan-400" />
                  Add Custom Project Workflow Stage / Task Status
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Status Title</label>
                    <input
                      type="text"
                      placeholder="e.g., Code Review / Deployment / QA Passed"
                      value={newTaskLabel}
                      onChange={(e) => setNewTaskLabel(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Color Theme</label>
                    <select
                      value={newTaskColor}
                      onChange={(e) => setNewTaskColor(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="bg-slate-500">Slate Gray</option>
                      <option value="bg-blue-500">Blue Accent</option>
                      <option value="bg-indigo-500">Indigo</option>
                      <option value="bg-purple-500">Purple</option>
                      <option value="bg-amber-500">Amber / Warning</option>
                      <option value="bg-emerald-500">Emerald Green</option>
                      <option value="bg-rose-500">Rose / Danger</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!newTaskLabel.trim()}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition ml-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Task Status
                </button>
              </form>

              {/* Task Statuses List */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                  Active Project Workflow Stages
                </div>
                <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/30">
                  {taskStatuses.map((status) => (
                    <div key={status.id} className="p-3 flex items-center justify-between hover:bg-slate-800/30 transition">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${status.color || 'bg-cyan-500'}`}></div>
                        <span className="text-xs font-semibold text-white">{status.label}</span>
                      </div>

                      <button
                        onClick={() => handleDeleteTaskStatus(status.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition"
                        title="Delete Status Stage"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Changes sync live instantly across all active user sessions.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition disabled:opacity-50"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  Customizations Saved!
                </>
              ) : isSaving ? (
                'Saving & Syncing...'
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save & Apply Global Customizations
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

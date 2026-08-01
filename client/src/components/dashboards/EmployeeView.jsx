import React, { useState, useEffect } from 'react';
import { Award, Clock, Briefcase, FileCheck, CheckCircle2, AlertCircle, Filter, Calendar, Home, RefreshCcw } from 'lucide-react';
import GeofenceAttendanceWidget from '../GeofenceAttendanceWidget';
import DailyWorkLogForm from '../projects/DailyWorkLogForm';
import TaskReworkModal from '../projects/TaskReworkModal';

export default function EmployeeView({ activeUser, geofence, attendanceLogs, onCheckIn, tasks = [], projects = [], onSubmitWorkLog, workLogs = [], onRefreshData }) {
  const [dashboardData, setDashboardData] = useState({ assignedProjects: [], totalWorkloadPct: 0, activeTasks: [], completedTasks: [], reworkTasks: [] });
  const [leaveBalance, setLeaveBalance] = useState({ casual: 12, sick: 10, earned: 15, comp_off: 2 });
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [filterProject, setFilterProject] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [selectedTaskForRework, setSelectedTaskForRework] = useState(null);

  useEffect(() => {
    fetchDashboardInfo();
  }, [activeUser?.id]);

  const fetchDashboardInfo = async () => {
    try {
      setLoading(true);
      const [dashRes, balRes, calRes] = await Promise.all([
        fetch(`/api/employee/${activeUser?.id}/dashboard-projects`).then(r => r.json()),
        fetch(`/api/leaves/balance/${activeUser?.id}`).then(r => r.json()),
        fetch('/api/leaves/calendar').then(r => r.json())
      ]);
      setDashboardData(dashRes);
      setLeaveBalance(balRes);
      if (calRes.holidays) setHolidays(calRes.holidays);
    } catch (err) {
      console.error("Failed to fetch employee dashboard info", err);
    } finally {
      setLoading(false);
    }
  };

  const myTasks = tasks?.filter(t => t.assigned_to === activeUser?.id) || [];

  // Filter tasks
  const filteredTasks = myTasks.filter(t => {
    if (filterProject !== 'ALL' && t.project_id !== filterProject) return false;
    if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
    if (filterPriority !== 'ALL' && t.priority !== filterPriority) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Profile Completion Bar Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Profile Onboarding Completion Progress
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Mandatory verification: Aadhaar, PAN, Bank Passbook & Resume</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl font-bold font-mono text-amber-500">{activeUser.profile_score}%</span>
            <div className="text-[10px] text-slate-400">
              {activeUser.verified_employee ? '100% Fully Verified' : 'Action Required: Upload Documents'}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-200 dark:border-slate-700 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              activeUser.profile_score === 100
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : 'bg-gradient-to-r from-amber-500 to-orange-400'
            }`}
            style={{ width: `${activeUser.profile_score}%` }}
          />
        </div>
      </div>

      {/* Quick Summary Cards (Leave Balance, Active Projects & Holidays) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200">
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Casual Leave Balance</span>
          <div className="text-2xl font-black mt-1">{leaveBalance.casual} <span className="text-xs font-normal opacity-70">Days</span></div>
          <span className="text-[10px] text-blue-500">Sick: {leaveBalance.sick} | Earned: {leaveBalance.earned}</span>
        </div>

        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-900 dark:text-purple-200">
          <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Assigned Projects</span>
          <div className="text-2xl font-black mt-1">{(dashboardData.assignedProjects || []).length} <span className="text-xs font-normal opacity-70">Active</span></div>
          <span className="text-[10px] text-purple-500">Workload: {dashboardData.totalWorkloadPct || 100}%</span>
        </div>

        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Pending Tasks</span>
          <div className="text-2xl font-black mt-1">{(dashboardData.activeTasks || []).length} <span className="text-xs font-normal opacity-70">Tasks</span></div>
          <span className="text-[10px] text-amber-500">Completed: {(dashboardData.completedTasks || []).length}</span>
        </div>

        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200">
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Upcoming Holiday</span>
          <div className="text-sm font-bold truncate mt-2">{holidays[0]?.title || 'Independence Day'}</div>
          <span className="text-[10px] text-emerald-500">{holidays[0]?.date || '2026-08-15'}</span>
        </div>
      </div>

      {/* Multiple Assigned Projects Workload Widget */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-cyan-500" />
            My Active Project Allocations & Workload
          </h3>
          <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold">
            Total Workload: {dashboardData.totalWorkloadPct || 100}%
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(dashboardData.assignedProjects || []).map(p => (
            <div key={p.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-xs text-slate-900 dark:text-white truncate">{p.title}</div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-semibold">
                  {p.priority} Priority
                </span>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <div>Role: <strong>{p.roleInProject}</strong></div>
                <div>Allocation: <strong className="text-cyan-500">{p.allocationPct}%</strong></div>
                <div>Deadline: {p.deadline}</div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                  <span>Task Completion</span>
                  <span>{p.completionPct}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${p.completionPct}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tasks Toolbar & Filtering Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-cyan-500" />
            Assigned Deliverables & Task Filter
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterProject}
                onChange={e => setFilterProject(e.target.value)}
                className="bg-transparent text-slate-900 dark:text-white focus:outline-none text-xs"
              >
                <option value="ALL">All Projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-xs">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="bg-transparent text-slate-900 dark:text-white focus:outline-none text-xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Rework Required">Rework Required</option>
                <option value="Approved">Approved</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-xs">
              <select
                value={filterPriority}
                onChange={e => setFilterPriority(e.target.value)}
                className="bg-transparent text-slate-900 dark:text-white focus:outline-none text-xs"
              >
                <option value="ALL">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-2">
          {filteredTasks.map(t => (
            <div key={t.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 flex items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white">{t.title}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    t.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500' : t.status === 'Rework Required' ? 'bg-amber-500/10 text-amber-500' : 'bg-cyan-500/10 text-cyan-500'
                  }`}>
                    {t.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Project: {t.project_title} • Due: {t.due_date} • Priority: {t.priority}</div>
              </div>

              {(t.status === 'Rework Required' || t.revisions?.length > 0) && (
                <button
                  onClick={() => setSelectedTaskForRework(t)}
                  className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-lg font-semibold flex items-center gap-1 hover:bg-amber-500/20 transition"
                >
                  <RefreshCcw className="w-3.5 h-3.5" />
                  View Revision Notes
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Geofence Attendance Clock In/Out */}
      <GeofenceAttendanceWidget
        geofence={geofence}
        activeUser={activeUser}
        logs={attendanceLogs}
        onCheckIn={onCheckIn}
        onUpdateGeofence={() => {}}
      />

      {/* Daily Work Log Submission */}
      <DailyWorkLogForm
        activeUser={activeUser}
        onSubmitLog={onSubmitWorkLog}
        logs={workLogs}
      />

      {/* Task Rework Details Modal */}
      {selectedTaskForRework && (
        <TaskReworkModal
          isOpen={!!selectedTaskForRework}
          onClose={() => setSelectedTaskForRework(null)}
          task={selectedTaskForRework}
          activeUser={activeUser}
          onTaskReviewed={() => {
            fetchDashboardInfo();
            if (onRefreshData) onRefreshData();
          }}
        />
      )}

    </div>
  );
}

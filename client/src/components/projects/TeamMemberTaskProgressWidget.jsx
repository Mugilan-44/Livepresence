import React, { useState, useEffect } from 'react';
import { Users, CheckCircle2, Clock, AlertCircle, RefreshCw, BarChart2, ShieldAlert } from 'lucide-react';

export default function TeamMemberTaskProgressWidget({ projectId, projectTitle }) {
  const [memberProgress, setMemberProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      fetchProgress();
    }
  }, [projectId]);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${projectId}/member-progress`);
      const data = await res.json();
      setMemberProgress(data.memberProgress || []);
    } catch (err) {
      console.error("Failed to fetch member progress", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      
      {/* Widget Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-500" />
            Task Progress by Team Member
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Individual task execution metrics, completion %, and estimated vs actual time
          </p>
        </div>

        <button
          onClick={fetchProgress}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
          title="Refresh Progress Metrics"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Progress Cards per Member */}
      {memberProgress.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {memberProgress.map((m) => (
            <div
              key={m.userId}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{m.userName}</div>
                  <div className="text-[10px] text-slate-400">Last Active: {new Date(m.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-cyan-600 dark:text-cyan-400">{m.completionPct}%</span>
                  <div className="text-[10px] text-slate-400">Completion Rate</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${m.completionPct}%` }}
                />
              </div>

              {/* Breakdown Grid */}
              <div className="grid grid-cols-5 text-center text-[10px] gap-1 pt-1">
                <div className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <div className="font-bold text-xs">{m.assignedTasks}</div>
                  <div className="text-slate-400 text-[9px]">Assigned</div>
                </div>

                <div className="p-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <div className="font-bold text-xs">{m.completedTasks}</div>
                  <div className="text-[9px]">Completed</div>
                </div>

                <div className="p-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <div className="font-bold text-xs">{m.inProgressTasks}</div>
                  <div className="text-[9px]">In Progress</div>
                </div>

                <div className="p-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <div className="font-bold text-xs">{m.reworkTasks || m.pendingTasks}</div>
                  <div className="text-[9px]">Pending</div>
                </div>

                <div className="p-1 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <div className="font-bold text-xs">{m.overdueTasks}</div>
                  <div className="text-[9px]">Overdue</div>
                </div>
              </div>

              {/* Hours Comparison */}
              <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 border-t border-slate-200 dark:border-slate-700/60">
                <span>Estimated Time: <strong className="text-slate-800 dark:text-slate-200">{m.estimatedHours} hrs</strong></span>
                <span>Actual Logged: <strong className="text-cyan-500">{m.actualHours} hrs</strong></span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
          No task metrics allocated to team members for this project yet.
        </div>
      )}
    </div>
  );
}

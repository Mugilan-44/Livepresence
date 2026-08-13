import React, { useState } from 'react';
import { Calendar, ShieldCheck, UserCheck, Eye } from 'lucide-react';
import EmployeeLeaveView from './EmployeeLeaveView';
import AdminLeaveView from './AdminLeaveView';

export default function LeaveManagementPage({ activeUser, users = [], onRefreshLeaves }) {
  const isAdmin = ['SUPER_ADMIN', 'HR', 'MANAGER'].includes(activeUser?.role);
  const [viewMode, setViewMode] = useState(isAdmin ? 'admin' : 'employee'); // 'admin' | 'employee'

  return (
    <div className="space-y-6">
      
      {/* Admin-only view switch. Employees land directly on their leave tools. */}
      {isAdmin && <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{viewMode === 'admin' ? 'Leave management' : 'My leave requests'}</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {viewMode === 'admin' ? 'Manage leave policy, approvals, employee leave history, time permissions, and official holidays.' : 'Your requests and history.'}
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setViewMode('admin')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                viewMode === 'admin'
                  ? 'bg-cyan-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin Workspace
            </button>
            <button
              onClick={() => setViewMode('employee')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                viewMode === 'employee'
                  ? 'bg-cyan-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              My Leaves View
            </button>
          </div>
      </div>}

      {/* Render selected view */}
      {viewMode === 'admin' && isAdmin ? (
        <AdminLeaveView
          activeUser={activeUser}
          users={users}
          onRefreshLeaves={onRefreshLeaves}
        />
      ) : (
        <EmployeeLeaveView
          activeUser={activeUser}
          onRefreshLeaves={onRefreshLeaves}
        />
      )}

    </div>
  );
}

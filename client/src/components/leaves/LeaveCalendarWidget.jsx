import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertTriangle, CheckCircle2, XCircle, Plus, ChevronLeft, ChevronRight, Info, ShieldAlert } from 'lucide-react';
import ApplyLeaveModal from './ApplyLeaveModal';

async function readApiResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return response.json();
  return { error: 'The HRMS service is unavailable. Please refresh in a moment or contact the administrator.' };
}

export default function LeaveCalendarWidget({ activeUser, users = [], onRefreshLeaves }) {
  const [balance, setBalance] = useState({ casual: 12, sick: 10, earned: 15, comp_off: 2 });
  const [calendarData, setCalendarData] = useState({ leaves: [], holidays: [], conflicts: [] });
  const [analytics, setAnalytics] = useState({ totalEmployees: 0, onLeaveTodayCount: 0, pendingRequestsCount: 0, approvedRequestsCount: 0 });
  const [selectedLocationFilter, setSelectedLocationFilter] = useState('ALL');
  const [currentDate, setCurrentDate] = useState(new Date(2026, 7, 1)); // August 2026
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignment, setAssignment] = useState({ userId: '', leaveType: 'Casual Leave', startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], reason: '' });
  const [assignmentError, setAssignmentError] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeUser?.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [balRes, calRes, anaRes] = await Promise.all([
        fetch(`/api/leaves/balance/${activeUser?.id}`).then(r => r.json()),
        fetch('/api/leaves/calendar').then(r => r.json()),
        fetch('/api/admin/leave-analytics').then(r => r.json())
      ]);
      setBalance(balRes);
      setCalendarData(calRes);
      if (anaRes.totalEmployees !== undefined) setAnalytics(anaRes);
    } catch (e) {
      console.error("Failed to fetch leave calendar data", e);
    } finally {
      setLoading(false);
    }
  };

  const assignLeave = async (event) => {
    event.preventDefault();
    setAssignmentError('');
    setIsAssigning(true);
    try {
      const response = await fetch('/api/leaves/assign', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...assignment, actorRole: activeUser.role, actorName: activeUser.name })
      });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.error || 'Unable to assign leave.');
      setIsAssignModalOpen(false);
      await fetchData();
      onRefreshLeaves?.();
    } catch (error) {
      setAssignmentError(error.message);
    } finally {
      setIsAssigning(false);
    }
  };


  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const monthYearTitle = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Filter leaves for current month
  const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  
  const userLeaves = (calendarData.leaves || []).filter(l => l.user_id === activeUser?.id);
  const myApprovedLeaves = userLeaves.filter(l => l.status === 'Approved');
  const myPendingLeaves = userLeaves.filter(l => l.status === 'Pending');

  // Next month's holidays
  const nextMonthObj = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  const nextMonthStr = `${nextMonthObj.getFullYear()}-${String(nextMonthObj.getMonth() + 1).padStart(2, '0')}`;
  const nextHolidays = (calendarData.holidays || []).filter(h => h.date?.startsWith(nextMonthStr));

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-500" />
            Leave Balance & Enterprise Calendar
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track entitlement quota, remaining casual/sick days, holidays, and team leave conflicts
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {['SUPER_ADMIN', 'HR'].includes(activeUser?.role) && <button onClick={() => setIsAssignModalOpen(true)} className="px-4 py-2 bg-slate-900 hover:bg-slate-700 dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg transition"><Plus className="w-4 h-4" /> Assign Leave</button>}
          <button onClick={() => setIsApplyModalOpen(true)} className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg transition"><Plus className="w-4 h-4" /> Apply Leave / WFH</button>
        </div>
      </div>

      {/* Leave Balance Quota Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200">
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Casual Leave (CL)</span>
          <div className="text-2xl font-black mt-1">{balance.casual} <span className="text-xs font-normal opacity-70">Days left</span></div>
          <span className="text-[10px] text-blue-500">Annual Quota: 12 Days</span>
        </div>

        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-900 dark:text-rose-200">
          <span className="text-xs font-medium text-rose-600 dark:text-rose-400">Sick Leave (SL)</span>
          <div className="text-2xl font-black mt-1">{balance.sick} <span className="text-xs font-normal opacity-70">Days left</span></div>
          <span className="text-[10px] text-rose-500">Medical Backup: 10 Days</span>
        </div>

        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Earned / Privilege (EL)</span>
          <div className="text-2xl font-black mt-1">{balance.earned} <span className="text-xs font-normal opacity-70">Days left</span></div>
          <span className="text-[10px] text-amber-500">Privilege Leave: 15 Days</span>
        </div>

        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-900 dark:text-purple-200">
          <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Compensatory Off</span>
          <div className="text-2xl font-black mt-1">{balance.comp_off} <span className="text-xs font-normal opacity-70">Days left</span></div>
          <span className="text-[10px] text-purple-500">Overtime Credit</span>
        </div>
      </div>

      {/* Main Calendar View & Sidebar Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Calendar Grid (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{monthYearTitle}</h3>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={nextMonth} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty slots for month start padding */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-20 bg-slate-50/50 dark:bg-slate-950/20 rounded-lg" />
            ))}

            {/* Days of Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              
              const isToday = new Date().toISOString().startsWith(dateStr);

              // Check if user has approved or pending leave on this date
              const dayLeaves = (calendarData.leaves || []).filter(l => l.start_date <= dateStr && l.end_date >= dateStr);
              const holiday = (calendarData.holidays || []).find(h => h.date === dateStr);

              const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
              const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

              return (
                <div
                  key={day}
                  className={`h-20 p-1.5 rounded-lg border flex flex-col justify-between transition text-xs ${
                    isToday
                      ? 'border-cyan-500 bg-cyan-500/5 font-bold'
                      : 'border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`${isToday ? 'text-cyan-500 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>{day}</span>
                    {isWeekend && <span className="text-[9px] text-slate-400 font-normal">Off</span>}
                  </div>

                  <div className="space-y-1 overflow-hidden">
                    {holiday && (
                      <div className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-500 truncate font-medium">
                        🎉 {holiday.title}
                      </div>
                    )}
                    {dayLeaves.map(l => (
                      <div
                        key={l.id}
                        className={`text-[9px] px-1 py-0.5 rounded truncate font-medium ${
                          l.status === 'Approved'
                            ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        }`}
                        title={`${l.user_name} (${l.leave_type}) - ${l.status}`}
                      >
                        {l.user_name.split(' ')[0]}: {l.leave_type}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Sidebar Info: Holidays & Conflicts */}
        <div className="space-y-6">
          
          {/* Upcoming Holidays Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-500" />
              Company Holidays & Offs
            </h4>

            <div className="space-y-2">
              {(calendarData.holidays || []).map(h => (
                <div key={h.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{h.title}</div>
                    <div className="text-[10px] text-slate-400">{h.type || 'Official Holiday'}</div>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">
                    {h.date}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Apply Leave Modal */}
      {isApplyModalOpen && (
        <ApplyLeaveModal
          onClose={() => setIsApplyModalOpen(false)}
          activeUser={activeUser}
          onSubmitLeave={async (payload) => {
            const response = await fetch('/api/leaves', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const data = await readApiResponse(response);
            if (!response.ok) throw new Error(data.error || 'Unable to submit leave request.');
            await fetchData(); onRefreshLeaves?.();
          }}
        />
      )}
      {isAssignModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={assignLeave} className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"><div><h3 className="text-lg font-bold text-slate-900 dark:text-white">Assign Leave</h3><p className="text-xs text-slate-500 mt-1">This is approved immediately and appears in the employee calendar.</p></div>{assignmentError && <div className="rounded-lg bg-rose-50 text-rose-700 p-3 text-xs">{assignmentError}</div>}<select required value={assignment.userId} onChange={e => setAssignment({ ...assignment, userId: e.target.value })} className="w-full rounded-lg border p-2 text-sm"><option value="">Select employee</option>{users.filter(user => user.active !== false && user.employment_status !== 'Disabled').map(user => <option key={user.id} value={user.id}>{user.name} — {user.employee_id}</option>)}</select><select value={assignment.leaveType} onChange={e => setAssignment({ ...assignment, leaveType: e.target.value })} className="w-full rounded-lg border p-2 text-sm"><option>Casual Leave</option><option>Sick Leave</option><option>Earned Leave</option><option>Annual Leave</option><option>Work From Home Pass</option></select><div className="grid grid-cols-2 gap-3"><input required type="date" value={assignment.startDate} onChange={e => setAssignment({ ...assignment, startDate: e.target.value })} className="rounded-lg border p-2 text-sm"/><input required type="date" min={assignment.startDate} value={assignment.endDate} onChange={e => setAssignment({ ...assignment, endDate: e.target.value })} className="rounded-lg border p-2 text-sm"/></div><textarea required rows="3" placeholder="Reason / note" value={assignment.reason} onChange={e => setAssignment({ ...assignment, reason: e.target.value })} className="w-full rounded-lg border p-2 text-sm"/><div className="flex justify-end gap-2"><button type="button" onClick={() => setIsAssignModalOpen(false)} className="rounded-lg px-4 py-2 text-sm bg-slate-100">Cancel</button><button disabled={isAssigning} className="rounded-lg px-4 py-2 text-sm bg-cyan-600 text-white">{isAssigning ? 'Assigning…' : 'Assign & Approve'}</button></div></form></div>}
    </div>
  );
}

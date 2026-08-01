import React, { useState, useEffect } from 'react';
import { Calendar, Plus, ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle, AlertCircle, Sparkles } from 'lucide-react';
import ApplyLeaveModal from './ApplyLeaveModal';

export default function EmployeeLeaveView({ activeUser, onRefreshLeaves }) {
  const [balance, setBalance] = useState({
    casual: 12,
    sick: 10,
    earned: 15,
    comp_off: 2,
    totals: { casual: 12, sick: 10, earned: 15, comp_off: 2 },
    used: { casual: 0, sick: 0, earned: 0, comp_off: 0 },
    totalRemaining: 39
  });
  const [myRequests, setMyRequests] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 7, 1)); // August 2026 default
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployeeData();
  }, [activeUser?.id]);

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      const [balRes, leavesRes, holRes] = await Promise.all([
        fetch(`/api/leaves/balance/${activeUser?.id}`).then(r => r.json()),
        fetch('/api/leaves').then(r => r.json()),
        fetch('/api/holidays').then(r => r.json())
      ]);

      if (balRes) setBalance(balRes);
      if (Array.isArray(leavesRes)) {
        setAllLeaves(leavesRes);
        setMyRequests(leavesRes.filter(r => r.user_id === activeUser?.id));
      }
      if (Array.isArray(holRes)) setHolidays(holRes);
    } catch (e) {
      console.error("Failed to load employee leave data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyLeaveSubmit = async (reqData) => {
    const res = await fetch('/api/leaves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...reqData,
        userId: activeUser?.id
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to submit leave request.');
    await fetchEmployeeData();
    onRefreshLeaves?.();
  };

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthTitle = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));

  // Extract totals, used, remaining
  const totals = balance.totals || { casual: 12, sick: 10, earned: 15, comp_off: 2 };
  const used = balance.used || { casual: 0, sick: 0, earned: 0, comp_off: 0 };
  const casualRem = balance.casual !== undefined ? balance.casual : totals.casual - used.casual;
  const sickRem = balance.sick !== undefined ? balance.sick : totals.sick - used.sick;
  const earnedRem = balance.earned !== undefined ? balance.earned : totals.earned - used.earned;
  const compOffRem = balance.comp_off !== undefined ? balance.comp_off : totals.comp_off - used.comp_off;
  const totalLeft = balance.totalRemaining !== undefined ? balance.totalRemaining : (casualRem + sickRem + earnedRem + compOffRem);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* SECTION 1: Leave Balance Top Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-500" />
            My Leave Balance
          </h2>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            Total Leave Left: <strong className="text-slate-900 dark:text-white font-mono text-sm">{totalLeft} Days</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Casual Leave */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex flex-col justify-between hover:border-cyan-500/50 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Casual Leave</span>
              <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
            </div>
            <div className="my-3">
              <div className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                {casualRem} <span className="text-xs font-normal text-slate-400">Remaining</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-2 font-medium">
              <span>{totals.casual} Total</span>
              <span className="text-amber-600 dark:text-amber-400">{used.casual} Used</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-bold">{casualRem} Remaining</span>
            </div>
          </div>

          {/* Sick Leave */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex flex-col justify-between hover:border-rose-500/50 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sick Leave</span>
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            </div>
            <div className="my-3">
              <div className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                {sickRem} <span className="text-xs font-normal text-slate-400">Remaining</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-2 font-medium">
              <span>{totals.sick} Total</span>
              <span className="text-amber-600 dark:text-amber-400">{used.sick} Used</span>
              <span className="text-rose-600 dark:text-rose-400 font-bold">{sickRem} Remaining</span>
            </div>
          </div>

          {/* Earned Leave */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex flex-col justify-between hover:border-emerald-500/50 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Earned Leave</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <div className="my-3">
              <div className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                {earnedRem} <span className="text-xs font-normal text-slate-400">Remaining</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-2 font-medium">
              <span>{totals.earned} Total</span>
              <span className="text-amber-600 dark:text-amber-400">{used.earned} Used</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{earnedRem} Remaining</span>
            </div>
          </div>

          {/* Comp Off */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex flex-col justify-between hover:border-purple-500/50 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Comp Off</span>
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            </div>
            <div className="my-3">
              <div className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                {compOffRem} <span className="text-xs font-normal text-slate-400">Days</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-2 font-medium">
              <span>{totals.comp_off} Total</span>
              <span className="text-amber-600 dark:text-amber-400">{used.comp_off} Used</span>
              <span className="text-purple-600 dark:text-purple-400 font-bold">{compOffRem} Remaining</span>
            </div>
          </div>

          {/* Total Left Banner Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-950 text-white p-4 rounded-2xl shadow-md flex flex-col justify-between border border-slate-700">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Total Leave Left</span>
            <div className="my-2">
              <div className="text-4xl font-black font-mono text-cyan-400">{totalLeft}</div>
              <p className="text-[10px] text-slate-300 mt-0.5">Available for 2026</p>
            </div>
            <div className="text-[10px] text-slate-400">
              Accrued & Allocated
            </div>
          </div>

        </div>
      </div>

      {/* SECTION 2: Apply Leave Action */}
      <div className="flex items-center justify-between bg-gradient-to-r from-cyan-600/10 via-blue-600/10 to-transparent p-4 rounded-2xl border border-cyan-500/20">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Need time off?</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Apply for casual leave, sick leave, earned leave, or comp off in just a few seconds.</p>
        </div>
        <button
          onClick={() => setIsApplyModalOpen(true)}
          className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded-xl shadow-md transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Apply Leave
        </button>
      </div>

      {/* SECTION 3: My Leave Requests */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">My Leave Requests</h3>
          <span className="text-xs text-slate-400 font-medium">{myRequests.length} Requests Total</span>
        </div>

        {myRequests.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No leave requests submitted yet. Click "Apply Leave" to submit your first request.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 font-semibold">
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">From</th>
                  <th className="py-3 px-4">To</th>
                  <th className="py-3 px-4">Days</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {myRequests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{req.leave_type}</td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">{req.start_date}</td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">{req.end_date}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-white">{req.days_count} {req.days_count === 1 ? 'day' : 'days'}</td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{req.reason || 'Personal'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        req.status === 'Approved'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : req.status === 'Rejected'
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      }`}>
                        {req.status === 'Approved' && <CheckCircle2 className="w-3 h-3" />}
                        {req.status === 'Rejected' && <XCircle className="w-3 h-3" />}
                        {req.status === 'Pending' && <Clock className="w-3 h-3" />}
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 4: Calendar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-500" />
              Calendar ({monthTitle})
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Showing Holidays & Approved/Pending Personal Leaves</p>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={nextMonth} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-[11px] text-slate-500 pb-1 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500"></span>
            <span>Government & Company Holidays</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500/20 border border-blue-500"></span>
            <span>Approved Personal Leave</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500"></span>
            <span>Pending Leave Request</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 py-2 border-y border-slate-100 dark:border-slate-800">
          <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {/* Padding empty slots */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-16 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl" />
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const monthStr = String(month + 1).padStart(2, '0');
            const dayStr = String(day).padStart(2, '0');
            const dateStr = `${year}-${monthStr}-${dayStr}`;

            const holiday = holidays.find(h => h.date === dateStr);
            const personalLeaves = myRequests.filter(r => r.start_date <= dateStr && r.end_date >= dateStr);
            const dateObj = new Date(year, month, day);
            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

            return (
              <div
                key={day}
                className={`h-20 p-2 rounded-xl border flex flex-col justify-between transition text-xs ${
                  holiday
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300 font-semibold'
                    : personalLeaves.length > 0
                    ? personalLeaves[0].status === 'Approved'
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-300 font-semibold'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-300 font-semibold'
                    : isWeekend
                    ? 'bg-slate-50/80 dark:bg-slate-950/40 border-slate-100 dark:border-slate-800/50 text-slate-400'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">{day}</span>
                  {isWeekend && <span className="text-[9px] text-slate-400 font-normal">Off</span>}
                </div>

                <div className="space-y-1 overflow-hidden">
                  {holiday && (
                    <div className="text-[9px] font-bold px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 truncate" title={holiday.title}>
                      🎉 {holiday.title}
                    </div>
                  )}
                  {personalLeaves.map(l => (
                    <div
                      key={l.id}
                      className={`text-[9px] font-bold px-1 py-0.5 rounded truncate ${
                        l.status === 'Approved'
                          ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300'
                          : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                      }`}
                      title={`${l.leave_type} (${l.status})`}
                    >
                      {l.leave_type} ({l.status})
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Modal */}
      {isApplyModalOpen && (
        <ApplyLeaveModal
          activeUser={activeUser}
          onClose={() => setIsApplyModalOpen(false)}
          onSubmitLeave={handleApplyLeaveSubmit}
        />
      )}

    </div>
  );
}

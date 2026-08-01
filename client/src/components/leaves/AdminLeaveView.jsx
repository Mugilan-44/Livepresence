import React, { useState, useEffect } from 'react';
import { 
  Users, CheckCircle2, XCircle, Clock, Calendar, Plus, Trash2, Edit3, Save, 
  ShieldCheck, AlertCircle, FileText, Sliders, ArrowUpRight, Search, RefreshCw, UserCheck, MessageSquare
} from 'lucide-react';

export default function AdminLeaveView({ activeUser, users = [], onRefreshLeaves }) {
  const [activeTab, setActiveTab] = useState('approvals'); // approvals | employees | policy | holidays | assign
  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [policy, setPolicy] = useState({
    year: 2026,
    casual_leave: 12,
    sick_leave: 10,
    earned_leave: 15,
    comp_off_enabled: true,
    carry_forward_rules: "Allow up to 5 days carry forward annually.",
    monthly_accrual: false,
    max_leave_per_request: 10,
    negative_leave_allowed: false
  });
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [userBalance, setUserBalance] = useState(null);
  const [overrideForm, setOverrideForm] = useState({ casual: 12, sick: 10, earned: 15, comp_off: 2 });
  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState('');

  // Comment Modal state for Return/Reject with Comment
  const [commentModal, setCommentModal] = useState({ isOpen: false, reqId: null, action: null, comment: '' });

  // New Holiday Form State
  const [newHoliday, setNewHoliday] = useState({ title: '', date: '', type: 'Government Holiday', category: 'Government' });

  // Direct Assign Form State
  const [assignForm, setAssignForm] = useState({
    userId: '',
    leaveType: 'Casual Leave',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: ''
  });

  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [lRes, hRes, pRes] = await Promise.all([
        fetch('/api/leaves').then(r => r.json()),
        fetch('/api/holidays').then(r => r.json()),
        fetch('/api/leaves/policy').then(r => r.json())
      ]);

      if (Array.isArray(lRes)) setLeaves(lRes);
      if (Array.isArray(hRes)) setHolidays(hRes);
      if (pRes) setPolicy(pRes);

      if (users.length > 0 && !selectedUser) {
        setSelectedUser(users[0]);
        fetchUserBalance(users[0].id);
      }
    } catch (e) {
      console.error("Failed to load admin leave data", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserBalance = async (uId) => {
    try {
      const res = await fetch(`/api/leaves/balance/${uId}`);
      const data = await res.json();
      setUserBalance(data);
      if (data.totals) {
        setOverrideForm({
          casual: data.casual !== undefined ? data.casual : data.totals.casual,
          sick: data.sick !== undefined ? data.sick : data.totals.sick,
          earned: data.earned !== undefined ? data.earned : data.totals.earned,
          comp_off: data.comp_off !== undefined ? data.comp_off : data.totals.comp_off
        });
      }
    } catch (e) {
      console.error("Failed to fetch user balance", e);
    }
  };

  const handleReviewRequest = async (id, status, reviewNotes = '') => {
    setStatusMsg('');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/leaves/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          reviewedBy: activeUser?.name || 'HR Admin',
          reviewNotes,
          userRole: activeUser?.role
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to review leave request.');

      setStatusMsg(`Request ${status} successfully!`);
      await fetchAdminData();
      if (selectedUser) fetchUserBalance(selectedUser.id);
      onRefreshLeaves?.();
    } catch (e) {
      setErrorMsg(e.message);
    }
  };

  const handleSavePolicy = async (e) => {
    e.preventDefault();
    setStatusMsg('');
    setErrorMsg('');
    try {
      const res = await fetch('/api/leaves/policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...policy,
          userRole: activeUser?.role,
          actorName: activeUser?.name
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update policy.');
      setStatusMsg('Yearly leave policy saved! Baseline balances updated for all employees.');
      setPolicy(data.policy);
      if (selectedUser) fetchUserBalance(selectedUser.id);
    } catch (e) {
      setErrorMsg(e.message);
    }
  };

  const handleSaveUserOverride = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setStatusMsg('');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/admin/employees/${selectedUser.id}/leave-override`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          casual: overrideForm.casual,
          sick: overrideForm.sick,
          earned: overrideForm.earned,
          comp_off: overrideForm.comp_off,
          userRole: activeUser?.role,
          actorName: activeUser?.name
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to override balance.');
      setStatusMsg(`Leave balances overridden for ${selectedUser.name}! Recorded in audit log.`);
      fetchUserBalance(selectedUser.id);
    } catch (e) {
      setErrorMsg(e.message);
    }
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!newHoliday.title || !newHoliday.date) return;
    setStatusMsg('');
    setErrorMsg('');
    try {
      const res = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newHoliday,
          userRole: activeUser?.role,
          actorName: activeUser?.name
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add holiday.');
      setStatusMsg('Holiday added successfully!');
      setNewHoliday({ title: '', date: '', type: 'Government Holiday', category: 'Government' });
      fetchAdminData();
    } catch (e) {
      setErrorMsg(e.message);
    }
  };

  const handleDeleteHoliday = async (id) => {
    setStatusMsg('');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/holidays/${id}?userRole=${activeUser?.role}&actorName=${encodeURIComponent(activeUser?.name || 'HR Admin')}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete holiday.');
      setStatusMsg('Holiday removed successfully!');
      fetchAdminData();
    } catch (e) {
      setErrorMsg(e.message);
    }
  };

  const handleDirectAssign = async (e) => {
    e.preventDefault();
    if (!assignForm.userId || !assignForm.startDate || !assignForm.endDate) {
      setErrorMsg('Select employee, dates, and leave type.');
      return;
    }
    setStatusMsg('');
    setErrorMsg('');
    try {
      const res = await fetch('/api/leaves/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...assignForm,
          actorRole: activeUser?.role,
          actorName: activeUser?.name
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign leave.');
      setStatusMsg(`Leave assigned successfully to ${users.find(u=>u.id === assignForm.userId)?.name}!`);
      setAssignForm({ userId: '', leaveType: 'Casual Leave', startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], reason: '' });
      fetchAdminData();
      onRefreshLeaves?.();
    } catch (e) {
      setErrorMsg(e.message);
    }
  };

  // Calculations for Dashboard Overview
  const todayStr = new Date().toISOString().split('T')[0];
  const pendingRequests = leaves.filter(l => l.status === 'Pending');
  const onLeaveToday = leaves.filter(l => l.status === 'Approved' && l.start_date <= todayStr && l.end_date >= todayStr);
  const upcomingHolidays = holidays.filter(h => h.date >= todayStr).slice(0, 5);

  const filteredEmployees = users.filter(u => 
    u.name?.toLowerCase().includes(searchEmployeeQuery.toLowerCase()) ||
    u.department?.toLowerCase().includes(searchEmployeeQuery.toLowerCase()) ||
    u.employee_id?.toLowerCase().includes(searchEmployeeQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* ADMIN DASHBOARD OVERVIEW: Minimal 4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Pending Requests */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Requests</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">{pendingRequests.length}</span>
          </div>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Awaiting HR approval</p>
        </div>

        {/* Card 2: Employees on Leave Today */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">On Leave Today</span>
            <UserCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">{onLeaveToday.length}</span>
          </div>
          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">Approved active leaves</p>
        </div>

        {/* Card 3: Upcoming Holidays */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upcoming Holidays</span>
            <Calendar className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">{upcomingHolidays.length}</span>
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Scheduled company holidays</p>
        </div>

        {/* Card 4: Leave Policy Status */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Policy</span>
            <Sliders className="w-4 h-4 text-purple-500" />
          </div>
          <div className="my-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">Year {policy.year || 2026}</span>
          </div>
          <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">{policy.casual_leave} CL / {policy.sick_leave} SL / {policy.earned_leave} EL</p>
        </div>

      </div>

      {/* Status / Error Alerts */}
      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          {statusMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-500" />
          {errorMsg}
        </div>
      )}

      {/* ADMIN NAVIGATION TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('approvals')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'approvals'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          Leave Approvals ({pendingRequests.length})
        </button>

        <button
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'employees'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-cyan-500" />
          Employee Balances
        </button>

        <button
          onClick={() => setActiveTab('policy')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'policy'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-purple-500" />
          Leave Policy & Rules
        </button>

        <button
          onClick={() => setActiveTab('holidays')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'holidays'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-emerald-500" />
          Holiday Management ({holidays.length})
        </button>

        <button
          onClick={() => setActiveTab('assign')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'assign'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Plus className="w-3.5 h-3.5 text-blue-500" />
          Assign Personal Leave
        </button>
      </div>

      {/* TAB 1: LEAVE APPROVALS */}
      {activeTab === 'approvals' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pending Leave Approvals</h3>
              <p className="text-xs text-slate-400 mt-0.5">Approval automatically reduces employee leave balance. Rejecting or returning restores balance.</p>
            </div>
            <span className="px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs rounded-full border border-amber-500/20">
              {pendingRequests.length} Pending
            </span>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No pending leave requests. All applications have been processed.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 font-semibold">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Leave Type</th>
                    <th className="py-3 px-4">Dates</th>
                    <th className="py-3 px-4">Days</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {pendingRequests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{req.user_name}</div>
                        <div className="text-[10px] text-slate-400">{req.department || 'General'}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{req.leave_type}</td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {req.start_date} to {req.end_date}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">{req.days_count} Days</td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{req.reason}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleReviewRequest(req.id, 'Approved')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-[11px] transition shadow-xs flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => setCommentModal({ isOpen: true, reqId: req.id, action: 'Rejected', comment: '' })}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold text-[11px] transition shadow-xs flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                          <button
                            onClick={() => setCommentModal({ isOpen: true, reqId: req.id, action: 'Returned', comment: '' })}
                            className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-lg font-semibold text-[11px] transition flex items-center gap-1"
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> Comment
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Recently Reviewed Requests History */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">Recently Reviewed Requests</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2 px-3">Employee</th>
                    <th className="py-2 px-3">Leave Type</th>
                    <th className="py-2 px-3">Dates</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Reviewed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {leaves.filter(l => l.status !== 'Pending').slice(0, 5).map(req => (
                    <tr key={req.id} className="text-slate-600 dark:text-slate-400">
                      <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">{req.user_name}</td>
                      <td className="py-2 px-3">{req.leave_type}</td>
                      <td className="py-2 px-3 font-mono text-[11px]">{req.start_date} - {req.end_date}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          req.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[11px]">{req.reviewed_by || 'HR Admin'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: EMPLOYEE LEAVE BALANCES */}
      {activeTab === 'employees' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Employee Directory List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Select Employee Profile</h3>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search employee by name..."
                value={searchEmployeeQuery}
                onChange={e => setSearchEmployeeQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {filteredEmployees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => {
                    setSelectedUser(emp);
                    fetchUserBalance(emp.id);
                  }}
                  className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between ${
                    selectedUser?.id === emp.id
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-900 dark:text-cyan-200 font-bold'
                      : 'border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">{emp.name}</div>
                    <div className="text-[10px] text-slate-400">{emp.employee_id} • {emp.department}</div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400" />
                </button>
              ))}
            </div>
          </div>

          {/* Employee Balance Card & Override Form */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
            {selectedUser && userBalance ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{selectedUser.name}</h3>
                    <p className="text-xs text-slate-400">{selectedUser.role} • {selectedUser.department} • ID: {selectedUser.employee_id}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-bold">
                    Total Left: {userBalance.totalRemaining} Days
                  </span>
                </div>

                {/* Display Current Balances */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                    <span className="text-[11px] font-bold text-cyan-600 uppercase">Casual Leave</span>
                    <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                      {userBalance.casual} <span className="text-xs font-normal text-slate-400">Left</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Total: {userBalance.totals?.casual} | Used: {userBalance.used?.casual}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <span className="text-[11px] font-bold text-rose-600 uppercase">Sick Leave</span>
                    <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                      {userBalance.sick} <span className="text-xs font-normal text-slate-400">Left</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Total: {userBalance.totals?.sick} | Used: {userBalance.used?.sick}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-[11px] font-bold text-emerald-600 uppercase">Earned Leave</span>
                    <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                      {userBalance.earned} <span className="text-xs font-normal text-slate-400">Left</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Total: {userBalance.totals?.earned} | Used: {userBalance.used?.earned}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <span className="text-[11px] font-bold text-purple-600 uppercase">Comp Off</span>
                    <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                      {userBalance.comp_off} <span className="text-xs font-normal text-slate-400">Left</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Total: {userBalance.totals?.comp_off} | Used: {userBalance.used?.comp_off}</span>
                  </div>
                </div>

                {/* Edit Balances Form */}
                <form onSubmit={handleSaveUserOverride} className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Manually Edit Employee Leave Balances
                  </h4>
                  <p className="text-xs text-slate-400">Admin override changes will be recorded in audit logs.</p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Casual Leave</label>
                      <input
                        type="number"
                        min="0"
                        value={overrideForm.casual}
                        onChange={e => setOverrideForm({ ...overrideForm, casual: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Sick Leave</label>
                      <input
                        type="number"
                        min="0"
                        value={overrideForm.sick}
                        onChange={e => setOverrideForm({ ...overrideForm, sick: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Earned Leave</label>
                      <input
                        type="number"
                        min="0"
                        value={overrideForm.earned}
                        onChange={e => setOverrideForm({ ...overrideForm, earned: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Comp Off</label>
                      <input
                        type="number"
                        min="0"
                        value={overrideForm.comp_off}
                        onChange={e => setOverrideForm({ ...overrideForm, comp_off: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" /> Save Balance Changes
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">Select an employee from the left panel to view and edit balances.</div>
            )}
          </div>

        </div>
      )}

      {/* TAB 3: LEAVE POLICY & RULES */}
      {activeTab === 'policy' && (
        <form onSubmit={handleSavePolicy} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Yearly Leave Policy & Allocation</h3>
            <p className="text-xs text-slate-400 mt-0.5">Define standard yearly leave allocations for all employees across the organization.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Policy Year</label>
              <input
                type="number"
                required
                value={policy.year || 2026}
                onChange={e => setPolicy({ ...policy, year: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Casual Leave (CL)</label>
              <input
                type="number"
                required
                value={policy.casual_leave}
                onChange={e => setPolicy({ ...policy, casual_leave: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Sick Leave (SL)</label>
              <input
                type="number"
                required
                value={policy.sick_leave}
                onChange={e => setPolicy({ ...policy, sick_leave: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Earned Leave (EL)</label>
              <input
                type="number"
                required
                value={policy.earned_leave}
                onChange={e => setPolicy({ ...policy, earned_leave: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Comp Off Enabled</label>
              <select
                value={policy.comp_off_enabled ? 'yes' : 'no'}
                onChange={e => setPolicy({ ...policy, comp_off_enabled: e.target.value === 'yes' })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-semibold"
              >
                <option value="yes">Enabled</option>
                <option value="no">Disabled</option>
              </select>
            </div>
          </div>

          {/* Rules Section */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Leave Balance Rules</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Carry Forward Rules</label>
                <input
                  type="text"
                  value={policy.carry_forward_rules}
                  onChange={e => setPolicy({ ...policy, carry_forward_rules: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Max Leave Per Application</label>
                <input
                  type="number"
                  value={policy.max_leave_per_request}
                  onChange={e => setPolicy({ ...policy, max_leave_per_request: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Negative Leave Allowed?</label>
                <select
                  value={policy.negative_leave_allowed ? 'yes' : 'no'}
                  onChange={e => setPolicy({ ...policy, negative_leave_allowed: e.target.value === 'yes' })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-semibold"
                >
                  <option value="no">No (Reject if balance insufficient)</option>
                  <option value="yes">Yes (Allow negative balance)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Monthly Accrual Mode</label>
                <select
                  value={policy.monthly_accrual ? 'yes' : 'no'}
                  onChange={e => setPolicy({ ...policy, monthly_accrual: e.target.value === 'yes' })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-semibold"
                >
                  <option value="no">Annual Upfront Allocation</option>
                  <option value="yes">Pro-rated Monthly Accrual</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Leave Policy
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: HOLIDAY MANAGEMENT */}
      {activeTab === 'holidays' && (
        <div className="space-y-6">
          
          {/* Add Holiday Form */}
          <form onSubmit={handleAddHoliday} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Add New Holiday</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Holiday Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwali Festival"
                  value={newHoliday.title}
                  onChange={e => setNewHoliday({ ...newHoliday, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={newHoliday.date}
                  onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Holiday Category</label>
                <select
                  value={newHoliday.type}
                  onChange={e => setNewHoliday({ ...newHoliday, type: e.target.value, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-semibold"
                >
                  <option value="Government Holiday">Government Holiday</option>
                  <option value="Company Holiday">Company Holiday</option>
                  <option value="Festival Holiday">Festival Holiday</option>
                  <option value="Optional Holiday">Optional Holiday</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Holiday
                </button>
              </div>
            </div>
          </form>

          {/* Holiday List Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Official Holidays List ({policy.year || 2026})</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 font-semibold">
                    <th className="py-3 px-4">Holiday Title</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {holidays.map(h => (
                    <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        🎉 {h.title}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">{h.date}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          {h.type || h.category || 'Company Holiday'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteHoliday(h.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition"
                          title="Delete Holiday"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 5: ASSIGN PERSONAL LEAVE */}
      {activeTab === 'assign' && (
        <form onSubmit={handleDirectAssign} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Direct Personal Leave Assignment</h3>
            <p className="text-xs text-slate-400 mt-0.5">Assign leave directly on behalf of an employee. This immediately approves the leave and reduces their balance.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Select Employee *</label>
              <select
                required
                value={assignForm.userId}
                onChange={e => setAssignForm({ ...assignForm, userId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-medium"
              >
                <option value="">-- Choose Employee --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.employee_id} • {u.department})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Leave Type *</label>
              <select
                value={assignForm.leaveType}
                onChange={e => setAssignForm({ ...assignForm, leaveType: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-medium"
              >
                <option value="Casual Leave">Casual Leave</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Earned Leave">Earned Leave</option>
                <option value="Compensatory Off">Compensatory Off</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={assignForm.startDate}
                onChange={e => setAssignForm({ ...assignForm, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">End Date *</label>
              <input
                type="date"
                required
                value={assignForm.endDate}
                onChange={e => setAssignForm({ ...assignForm, endDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Reason / HR Note</label>
            <input
              type="text"
              placeholder="e.g. Approved leave assigned via HR request"
              value={assignForm.reason}
              onChange={e => setAssignForm({ ...assignForm, reason: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Assign Leave Immediately
            </button>
          </div>
        </form>
      )}

      {/* COMMENT MODAL FOR REJECT / RETURN */}
      {commentModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {commentModal.action} Leave Request
            </h4>
            <p className="text-xs text-slate-400">Add feedback note or reason for returning/rejecting this application.</p>
            
            <textarea
              rows={3}
              placeholder="Enter review comment..."
              value={commentModal.comment}
              onChange={e => setCommentModal({ ...commentModal, comment: e.target.value })}
              className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-cyan-500"
            />

            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setCommentModal({ isOpen: false, reqId: null, action: null, comment: '' })}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleReviewRequest(commentModal.reqId, commentModal.action, commentModal.comment);
                  setCommentModal({ isOpen: false, reqId: null, action: null, comment: '' });
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold"
              >
                Confirm {commentModal.action}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
